$workspaceRoot = Split-Path -Parent $PSScriptRoot
$credentialsPath = Join-Path $workspaceRoot "mks-certificate-app-cbf64-firebase-adminsdk-fbsvc-09ad142660.json"
$distEntry = Join-Path $workspaceRoot "artifacts/api-server/dist/index.mjs"
$logDir = Join-Path $workspaceRoot "outputs"

if (-not (Test-Path $credentialsPath)) {
  throw "Missing Google Drive service account file: $credentialsPath"
}

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$env:GOOGLE_APPLICATION_CREDENTIALS = $credentialsPath
$env:PORT = "8080"

node $distEntry 1>> (Join-Path $logDir "api-server.out.log") 2>> (Join-Path $logDir "api-server.err.log")
