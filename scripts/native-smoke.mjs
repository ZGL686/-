import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = process.cwd();
const dataDir = path.join(root, '.local', `native-smoke-${Date.now()}`);
await fs.mkdir(dataDir, { recursive: true });
const exe = path.resolve(process.argv[2] || 'src-tauri/target/release/guilu.exe');
let child;
async function launch() {
  child = spawn(exe, [], {
    env: {
      ...process.env,
      GUILU_DATA_DIR: dataDir,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: '--remote-debugging-port=9333',
    },
    windowsHide: true,
    stdio: 'ignore',
  });
  let browser;
  for (let i = 0; i < 60; i++) {
    try {
      browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  assert(browser, 'Native WebView did not become available');
  const context = browser.contexts()[0];
  let page = context.pages()[0];
  if (!page) page = await context.waitForEvent('page');
  await page.getByRole('heading', { name: '课程表', exact: true }).waitFor({ timeout: 20000 });
  const location = await page.evaluate(() => window.__TAURI_INTERNALS__.invoke('data_location'));
  assert(location.startsWith(dataDir), 'Refusing test against non-isolated user data');
  return { browser, page };
}
try {
  let { browser, page } = await launch();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const initial = await page.evaluate(() => window.__TAURI_INTERNALS__.invoke('load_data'));
  const data = JSON.parse(initial.payload);
  assert.equal(data.workspaces[0].students.length, 64);
  const student = data.workspaces[0].students[0];
  await page.getByRole('navigation').getByRole('button', { name: '考勤工作台' }).click();
  await page.getByLabel('登记课程', { exact: true }).selectOption('');
  await page.getByLabel('临时课程名称', { exact: true }).fill('桌面独立验收课程');
  await page.getByRole('button', { name: `${student.name}迟到加一` }).click();
  await page.getByRole('status').filter({ hasText: '已登记 1 条迟到' }).waitFor();
  await page.reload();
  await page.getByRole('heading', { name: '课程表', exact: true }).waitFor();
  let stored = await page.evaluate(() => window.__TAURI_INTERNALS__.invoke('load_data'));
  assert.equal(JSON.parse(stored.payload).workspaces[0].records.length, 1);
  await page.getByRole('navigation').getByRole('button', { name: '数据与备份' }).click();
  const backupPath = path.join(dataDir, 'native-backup.json');
  const dialogSaved = new Promise((resolve, reject) => {
    const driver = spawn(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        path.join(root, 'scripts', 'save-dialog.ps1'),
        '-AppProcessId',
        String(child.pid),
        '-OutputFile',
        backupPath,
      ],
      { windowsHide: true },
    );
    let output = '';
    driver.stdout.on('data', (b) => (output += b));
    driver.stderr.on('data', (b) => (output += b));
    driver.on('exit', (code) => (code === 0 ? resolve(output) : reject(new Error(output))));
  });
  void dialogSaved.catch(() => {});
  await page.getByRole('button', { name: '导出备份', exact: true }).click();
  await page.waitForTimeout(1000);
  console.log('Native export status:', await page.getByRole('status').allTextContents());
  await dialogSaved;
  await page.getByRole('status').filter({ hasText: '完整备份已导出' }).waitFor();
  assert.equal(
    JSON.parse(await fs.readFile(backupPath, 'utf8')).data.workspaces[0].records.length,
    1,
  );
  await page.getByRole('navigation').getByRole('button', { name: '课程表', exact: true }).click();
  await page.screenshot({ path: path.join(dataDir, 'desktop.png') });
  await browser.close();
  child.kill();
  await new Promise((r) => setTimeout(r, 1200));
  ({ browser, page } = await launch());
  stored = await page.evaluate(() => window.__TAURI_INTERNALS__.invoke('load_data'));
  assert.equal(stored.revision, 2);
  assert.equal(JSON.parse(stored.payload).workspaces[0].records[0].courseName, '桌面独立验收课程');
  const snapshots = await page.evaluate(() => window.__TAURI_INTERNALS__.invoke('list_snapshots'));
  assert.equal(snapshots.length, 2);
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      passed: true,
      roster: 64,
      persistentRecords: 1,
      revisions: snapshots.length,
      dataDir,
      exe,
    }),
  );
  await browser.close();
} finally {
  child?.kill();
}
