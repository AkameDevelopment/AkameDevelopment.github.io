Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[Windows.Forms.Application]::EnableVisualStyles()
. (Join-Path $PSScriptRoot 'console.ps1')
$form=New-Object Windows.Forms.Form
$form.Text='AkameSMP - Server Dashboard';$form.Size=New-Object Drawing.Size(980,750);$form.MinimumSize=New-Object Drawing.Size(940,720);$form.StartPosition='CenterScreen';$form.BackColor=[Drawing.Color]::FromArgb(13,11,19);$form.ForeColor=[Drawing.Color]::FromArgb(244,239,251);$form.Font=New-Object Drawing.Font('Segoe UI',10)
$title=New-Object Windows.Forms.Label;$title.Text='AkameSMP. Deine Server.';$title.Font=New-Object Drawing.Font('Segoe UI',22,[Drawing.FontStyle]::Bold);$title.AutoSize=$true;$title.Location=New-Object Drawing.Point(24,22);$form.Controls.Add($title)
$note=New-Object Windows.Forms.Label;$note.Text='Agenten starten automatisch mit Windows. Dieses Fenster kann geschlossen werden.';$note.AutoSize=$true;$note.ForeColor=[Drawing.Color]::FromArgb(167,157,183);$note.Location=New-Object Drawing.Point(28,78);$form.Controls.Add($note)
$diagnose=New-Object Windows.Forms.Button;$diagnose.Text='Diagnose';$diagnose.Location=New-Object Drawing.Point(760,30);$diagnose.Size=New-Object Drawing.Size(120,32);$diagnose.FlatStyle='Flat';$diagnose.Anchor='Top,Right';$form.Controls.Add($diagnose)
$diagnose.Add_Click({
 $lines=@()
 foreach($n in @(1,2)){try{$task=Get-ScheduledTask -TaskName ("AkameSMP-Agent-"+$n) -ErrorAction Stop;$info=$task | Get-ScheduledTaskInfo;$lines+=("Server {0}: Aufgabe {1}; Ergebnis {2}; letzter Start {3}" -f $n,$task.State,$info.LastTaskResult,$info.LastRunTime)}catch{$lines+=("Server {0}: Aufgabe nicht lesbar oder nicht eingerichtet." -f $n)}
 try{$status=Get-Content -LiteralPath (Join-Path $PSScriptRoot ("status-server"+$n+".json")) -Raw -Encoding UTF8 -ErrorAction Stop | ConvertFrom-Json;$lines+=$status.detail}catch{$lines+='Noch keine Statusdatei. Bitte Installer erneut ausfuehren.'}}
 [Windows.Forms.MessageBox]::Show(($lines -join [Environment]::NewLine),'Agent-Diagnose') | Out-Null
})
$grid=New-Object Windows.Forms.TableLayoutPanel;$grid.Location=New-Object Drawing.Point(24,120);$grid.Size=New-Object Drawing.Size(915,550);$grid.Anchor='Top,Bottom,Left,Right';$grid.ColumnCount=2;$grid.RowCount=1
$grid.ColumnStyles.Add((New-Object Windows.Forms.ColumnStyle([Windows.Forms.SizeType]::Percent,50))) | Out-Null
$grid.ColumnStyles.Add((New-Object Windows.Forms.ColumnStyle([Windows.Forms.SizeType]::Percent,50))) | Out-Null
$form.Controls.Add($grid);$rows=@()
foreach($number in @(1,2)){
 $panel=New-Object Windows.Forms.Panel;$panel.Dock='Fill';$panel.Margin=New-Object Windows.Forms.Padding(6);$panel.BackColor=[Drawing.Color]::FromArgb(27,23,38)
 $name=New-Object Windows.Forms.Label;$name.Text="AkameSMP Server $number";$name.AutoSize=$true;$name.Font=New-Object Drawing.Font('Segoe UI',15,[Drawing.FontStyle]::Bold);$name.Location=New-Object Drawing.Point(18,18);$panel.Controls.Add($name)
 $status=New-Object Windows.Forms.Label;$status.Text='Agent wird geprueft ...';$status.AutoSize=$false;$status.Size=New-Object Drawing.Size(340,30);$status.Location=New-Object Drawing.Point(20,65);$panel.Controls.Add($status)
 $serverState=New-Object Windows.Forms.Label;$serverState.Text='Server: Status unbekannt';$serverState.Size=New-Object Drawing.Size(350,36);$serverState.Location=New-Object Drawing.Point(20,100);$serverState.Font=New-Object Drawing.Font('Segoe UI',13,[Drawing.FontStyle]::Bold);$serverState.ForeColor=[Drawing.Color]::FromArgb(180,168,199);$panel.Controls.Add($serverState)
 $detail=New-Object Windows.Forms.Label;$detail.Size=New-Object Drawing.Size(350,50);$detail.Location=New-Object Drawing.Point(20,145);$detail.ForeColor=[Drawing.Color]::FromArgb(180,168,199);$panel.Controls.Add($detail)
 $last=New-Object Windows.Forms.Label;$last.AutoSize=$true;$last.Location=New-Object Drawing.Point(20,202);$last.Font=New-Object Drawing.Font('Segoe UI',9);$panel.Controls.Add($last)
 $open=New-Object Windows.Forms.Button;$open.Text='Administration oeffnen';$open.Size=New-Object Drawing.Size(180,37);$open.Location=New-Object Drawing.Point(18,450);$open.FlatStyle='Flat';$open.BackColor=[Drawing.Color]::FromArgb(87,51,130);$open.ForeColor=[Drawing.Color]::White;$open.Tag=$number
 $open.Add_Click({param($sender,$eventArgs) Start-Process ('https://akamedevelopment.github.io/akamesmp/server/'+$sender.Tag+'/administration/')});$panel.Controls.Add($open)
 $console=New-Object Windows.Forms.Button;$console.Text='Konsole oeffnen';$console.Size=New-Object Drawing.Size(180,37);$console.Location=New-Object Drawing.Point(212,450);$console.FlatStyle='Flat';$console.BackColor=[Drawing.Color]::FromArgb(50,37,70);$console.ForeColor=[Drawing.Color]::White;$console.Tag=$number;$console.Add_Click({param($sender,$eventArgs) Open-ServerConsole ([int]$sender.Tag)});$panel.Controls.Add($console)
 $maxLabel=New-Object Windows.Forms.Label;$maxLabel.Text='Maximaler RAM (GiB)';$maxLabel.AutoSize=$true;$maxLabel.Location=New-Object Drawing.Point(20,252);$panel.Controls.Add($maxLabel)
 $maxBox=New-Object Windows.Forms.NumericUpDown;$maxBox.Location=New-Object Drawing.Point(220,249);$maxBox.Size=New-Object Drawing.Size(110,28);$maxBox.Minimum=1;$maxBox.Maximum=1024;$maxBox.DecimalPlaces=1;$maxBox.Increment=0.5;$maxBox.Value=4;$panel.Controls.Add($maxBox)
 $minLabel=New-Object Windows.Forms.Label;$minLabel.Text='Start-RAM (GiB)';$minLabel.AutoSize=$true;$minLabel.Location=New-Object Drawing.Point(20,292);$panel.Controls.Add($minLabel)
 $minBox=New-Object Windows.Forms.NumericUpDown;$minBox.Location=New-Object Drawing.Point(220,289);$minBox.Size=New-Object Drawing.Size(110,28);$minBox.Minimum=0.5;$minBox.Maximum=1024;$minBox.DecimalPlaces=1;$minBox.Increment=0.5;$minBox.Value=1;$panel.Controls.Add($minBox)
 $save=New-Object Windows.Forms.Button;$save.Text='RAM speichern';$save.Size=New-Object Drawing.Size(160,32);$save.Location=New-Object Drawing.Point(18,332);$save.FlatStyle='Flat';$save.Tag=$number;$panel.Controls.Add($save)
 $memoryNote=New-Object Windows.Forms.Label;$memoryNote.Text='Gilt beim naechsten Start / Neustart.';$memoryNote.Size=New-Object Drawing.Size(350,42);$memoryNote.Location=New-Object Drawing.Point(20,372);$memoryNote.ForeColor=[Drawing.Color]::FromArgb(180,168,199);$panel.Controls.Add($memoryNote)
 try{$installed=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'agent-config.json') -Raw -Encoding UTF8 | ConvertFrom-Json;$memory=@($installed.servers | Where-Object {[int]$_.id -eq $number})[0];$maxBox.Value=[decimal]$memory.memoryMaxMiB/1024;$minBox.Value=[decimal]$memory.memoryMinMiB/1024}catch{$save.Enabled=$false;$maxBox.Enabled=$false;$minBox.Enabled=$false}
 $save.Add_Click({param($sender,$eventArgs)
  $target=@($rows | Where-Object {$_.number -eq [int]$sender.Tag})[0]
  try{
   $path=Join-Path $PSScriptRoot 'agent-config.json';$latest=Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json
   $entry=@($latest.servers | Where-Object {[int]$_.id -eq [int]$sender.Tag})[0]
   $low=[int]($target.min.Value*1024);$high=[int]($target.max.Value*1024)
   if($low -gt $high){throw 'Start-RAM darf nicht groesser als maximaler RAM sein.'}
   $entry.memoryMinMiB=$low;$entry.memoryMaxMiB=$high
   $physical=[int]([Math]::Floor((Get-CimInstance Win32_OperatingSystem).TotalVisibleMemorySize/1024))
   if(($latest.servers | Measure-Object -Property memoryMaxMiB -Sum).Sum -gt ($physical-2048)){throw 'Die Summe beider Server muss mindestens 2 GiB fuer Windows frei lassen.'}
   $temporary=$path+'.'+[guid]::NewGuid().ToString()+'.tmp'
   [IO.File]::WriteAllText($temporary,($latest | ConvertTo-Json -Depth 6),(New-Object Text.UTF8Encoding($false)))
   Move-Item -LiteralPath $temporary -Destination $path -Force
   $target.memoryNote.Text='Gespeichert. Gilt beim naechsten Start / Neustart.'
  }catch{[Windows.Forms.MessageBox]::Show($_.Exception.Message,'RAM konnte nicht gespeichert werden',[Windows.Forms.MessageBoxButtons]::OK,[Windows.Forms.MessageBoxIcon]::Warning) | Out-Null}
 })
 $grid.Controls.Add($panel,($number-1),0);$rows+=@{number=$number;status=$status;serverState=$serverState;detail=$detail;last=$last;min=$minBox;max=$maxBox;memoryNote=$memoryNote}
}
$timer=New-Object Windows.Forms.Timer;$timer.Interval=2000
$refresh={foreach($row in $rows){try{
 $path=Join-Path $PSScriptRoot ("status-server"+$row.number+".json")
 $data=Get-Content -LiteralPath $path -Raw -Encoding UTF8 -ErrorAction Stop | ConvertFrom-Json
 $fresh=([DateTimeOffset]::UtcNow-[DateTimeOffset]::Parse($data.updatedAt)).TotalSeconds -lt 30
 $online=$data.connected -and $fresh
 $labels=@{running='Minecraft laeuft';stopped='Minecraft gestoppt';starting='Minecraft startet';stopping='Minecraft stoppt';error='Verbindung pruefen'}
 if($fresh){$row.serverState.Text='Server: '+$labels[[string]$data.state];if($data.state -eq 'running'){$row.serverState.ForeColor=[Drawing.Color]::FromArgb(103,205,156)}elseif($data.state -in @('starting','stopping')){$row.serverState.ForeColor=[Drawing.Color]::FromArgb(222,186,112)}else{$row.serverState.ForeColor=[Drawing.Color]::FromArgb(180,168,199)}}else{$row.serverState.Text='Server: Status unbekannt';$row.serverState.ForeColor=[Drawing.Color]::FromArgb(180,168,199)}
 if($online){$row.status.Text='Agent mit Website verbunden';$row.status.ForeColor=[Drawing.Color]::FromArgb(103,205,156)}else{$row.status.Text='Agent nicht verbunden';$row.status.ForeColor=[Drawing.Color]::FromArgb(214,154,169)}
 $row.detail.Text=[string]$data.detail;$row.last.Text='Letzte Pruefung: '+([DateTimeOffset]::Parse($data.updatedAt).ToLocalTime().ToString('HH:mm:ss'))
 }catch{$row.serverState.Text='Server: Status unbekannt';$row.serverState.ForeColor=[Drawing.Color]::FromArgb(180,168,199);if(Test-Path -LiteralPath (Join-Path $PSScriptRoot 'agent-config.json')){$row.status.Text='Noch keine Agent-Meldung';$row.detail.Text='Oben Diagnose oeffnen, um den Aufgabenstatus zu pruefen.'}else{$row.status.Text='Agent noch nicht eingerichtet';$row.detail.Text='Installieren.cmd als Administrator ausfuehren.'};$row.last.Text=''}}}
$timer.Add_Tick($refresh);$form.Add_Shown({& $refresh;$timer.Start()});$form.Add_FormClosed({$timer.Stop();$timer.Dispose()});[void]$form.ShowDialog()
