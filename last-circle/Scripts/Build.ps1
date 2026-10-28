[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$EngineRoot,
    [ValidateSet("Editor", "Package")][string]$Mode = "Editor",
    [ValidateSet("LAN", "EOS")][string]$Network = "LAN",
    [ValidateSet("Development", "Shipping")][string]$Configuration = "Development",
    [string]$InnoSetupCompiler = ""
)
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Project = Join-Path $ProjectRoot "LastCircle.uproject"
$BuildTool = Join-Path $EngineRoot "Engine\Build\BatchFiles\Build.bat"
$Editor = Join-Path $EngineRoot "Engine\Binaries\Win64\UnrealEditor-Cmd.exe"
$UAT = Join-Path $EngineRoot "Engine\Build\BatchFiles\RunUAT.bat"
foreach ($Required in @($BuildTool, $Editor, $UAT)) {
    if (!(Test-Path $Required)) { throw "Missing Unreal Engine tool: $Required. Install UE 5.6 with Windows support." }
}
$EngineVersion = Get-Content (Join-Path $EngineRoot "Engine\Build\Build.version") -Raw | ConvertFrom-Json
if ($EngineVersion.MajorVersion -ne 5 -or $EngineVersion.MinorVersion -ne 6) { throw "This project targets Unreal Engine 5.6. Use a UE_5.6 installation." }
$Ini = Get-Content (Join-Path $PSScriptRoot "Templates\DefaultEngine.ini") -Raw
if ($Network -eq "EOS") {
    $LocalEOS = Join-Path $ProjectRoot "Config\EOS.local.ini"
    if (!(Test-Path $LocalEOS)) { throw "Copy Config/EOS.example.ini to Config/EOS.local.ini and configure your EOS deployment." }
    $EOS = Get-Content $LocalEOS -Raw
    if ($EOS -match '="REPLACE_') { throw "EOS configuration still contains placeholders." }
    $Ini += "`r`n" + $EOS
}
# Generated config is ignored: do not commit embedded EOS client configuration.
[IO.File]::WriteAllText((Join-Path $ProjectRoot "Config\DefaultEngine.ini"), $Ini, [Text.UTF8Encoding]::new($false))
& $BuildTool LastCircleEditor Win64 Development $Project -WaitMutex -NoHotReloadFromIDE
if ($LASTEXITCODE -ne 0) { throw "Editor build failed ($LASTEXITCODE)." }
$GenerateScript = Join-Path $PSScriptRoot "GenerateContent.py"
& $Editor $Project -run=pythonscript "-script=$GenerateScript" -unattended -nop4 -nosplash -NullRHI -stdout -FullStdOutLogOutput
if ($LASTEXITCODE -ne 0) { throw "Content generation failed ($LASTEXITCODE)." }
$LogFile = Join-Path $ProjectRoot "Saved\Logs\LastCircle.log"
if (!(Test-Path $LogFile) -or !(Select-String -Path $LogFile -Pattern "LAST_CIRCLE_CONTENT_OK" -Quiet)) { throw "Content generation did not report success. Inspect Saved/Logs/LastCircle.log." }
foreach ($Map in @("FrontEnd", "Arena")) {
    if (!(Test-Path (Join-Path $ProjectRoot "Content\Maps\$Map.umap"))) { throw "Generated map missing: $Map" }
}
if ($Mode -eq "Package") {
    $Output = Join-Path $ProjectRoot "Builds\Windows"
    & $UAT BuildCookRun "-project=$Project" -noP4 -utf8output -platform=Win64 "-clientconfig=$Configuration" -build -cook -stage -pak -archive "-archivedirectory=$Output" -prereqs
    if ($LASTEXITCODE -ne 0) { throw "Packaging failed ($LASTEXITCODE)." }
    $GameRoot = Join-Path $Output "Windows"
    if (!(Test-Path (Join-Path $GameRoot "LastCircle.exe"))) { throw "Packaged executable not found under $GameRoot" }
    if ($InnoSetupCompiler) {
        & $InnoSetupCompiler "/DBuildDir=$GameRoot" "/DOutputDir=$Output" (Join-Path $PSScriptRoot "Installer.iss")
        if ($LASTEXITCODE -ne 0) { throw "Installer creation failed ($LASTEXITCODE)." }
    }
    Write-Host "Windows package: $GameRoot"
} else {
    Write-Host "Ready. Open $Project with Unreal Engine 5.6."
}
