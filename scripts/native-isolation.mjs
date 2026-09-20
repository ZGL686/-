import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import assert from 'node:assert/strict';

const run = promisify(execFile);

// Tauri's JSON dataDirectory accepts relative paths only. Use the WebView2
// process override so both SQLite and browser preferences stay in the fixture.
export function isolatedEnvironment(dataDir) {
  return {
    ...process.env,
    GUILU_DATA_DIR: dataDir,
    WEBVIEW2_USER_DATA_FOLDER: path.join(dataDir, 'webview'),
  };
}

export async function verifyNativeIsolation(pid, dataDir) {
  assert(Number.isSafeInteger(pid) && pid > 0);
  const { stdout } = await run(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      `Get-CimInstance Win32_Process -Filter "ParentProcessId = ${pid} AND Name = 'msedgewebview2.exe'" | Select-Object -ExpandProperty CommandLine`,
    ],
    { windowsHide: true },
  );
  const match = stdout.match(/--user-data-dir=(?:"([^"]+)"|(\S+))/);
  assert(match, 'Test WebView process was not found');
  const actual = path.resolve(match[1] || match[2]).toLowerCase();
  const expected = path.join(dataDir, 'webview').toLowerCase();
  assert(
    actual === expected || actual.startsWith(expected + path.sep),
    'Refusing test against a shared WebView profile',
  );
  return stdout;
}
