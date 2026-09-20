param([int]$AppProcessId, [string]$OutputFile)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class GuiLuDialog {
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr SendMessage(IntPtr hWnd, uint msg, IntPtr wParam, string lParam);
  [DllImport("user32.dll")] public static extern IntPtr GetDlgItem(IntPtr hWnd, int id);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);
}
"@
$condition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ProcessIdProperty, $AppProcessId)
$deadline = (Get-Date).AddSeconds(20)
while ((Get-Date) -lt $deadline) {
  $windows = [System.Windows.Automation.AutomationElement]::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children, $condition)
  foreach ($window in $windows) {
    $hostCondition=New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::AutomationIdProperty,'FileNameControlHost')
    $fileHost=$window.FindFirst([System.Windows.Automation.TreeScope]::Descendants,$hostCondition)
    if($null -eq $fileHost){continue}
    $idCondition=New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::AutomationIdProperty,'1001')
    $edit=$fileHost.FindFirst([System.Windows.Automation.TreeScope]::Descendants,$idCondition)
    if($null -eq $edit -or $edit.Current.NativeWindowHandle -eq 0){continue}
    [GuiLuDialog]::SendMessage([IntPtr]$edit.Current.NativeWindowHandle,0x000C,[IntPtr]::Zero,$OutputFile) | Out-Null
    $dialogCondition=New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ClassNameProperty,'#32770')
    $dialog=$window.FindFirst([System.Windows.Automation.TreeScope]::Descendants,$dialogCondition)
    if($null -eq $dialog){throw 'Native dialog parent not found'}
    $saveButton=[GuiLuDialog]::GetDlgItem([IntPtr]$dialog.Current.NativeWindowHandle,1)
    if($saveButton -eq [IntPtr]::Zero){throw 'Save button not found'}
    [GuiLuDialog]::PostMessage($saveButton,0x00F5,[IntPtr]::Zero,[IntPtr]::Zero) | Out-Null
    Write-Output 'Saved through native Windows dialog'
    exit 0
  }
  Start-Sleep -Milliseconds 200
}
throw 'Native save dialog not found'
