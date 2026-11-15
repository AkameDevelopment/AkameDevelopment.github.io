#Requires -RunAsAdministrator
$ErrorActionPreference='Stop'
Set-Location -LiteralPath $PSScriptRoot
$setup=Join-Path $PSScriptRoot 'agent-setup.json'
if(-not (Test-Path -LiteralPath $setup)){throw 'agent-setup.json fehlt. In der Administration Agent-Konfiguration herunterladen und in diesen Ordner legen.'}
$config=Get-Content -LiteralPath $setup -Raw -Encoding UTF8 | ConvertFrom-Json
$java=Get-Command java.exe -ErrorAction SilentlyContinue
$javaPath='';if($java){$javaPath=$java.Source}
$config | Add-Member -NotePropertyName javaPath -NotePropertyValue $javaPath -Force
$config | Add-Member -NotePropertyName javaHome -NotePropertyValue ([string]$env:JAVA_HOME) -Force
if($config.endpoint -ne 'https://wycdpuzlbivtfxwtarzn.supabase.co/functions/v1/smp-server-agent'){throw 'Ungueltiger Endpunkt in der Konfiguration.'}
if(@($config.servers).Count -ne 2 -or @($config.servers | ForEach-Object {$_.id} | Sort-Object -Unique).Count -ne 2){throw 'Es werden getrennte Konfigurationen fuer Server 1 und 2 benoetigt.'}
function Read-Property([string[]]$Lines,[string]$Name,[string]$Default){$found=@($Lines | Where-Object {$_ -match ('^\s*'+[regex]::Escape($Name)+'\s*=')});if($found.Count){return ($found[-1] -split '=',2)[1].Trim()};return $Default}
# Validate everything before changing server files or scheduled tasks.
$plans=@()
$totalMemoryMiB=[int]([Math]::Floor((Get-CimInstance Win32_OperatingSystem).TotalVisibleMemorySize/1024))
if($totalMemoryMiB -lt 4096){throw 'Zu wenig RAM fuer zwei Minecraft-Server und Windows.'}
$config | Add-Member -NotePropertyName totalMemoryMiB -NotePropertyValue $totalMemoryMiB -Force
foreach($entry in $config.servers){
 if([int]$entry.id -notin @(1,2) -or $entry.controlToken -notmatch '^[a-f0-9]{64}$' -or $entry.rconPassword -notmatch '^[a-f0-9]{64}$'){throw 'Ungueltige Serverkonfiguration.'}
 if(-not (Test-Path -LiteralPath $entry.directory -PathType Container)){throw ('Serverordner nicht gefunden: '+$entry.directory)}
 $properties=Join-Path $entry.directory 'server.properties'
 if(-not (Test-Path -LiteralPath $properties)){throw ('server.properties fehlt: '+$entry.directory)}
 $lines=[IO.File]::ReadAllLines($properties)
 $serverIp=Read-Property $lines 'server-ip' ''
 if($serverIp -notin @('','0.0.0.0','::','127.0.0.1')){throw 'server-ip ist auf eine bestimmte Netzwerkkarte gesetzt. Fuer lokale RCON-Verbindung server-ip leer lassen und erneut installieren.'}
 $port=[int](Read-Property $lines 'server-port' '25565')
 $rcon=[int]$entry.rconPort
 if($rcon -lt 1024 -or $rcon -gt 65535 -or $rcon -eq $port){throw 'Ungueltiger oder doppelter RCON-/Minecraft-Port.'}
 $files=@(Get-ChildItem -LiteralPath $entry.directory -File | Where-Object {$_.Extension -in @('.bat','.cmd')} | Sort-Object Name)
 if(-not $files.Count){throw ('Keine .bat- oder .cmd-Startdatei gefunden in '+$entry.directory)}
 if($files.Count -eq 1){$start=$files[0]}else{
  Write-Host "Startdatei fuer Server $($entry.id) waehlen:"
  for($index=0;$index -lt $files.Count;$index++){Write-Host ("[{0}] {1}" -f ($index+1),$files[$index].Name)}
  Write-Host 'Die Datei waehlen, mit der du diesen Minecraft-Server normalerweise startest.'
  $start=$null
  while($null -eq $start){
   $answer=([string](Read-Host 'Nummer oder Dateiname, z.B. 1 oder start.bat')).Trim().Trim('"').Trim("'")
   $choice=0
   if([int]::TryParse($answer.Trim('[',']'),[ref]$choice) -and $choice -ge 1 -and $choice -le $files.Count){$start=$files[$choice-1]}
   else{$matches=@($files | Where-Object {$_.Name -eq $answer -or $_.FullName -eq $answer});if($matches.Count -eq 1){$start=$matches[0]}}
   if($null -eq $start){Write-Host ("Nicht erkannt. Eine Nummer von 1 bis {0} oder einen Dateinamen aus der Liste eingeben. Mit Strg+C abbrechen." -f $files.Count) -ForegroundColor Yellow}
  }
 }
 if([IO.File]::ReadAllText($start.FullName) -match '(?im)^\s*@?start\s'){throw 'Die Startdatei nutzt start und trennt Java vom Agenten. Eine .bat mit direktem java-Aufruf ohne start waehlen.'}
 $scriptText=[IO.File]::ReadAllText($start.FullName)
 $maxMemory=4096;$minMemory=1024
 $memoryMatch=[regex]::Match($scriptText,'(?i)-Xmx(\d+)([mg])')
 if($memoryMatch.Success){$maxMemory=[int]$memoryMatch.Groups[1].Value;if($memoryMatch.Groups[2].Value -match '[gG]'){$maxMemory*=1024}}
 $memoryMatch=[regex]::Match($scriptText,'(?i)-Xms(\d+)([mg])')
 if($memoryMatch.Success){$minMemory=[int]$memoryMatch.Groups[1].Value;if($memoryMatch.Groups[2].Value -match '[gG]'){$minMemory*=1024}}
 $answer=Read-Host ("Maximaler RAM fuer Server {0} in GiB [{1}]" -f $entry.id,($maxMemory/1024))
 if($answer){$amount=[decimal]0;if(-not [decimal]::TryParse($answer.Replace(',','.'),[Globalization.NumberStyles]::Number,[Globalization.CultureInfo]::InvariantCulture,[ref]$amount) -or $amount -lt 1){throw 'Ungueltiger RAM-Wert.'};$maxMemory=[int]($amount*1024)}
 if($maxMemory -lt 1024){throw 'Mindestens 1 GiB maximalen RAM pro Server einstellen.'}
 Write-Host ("Server {0}: RAM maximal {1} MiB, Start-RAM {2} MiB. Spaeter im Dashboard aenderbar." -f $entry.id,$maxMemory,$minMemory)
 $entry | Add-Member -NotePropertyName memoryMaxMiB -NotePropertyValue $maxMemory -Force
 $entry | Add-Member -NotePropertyName memoryMinMiB -NotePropertyValue ([Math]::Max(512,[Math]::Min($minMemory,$maxMemory))) -Force
 $entry | Add-Member -NotePropertyName startFile -NotePropertyValue $start.FullName -Force
 $entry | Add-Member -NotePropertyName serverPort -NotePropertyValue $port -Force
 $plans+=@{entry=$entry;properties=$properties;lines=$lines;port=$port;rcon=$rcon}
}
if($plans[0].entry.directory -eq $plans[1].entry.directory -or $plans[0].port -eq $plans[1].port -or $plans[0].rcon -eq $plans[1].rcon -or $plans[0].rcon -eq $plans[1].port -or $plans[1].rcon -eq $plans[0].port){throw 'Serverordner und Ports muessen fuer beide Server getrennt sein.'}
if(($config.servers | Measure-Object -Property memoryMaxMiB -Sum).Sum -gt ($totalMemoryMiB-2048)){throw 'RAM-Summe aus den Startdateien laesst keine 2 GiB fuer Windows frei. Xmx in den Startdateien reduzieren und erneut installieren.'}
foreach($plan in $plans){
 $client=New-Object Net.Sockets.TcpClient
 try{if($client.ConnectAsync('127.0.0.1',$plan.port).Wait(800) -and $client.Connected){throw "Server $($plan.entry.id) laeuft noch. Beide Minecraft-Server zuerst regulaer stoppen und Installation wiederholen."}}catch [AggregateException]{}finally{$client.Dispose()}
}
Write-Host 'Es werden lokale RCON-Zugaenge und zwei Autostart-Aufgaben eingerichtet. Beide Minecraft-Server bleiben gestoppt, bis du sie auf der Website startest.'
# Block external access to the RCON listeners. The agent only connects through loopback.
if(-not (Get-Command New-NetFirewallRule -ErrorAction SilentlyContinue)){throw 'Windows-Firewall-Verwaltung fehlt; lokale RCON-Absicherung konnte nicht eingerichtet werden.'}
if(@(Get-NetFirewallProfile | Where-Object {-not $_.Enabled}).Count){throw 'Windows-Firewall muss fuer alle Profile aktiv sein, bevor RCON eingerichtet wird.'}
$ruleName='AkameSMP-Local-RCON'
Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule
New-NetFirewallRule -Name $ruleName -DisplayName 'AkameSMP RCON nur lokal' -Direction Inbound -Action Block -Protocol TCP -LocalPort @($plans[0].rcon,$plans[1].rcon) -Profile Any | Out-Null
# Protect keys before writing the local agent configuration.
$identity=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
& icacls.exe $PSScriptRoot /inheritance:r /grant:r "*$($identity):(OI)(CI)F" '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' | Out-Null
if($LASTEXITCODE -ne 0){throw 'Zugriffsrechte fuer den Agentenordner konnten nicht gesetzt werden.'}
foreach($plan in $plans){
 $backup=$plan.properties+'.akame-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.bak';Copy-Item -LiteralPath $plan.properties -Destination $backup
 $clean=@($plan.lines | Where-Object {$_ -notmatch '^\s*(enable-rcon|rcon\.port|rcon\.password|broadcast-rcon-to-ops)\s*='})
 $clean+=@('enable-rcon=true',('rcon.port='+$plan.rcon),('rcon.password='+$plan.entry.rconPassword),'broadcast-rcon-to-ops=false')
 [IO.File]::WriteAllLines($plan.properties,$clean,(New-Object Text.UTF8Encoding($false)))
 & icacls.exe $plan.properties /inheritance:r /grant:r "*$($identity):F" '*S-1-5-18:F' '*S-1-5-32-544:F' | Out-Null
 if($LASTEXITCODE -ne 0){throw 'RCON-Passwortdatei konnte nicht abgesichert werden.'}
}
$localConfig=Join-Path $PSScriptRoot 'agent-config.json'
[IO.File]::WriteAllText($localConfig,($config | ConvertTo-Json -Depth 6),(New-Object Text.UTF8Encoding($false)))
foreach($entry in $config.servers){
 $name="AkameSMP-Agent-$($entry.id)"
 $scriptPath=Join-Path $PSScriptRoot 'agent.ps1'
 $action=New-ScheduledTaskAction -Execute "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -Argument ('-NoProfile -ExecutionPolicy Bypass -File "'+$scriptPath+'" -ServerId '+$entry.id) -WorkingDirectory $PSScriptRoot
 $trigger=New-ScheduledTaskTrigger -AtStartup
 $principal=New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
 $settings=New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable -MultipleInstances IgnoreNew
 Stop-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
 Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
 Start-ScheduledTask -TaskName $name
}
Write-Host 'Fertig. Beide Agenten laufen und starten kuenftig auch ohne Windows-Anmeldung automatisch. Die Administration sollte innerhalb von 15 Sekunden Agent verbunden anzeigen.'
Write-Host 'Minecraft jetzt ueber die jeweilige Administration starten. Agent-Konfiguration und RCON-Passwoerter privat aufbewahren.'
