!macro customCheckAppRunning
  nsProcess::_FindProcess "sanshiman.exe"
  Pop $R0
  ${If} $R0 = 0
    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "sanshiman 正在运行中。$\n$\n请先关闭 sanshiman 窗口，然后单击 [确定] 按钮继续安装，或单击 [取消] 退出。" IDOK retry
    Abort
    retry:
    nsProcess::_CloseProcess "sanshiman.exe"
    Pop $R0
    Sleep 1500
    Goto done
  ${EndIf}
  done:
!macroend

!macro customUnInstallCheckAppRunning
  nsProcess::_FindProcess "sanshiman.exe"
  Pop $R0
  ${If} $R0 = 0
    nsProcess::_CloseProcess "sanshiman.exe"
    Pop $R0
    Sleep 1500
  ${EndIf}
!macroend
