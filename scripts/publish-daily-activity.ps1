param(
  [Parameter(Mandatory = $true)][string]$HealthConnect,
  [Parameter(Mandatory = $true)][string]$Samsung,
  [Parameter(Mandatory = $true)][string]$Python,
  [Parameter(Mandatory = $true)][string]$Git,
  [Parameter(Mandatory = $true)][string]$GitHubCli,
  [Parameter(Mandatory = $true)][string]$LogFile
)

$ErrorActionPreference = 'Stop'
$env:GIT_TERMINAL_PROMPT = '0'
$env:GCM_INTERACTIVE = 'Never'
$env:GH_PROMPT_DISABLED = '1'
$repo = Split-Path -Parent $PSScriptRoot
$dataset = 'Pages/Personal/Daily-Activity/daily.json'
$credentialHelper = 'credential.helper=!"' + $GitHubCli.Replace('\', '/') + '" auth git-credential'

function Invoke-Git {
  $result = & $Git -C $repo -c credential.helper= -c $credentialHelper @args
  if ($LASTEXITCODE -ne 0) { throw "Git $($args[0]) failed with exit code $LASTEXITCODE." }
  return $result
}

function Write-Log([string]$Message) {
  Add-Content -LiteralPath $LogFile -Encoding utf8 -Value "$(Get-Date -Format o) $Message"
}

try {
  if ((Invoke-Git config --local --get dailyActivity.publisher) -ne 'true') {
    throw 'Use a dedicated Daily Activity publisher checkout.'
  }
  if ((Invoke-Git remote get-url origin) -ne 'https://github.com/JustinRogo/justinrogo.github.io.git') {
    throw 'Unexpected Daily Activity publisher remote.'
  }
  if (Invoke-Git status --porcelain -- . ":(exclude)$dataset") {
    throw 'The dedicated publisher checkout contains unexpected changes.'
  }
  Invoke-Git fetch origin main | ForEach-Object { Write-Log $_ }
  Invoke-Git restore --staged --worktree -- $dataset
  Invoke-Git switch --detach FETCH_HEAD | ForEach-Object { Write-Log $_ }
  Write-Log 'Validating both local exports.'
  & $Python (Join-Path $PSScriptRoot 'import-daily-activity.py') `
    --health-connect $HealthConnect --samsung $Samsung --output (Join-Path $repo $dataset) 2>&1 |
    ForEach-Object { Write-Log ([string]$_) }
  if ($LASTEXITCODE -ne 0) { throw 'Import failed. The published dataset was retained.' }
  if (Invoke-Git status --porcelain -- $dataset) {
    Invoke-Git add -- $dataset
    Invoke-Git commit -m 'Refresh daily activity summaries' -- $dataset | ForEach-Object { Write-Log $_ }
    Invoke-Git push origin 'HEAD:refs/heads/main' | ForEach-Object { Write-Log $_ }
    Write-Log 'Pushed validated summaries to GitHub Pages.'
  } else {
    # Verify the scheduled account can still publish even on an unchanged run.
    Invoke-Git push --dry-run origin 'HEAD:refs/heads/main' | ForEach-Object { Write-Log $_ }
    Write-Log 'The published summaries are current.'
  }
  exit 0
} catch {
  Write-Log "Refresh failed. $($_.Exception.Message)"
  exit 1
}
