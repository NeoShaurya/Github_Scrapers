' ==============================================================================
' GitHub Scrapers Silent Task Scheduler Runner (VBScript)
' Runs the synchronization silently in the background without a popup console
' ==============================================================================

Set objFSO = CreateObject("Scripting.FileSystemObject")
Set objShell = CreateObject("WScript.Shell")

strScriptDir = objFSO.GetParentFolderName(WScript.ScriptFullName)
strBatchPath = objFSO.BuildPath(strScriptDir, "run-sync.cmd")

' 0 = Hide window, True = Wait for completion
intReturn = objShell.Run("cmd.exe /c """ & strBatchPath & """", 0, True)

WScript.Quit intReturn
