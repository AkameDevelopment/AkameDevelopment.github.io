param([Parameter(Mandatory=$true)][ValidateSet(1,2)][int]$ServerId)
$ErrorActionPreference='Stop'
try{
 & (Join-Path $PSScriptRoot 'agent.ps1') -ServerId $ServerId -ConfigPath (Join-Path $PSScriptRoot 'agent-config.json')
}catch{
 $message=$_.Exception.Message -replace '(?i)\b[a-f0-9]{64}\b','[REDACTED]'
 $detail='Agent-Startfehler: '+$message
 $data=@{serverId=$ServerId;connected=$false;state='error';detail=$detail;updatedAt=[DateTimeOffset]::UtcNow.ToString('o')} | ConvertTo-Json -Compress
 try{
  $file=Join-Path $PSScriptRoot ("status-server"+$ServerId+".json")
  [IO.File]::WriteAllText($file,$data,(New-Object Text.UTF8Encoding($false)))
  Add-Content -LiteralPath (Join-Path $PSScriptRoot ("startup-server"+$ServerId+".log")) -Encoding UTF8 -Value ((Get-Date -Format 's')+' '+$detail)
 }catch{ }
 exit 1
}
