; Uninstall removes everything. An upgrade keeps data\ and otherwise does what electron-builder's default does. See docs/PACKAGING.md.

; Moves data\ that an interrupted upgrade left beside the install folder back into it. Uses $R1.
!macro restoreLeftoverData
  ${if} ${FileExists} "$INSTDIR-data\*.*"
    ${if} ${FileExists} "$INSTDIR\data\*.*"
      StrCpy $R1 1
      ${while} ${FileExists} "$INSTDIR\data\interrupted-upgrade-$R1\*.*"
        IntOp $R1 $R1 + 1
      ${endwhile}
      Rename "$INSTDIR-data" "$INSTDIR\data\interrupted-upgrade-$R1"
    ${else}
      Rename "$INSTDIR-data" "$INSTDIR\data"
    ${endif}
  ${endif}
!macroend

!macro customInstall
  Push $R1
  !insertmacro restoreLeftoverData
  Pop $R1
!macroend

!macro customRemoveFiles
  ${if} ${isUpdated}
    Push $R0
    Push $R1

    ClearErrors
    !insertmacro restoreLeftoverData
    ${if} ${Errors}
      Abort `Can't move "$INSTDIR-data" back into "$INSTDIR" because a file in it is in use.`
    ${endif}

    ${if} ${FileExists} "$INSTDIR\data\*.*"
      ClearErrors
      Rename "$INSTDIR\data" "$INSTDIR-data"
      ${if} ${Errors}
        Abort `Can't keep "$INSTDIR\data" because a file in it is in use.`
      ${endif}
    ${endif}

    CreateDirectory "$PLUGINSDIR\old-install"
    Push ""
    Call un.atomicRMDir
    Pop $R0
    ${if} $R0 != 0
      DetailPrint "File is busy, aborting: $R0"
      Push ""
      Call un.restoreFiles
      Pop $R0
      Rename "$INSTDIR-data" "$INSTDIR\data"
      Abort `Can't rename "$INSTDIR" to "$PLUGINSDIR\old-install".`
    ${endif}

    SetOutPath $TEMP
    RMDir /r $INSTDIR
    CreateDirectory $INSTDIR
    Rename "$INSTDIR-data" "$INSTDIR\data"
    Pop $R1
    Pop $R0
  ${else}
    SetOutPath $TEMP
    RMDir /r $INSTDIR
  ${endif}
!macroend
