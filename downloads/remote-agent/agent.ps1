param([Parameter(Mandatory=$true)][ValidateSet(1,2)][int]$ServerId,[string]$ConfigPath=(Join-Path $PSScriptRoot 'agent-config.json'))
$ErrorActionPreference='Stop'
[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Net.Sockets;
using System.Text;
public static class AkameRcon {
 static byte[] ReadBytes(NetworkStream stream,int length){var bytes=new byte[length];int count=0;while(count<length){int n=stream.Read(bytes,count,length-count);if(n<=0)throw new IOException("RCON connection closed");count+=n;}return bytes;}
 static void Send(NetworkStream stream,int id,int type,string text){var data=Encoding.UTF8.GetBytes(text);var buffer=new byte[data.Length+14];Buffer.BlockCopy(BitConverter.GetBytes(data.Length+10),0,buffer,0,4);Buffer.BlockCopy(BitConverter.GetBytes(id),0,buffer,4,4);Buffer.BlockCopy(BitConverter.GetBytes(type),0,buffer,8,4);Buffer.BlockCopy(data,0,buffer,12,data.Length);stream.Write(buffer,0,buffer.Length);}
 static Tuple<int,int,string> Read(NetworkStream stream){int size=BitConverter.ToInt32(ReadBytes(stream,4),0);if(size<10||size>1048576)throw new IOException("Invalid RCON packet");var body=ReadBytes(stream,size);return Tuple.Create(BitConverter.ToInt32(body,0),BitConverter.ToInt32(body,4),Encoding.UTF8.GetString(body,8,size-10));}
 public static string Query(int port,string password,string command){using(var client=new TcpClient()){var connect=client.ConnectAsync("127.0.0.1",port);if(!connect.Wait(2500))throw new IOException("RCON unavailable");connect.GetAwaiter().GetResult();using(var stream=client.GetStream()){stream.ReadTimeout=4000;stream.WriteTimeout=4000;Send(stream,10,3,password);bool authenticated=false;for(int i=0;i<3;i++){var packet=Read(stream);if(packet.Item1==-1)throw new IOException("RCON authentication failed");if(packet.Item1==10&&packet.Item2==2){authenticated=true;break;}}if(!authenticated)throw new IOException("RCON authentication failed");if(string.IsNullOrEmpty(command))return "";Send(stream,11,2,command);for(int i=0;i<4;i++){var packet=Read(stream);if(packet.Item1==11)return packet.Item3;}throw new IOException("Missing RCON response");}}}
}
'@
$config=Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
$server=@($config.servers | Where-Object { [int]$_.id -eq $ServerId })
if($server.Count -ne 1){throw 'Server configuration missing or duplicated.'}
$server=$server[0]
if($config.endpoint -ne 'https://wycdpuzlbivtfxwtarzn.supabase.co/functions/v1/smp-server-agent'){throw 'Unexpected agent endpoint.'}
if(-not (Test-Path -LiteralPath $server.startFile -PathType Leaf)){throw 'Start file not found. Run Installieren.cmd again.'}
if([IO.Path]::GetExtension($server.startFile) -notin @('.bat','.cmd')){throw 'Start file must be .bat or .cmd.'}
$mutex=New-Object Threading.Mutex($false,"Global\AkameSMP-Agent-$ServerId")
$locked=$false
try{$locked=$mutex.WaitOne(0)}catch [Threading.AbandonedMutexException]{$locked=$true}
if(-not $locked){Write-Host "Agent for Server $ServerId is already running.";exit 0}
$agentId=[guid]::NewGuid().ToString()
$script:state='stopped';$script:detail='';$script:gameProcess=$null;$script:startedAt=Get-Date
$script:pending=New-Object 'System.Collections.Generic.List[string]'
$script:ackId=$null;$script:ackOk=$false;$script:ackResult=''
$script:reader=$null;$script:logStream=$null;$script:logIdentity=''
function Protect-Text([string]$Text){foreach($entry in $config.servers){foreach($value in @($entry.controlToken,$entry.rconPassword)){if($value){$Text=$Text.Replace([string]$value,'[REDACTED]')}}};return $Text}
function Add-Console([string]$Text){$safe=Protect-Text $Text;$script:pending.Add($safe.Substring(0,[Math]::Min(1000,$safe.Length)));while($script:pending.Count -gt 200){$script:pending.RemoveAt(0)}}
function Test-GamePort { $client=New-Object Net.Sockets.TcpClient;try{$task=$client.ConnectAsync('127.0.0.1',[int]$server.serverPort);return ($task.Wait(1000) -and $client.Connected)}catch{return $false}finally{$client.Dispose()}}
function Test-Rcon {try{[void][AkameRcon]::Query([int]$server.rconPort,[string]$server.rconPassword,$null);return $true}catch{return $false}}
function Read-Console {
 $path=Join-Path $server.directory 'logs\latest.log'
 if(-not (Test-Path -LiteralPath $path)){return}
 $file=Get-Item -LiteralPath $path
 if($null -eq $script:reader -or $script:logIdentity -ne $file.CreationTimeUtc.Ticks -or $file.Length -lt $script:logStream.Position){
  if($script:reader){$script:reader.Dispose()};if($script:logStream){$script:logStream.Dispose()}
  $script:logStream=[IO.File]::Open($path,[IO.FileMode]::Open,[IO.FileAccess]::Read,([IO.FileShare]::ReadWrite -bor [IO.FileShare]::Delete))
  $script:logIdentity=$file.CreationTimeUtc.Ticks
  $skip=$script:logStream.Length -gt 65536;if($skip){[void]$script:logStream.Seek(-65536,[IO.SeekOrigin]::End)}
  $script:reader=New-Object IO.StreamReader($script:logStream,[Text.Encoding]::UTF8,$true)
  if($skip){[void]$script:reader.ReadLine()}
 }
 for($lineIndex=0;$lineIndex -lt 40 -and -not $script:reader.EndOfStream;$lineIndex++){Add-Console ($script:reader.ReadLine())}
}
function Save-LocalStatus([bool]$Connected,[string]$Detail){
 $statusPath=Join-Path $PSScriptRoot ("status-server"+$ServerId+".json")
 $status=@{serverId=$ServerId;connected=$Connected;state=$script:state;detail=(Protect-Text $Detail);updatedAt=[DateTimeOffset]::UtcNow.ToString('o')} | ConvertTo-Json -Compress
 try{[IO.File]::WriteAllText($statusPath+'.tmp',$status,(New-Object Text.UTF8Encoding($false)));Move-Item -LiteralPath ($statusPath+'.tmp') -Destination $statusPath -Force}catch{Write-Host 'Dashboardstatus konnte nicht aktualisiert werden.'}
}
function Exchange {
 try{Read-Console}catch{Write-Host 'Log file temporarily unavailable.'}
 $lines=@($script:pending | Select-Object -First 20)
 $payload=@{server_id=$ServerId;agent_id=$agentId;state=$script:state;detail=$script:detail;lines=$lines}
 if($script:ackId){$payload.ack_id=$script:ackId;$payload.ack_ok=$script:ackOk;$payload.ack_result=$script:ackResult}
 $body=ConvertTo-Json -InputObject $payload -Depth 6 -Compress
 $result=Invoke-RestMethod -Method Post -Uri $config.endpoint -Headers @{Authorization=('Bearer '+$server.controlToken)} -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 15
 if(-not $result.ok -or [int]$result.server_id -ne $ServerId){throw 'Unexpected agent response.'}
 if($lines.Count -gt 0){$script:pending.RemoveRange(0,$lines.Count)}
 $script:ackId=$null
 Save-LocalStatus $true $script:detail
 return $result.command
}
function Update-State {
 if(Test-Rcon){$script:state='running';$script:detail='Minecraft erreichbar';return}
 if(Test-GamePort){$script:state='error';$script:detail='Minecraft laeuft, aber RCON ist nicht erreichbar. RCON-Konfiguration und Neustart pruefen.';return}
 if($script:gameProcess -and -not $script:gameProcess.HasExited){$script:state='starting';$script:detail='Startprozess aktiv; warte auf Minecraft.';return}
 $script:state='stopped';$script:detail='Minecraft ist gestoppt; Agent bereit.'
}
function Heartbeat-WhileWaiting {try{[void](Exchange)}catch{Write-Host 'Verbindung zur Website unterbrochen; Aktion wird lokal weiter geprueft.'};Start-Sleep -Seconds 3}
function Start-Game {
 if(Test-Rcon){return 'Server laeuft bereits.'}
 if((Test-GamePort) -or ($script:gameProcess -and -not $script:gameProcess.HasExited)){throw 'Server oder Startprozess laeuft bereits. Kein zweiter Start ausgefuehrt.'}
 $info=New-Object Diagnostics.ProcessStartInfo
 $info.FileName=$env:ComSpec;$info.Arguments='/d /c call "'+$server.startFile+'"';$info.WorkingDirectory=$server.directory;$info.UseShellExecute=$false;$info.CreateNoWindow=$true;$info.RedirectStandardInput=$true
 if($config.javaPath){$info.EnvironmentVariables['PATH']=[IO.Path]::GetDirectoryName($config.javaPath)+';'+$env:PATH}
 if($config.javaHome){$info.EnvironmentVariables['JAVA_HOME']=[string]$config.javaHome}
 $latest=Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
 $memory=@($latest.servers | Where-Object {[int]$_.id -eq $ServerId})[0]
 $physicalMiB=[int]([Math]::Floor((Get-CimInstance Win32_OperatingSystem).TotalVisibleMemorySize/1024))
 $min=[int]$memory.memoryMinMiB;$max=[int]$memory.memoryMaxMiB
 if($min -lt 512 -or $max -lt 1024 -or $min -gt $max -or ($latest.servers | Measure-Object -Property memoryMaxMiB -Sum).Sum -gt ($physicalMiB-2048)){throw 'RAM-Konfiguration ungueltig. Im Dashboard korrigieren; mindestens 2 GiB fuer Windows freilassen.'}
 $info.EnvironmentVariables['_JAVA_OPTIONS']=[string]$env:_JAVA_OPTIONS+" -Xms$($min)m -Xmx$($max)m"
 $script:gameProcess=New-Object Diagnostics.Process;$script:gameProcess.StartInfo=$info;[void]$script:gameProcess.Start()
 $script:state='starting';$script:detail='Minecraft startet.';Add-Console '[Agent] Minecraft wird gestartet.'
 $deadline=(Get-Date).AddSeconds(180)
 while((Get-Date) -lt $deadline){if(Test-Rcon){$script:state='running';return 'Minecraft erfolgreich gestartet.'};if($script:gameProcess.HasExited){throw 'Startdatei beendet, bevor Minecraft erreichbar war. Startdatei und logs/latest.log pruefen.'};Heartbeat-WhileWaiting}
 throw 'Minecraft ist nach drei Minuten noch nicht per RCON erreichbar. Vor erneutem Start den Serverzustand pruefen.'
}
function Stop-Game {
 if(-not (Test-Rcon)){if(Test-GamePort){throw 'Minecraft laeuft, aber RCON ist nicht erreichbar. Kein Prozess wurde zwangsweise beendet.'};return 'Server ist bereits gestoppt.'}
 try{$listener=Get-NetTCPConnection -State Listen -LocalPort ([int]$server.rconPort) -ErrorAction Stop | Select-Object -First 1;$stoppingProcess=[Diagnostics.Process]::GetProcessById([int]$listener.OwningProcess)}catch{throw 'Minecraft-Prozess konnte nicht sicher zugeordnet werden. Stop wurde nicht ausgefuehrt.'}
 $script:state='stopping';$script:detail='Minecraft speichert und stoppt.';Add-Console '[Agent] Sende stop; Minecraft speichert die Welt.'
 try{[void][AkameRcon]::Query([int]$server.rconPort,[string]$server.rconPassword,'stop')}catch{ }
 $deadline=(Get-Date).AddSeconds(90)
 while((Get-Date) -lt $deadline){if(-not (Test-Rcon) -and -not (Test-GamePort) -and $stoppingProcess.HasExited){
   if($script:gameProcess -and -not $script:gameProcess.HasExited){try{$script:gameProcess.StandardInput.WriteLine('')}catch{};[void]$script:gameProcess.WaitForExit(5000)}
   $script:state='stopped';return 'Minecraft sauber gestoppt.'
  };Heartbeat-WhileWaiting}
 throw 'Stop nicht innerhalb von 90 Sekunden bestaetigt. Kein Prozess wurde zwangsweise beendet.'
}
Write-Host "AkameSMP Agent Server $ServerId gestartet."
try{
 while($true){
  try{
   Update-State
   $job=Exchange
   if($job){
    $success=$false;$message=''
    try{
     switch([string]$job.kind){
      'start' {$message=Start-Game}
      'stop' {$message=Stop-Game}
      'restart' {[void](Stop-Game);Start-Sleep -Seconds 2;$message=Start-Game}
      'console' {if(-not (Test-Rcon)){throw 'Minecraft-Konsole ist nicht erreichbar.'};$text=[string]$job.command;if($text.Length -lt 1 -or $text.Length -gt 1000 -or $text -match '[\r\n]'){throw 'Ungueltiger Konsolenbefehl.'};Add-Console ('> '+$text);$message=[AkameRcon]::Query([int]$server.rconPort,[string]$server.rconPassword,$text);if($message){Add-Console $message}else{$message='Konsolenbefehl gesendet.'}}
      default {throw 'Unbekannte Aktion.'}
     }
     $success=$true
    }catch{$message=Protect-Text $_.Exception.Message;Add-Console ('[Agent] '+$message)}
    $script:ackId=[string]$job.id;$script:ackOk=$success;$script:ackResult=$message.Substring(0,[Math]::Min(4000,$message.Length))
    Update-State
    # The acknowledgement may deliver the next command; one active command per server prevents an unhandled second claim.
    [void](Exchange)
   }
  }catch{$problem='Agent-Verbindung fehlgeschlagen: '+(Protect-Text $_.Exception.Message);Write-Host $problem;Save-LocalStatus $false $problem}
  Start-Sleep -Seconds 3
 }
}finally{if($script:reader){$script:reader.Dispose()};if($script:logStream){$script:logStream.Dispose()};if($locked){$mutex.ReleaseMutex()};$mutex.Dispose()}
