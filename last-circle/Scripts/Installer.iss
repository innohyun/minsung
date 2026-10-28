#ifndef BuildDir
  #error Pass /DBuildDir=path-to-packaged-Windows-folder
#endif
#ifndef OutputDir
  #define OutputDir "."
#endif
[Setup]
AppId={{458CF518-4D1D-4FC0-A615-AF12CD3D1E70}
AppName=Last Circle
AppVersion=0.1.0
DefaultDirName={localappdata}\LastCircle
DefaultGroupName=Last Circle
PrivilegesRequired=lowest
OutputDir={#OutputDir}
OutputBaseFilename=LastCircle-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\LastCircle.exe
[Files]
Source: "{#BuildDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
[Icons]
Name: "{group}\Last Circle"; Filename: "{app}\LastCircle.exe"
Name: "{autodesktop}\Last Circle"; Filename: "{app}\LastCircle.exe"; Tasks: desktopicon
[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; Flags: unchecked
[Run]
Filename: "{app}\Engine\Extras\Redist\en-us\UEPrereqSetup_x64.exe"; Parameters: "/quiet /norestart"; StatusMsg: "Installing Unreal Engine prerequisites..."; Flags: shellexec waituntilterminated; Check: FileExists(ExpandConstant('{app}\Engine\Extras\Redist\en-us\UEPrereqSetup_x64.exe'))
Filename: "{app}\LastCircle.exe"; Description: "Launch Last Circle"; Flags: nowait postinstall skipifsilent
