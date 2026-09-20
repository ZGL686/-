$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot
$qaProfile=Join-Path $repoRoot '.local\qa-webview'
New-Item -ItemType Directory -Force -Path $qaProfile | Out-Null
$config=@{app=@{windows=@(@{label='main';title='归录 · 独立验收';width=1440;height=940;minWidth=1050;minHeight=700;center=$true;additionalBrowserArgs='--remote-debugging-port=9333';dataDirectory=$qaProfile})}}
$configPath=Join-Path $repoRoot '.local\tauri.qa.json'
[System.IO.File]::WriteAllText($configPath, ($config | ConvertTo-Json -Depth 8), (New-Object System.Text.UTF8Encoding $false))
& npm.cmd run tauri -- build --debug --no-bundle --config $configPath
if($LASTEXITCODE -ne 0){throw '桌面验收构建失败'}
& node.exe scripts/native-smoke.mjs src-tauri/target/debug/guilu.exe
if($LASTEXITCODE -ne 0){throw '桌面验收未通过'}
