import assert from 'node:assert/strict';

async function openManager(page) {
  await page.getByRole('button', { name: '切换班级', exact: true }).click();
  await page.getByRole('button', { name: '管理工作台', exact: true }).click();
  return page.getByRole('dialog', { name: '管理工作台', exact: true });
}

export async function prepareManagementRestart(page) {
  let manager = await openManager(page);
  await manager.getByRole('button', { name: '新建工作台', exact: true }).click();
  await page.getByLabel('工作台名称', { exact: true }).fill('桌面空工作台');
  await page.getByRole('button', { name: '创建工作台' }).click();
  await page.getByRole('status').filter({ hasText: '新工作台已创建' }).waitFor();
  manager = await openManager(page);
  await manager
    .getByRole('region', { name: '桌面空工作台', exact: true })
    .getByRole('button', { name: '编辑', exact: true })
    .click();
  const editor = page.getByRole('dialog', { name: '编辑工作台', exact: true });
  await editor.getByLabel('工作台名称', { exact: true }).fill('桌面已改名');
  await editor.getByRole('button', { name: '保存修改' }).click();
  await editor.waitFor({ state: 'detached' });
  await manager
    .getByRole('region', { name: '桌面验收班', exact: true })
    .getByRole('button', { name: '删除', exact: true })
    .click();
  const confirmation = page.getByRole('dialog', { name: '删除“桌面验收班”？', exact: true });
  await confirmation.getByRole('button', { name: '移入回收站' }).click();
  await confirmation.waitFor({ state: 'detached' });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '设置与偏好', exact: true }).click();
  await page.getByRole('tab', { name: '外观与交互' }).click();
  await page.getByRole('radio', { name: /深色/ }).click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  await page.waitForFunction(
    async () =>
      (await window.__TAURI_INTERNALS__.invoke('plugin:window|theme', { label: 'main' })) ===
      'dark',
  );
}

export async function verifyManagementRestart(page) {
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  let stored = JSON.parse(
    (await page.evaluate(() => window.__TAURI_INTERNALS__.invoke('load_data'))).payload,
  );
  assert.equal(stored.workspaces[1].name, '桌面已改名');
  assert(stored.workspaces[0].deletedAt);
  assert.equal(stored.activeWorkspaceId, stored.workspaces[1].id);
  let manager = await openManager(page);
  await manager.getByRole('button', { name: '回收站 · 1' }).click();
  await manager.getByRole('button', { name: '恢复', exact: true }).click();
  await manager.getByText('回收站是空的').waitFor();
  await manager.getByRole('button', { name: '使用中 · 2' }).click();
  await manager
    .getByRole('region', { name: '桌面验收班', exact: true })
    .getByRole('button', { name: '切换', exact: true })
    .click();
  await page.getByRole('navigation').getByRole('button', { name: '考勤工作台' }).click();
  await page.getByRole('button', { name: '测试甲迟到减一' }).click();
  const detail = page.getByRole('dialog', { name: '测试甲的迟到明细', exact: true });
  await detail.getByRole('button', { name: '撤销', exact: true }).click();
  await detail.getByText('暂无异常考勤记录').waitFor();
  stored = JSON.parse(
    (await page.evaluate(() => window.__TAURI_INTERNALS__.invoke('load_data'))).payload,
  );
  assert(stored.workspaces[0].records[1].voided);
  await detail.getByLabel('显示已撤销记录').check();
  await detail.getByRole('button', { name: '恢复', exact: true }).click();
  await detail.getByRole('button', { name: '撤销', exact: true }).waitFor();
  await page.keyboard.press('Escape');
  stored = JSON.parse(
    (await page.evaluate(() => window.__TAURI_INTERNALS__.invoke('load_data'))).payload,
  );
  assert.equal(stored.workspaces[0].records[1].voided, false);
}
