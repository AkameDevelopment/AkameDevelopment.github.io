# Read-only local Minecraft log viewer. Commands stay in the role-protected web console.
function Open-ServerConsole([int]$ServerNumber){
 try{
  $local=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'agent-config.json') -Raw -Encoding UTF8 -ErrorAction Stop | ConvertFrom-Json
  $entry=@($local.servers | Where-Object {[int]$_.id -eq $ServerNumber})
  if($entry.Count -ne 1){throw 'Serverkonfiguration fehlt.'}
  $tokens=@();foreach($item in $local.servers){$tokens+=@([string]$item.controlToken,[string]$item.rconPassword)}
  $viewer=New-Object Windows.Forms.Form;$viewer.Text="AkameSMP Server $ServerNumber - Konsole (nur lesen)";$viewer.Size=New-Object Drawing.Size(950,650);$viewer.MinimumSize=New-Object Drawing.Size(700,450);$viewer.StartPosition='CenterScreen';$viewer.BackColor=[Drawing.Color]::FromArgb(13,11,19);$viewer.ForeColor=[Drawing.Color]::FromArgb(244,239,251);$viewer.Font=New-Object Drawing.Font('Segoe UI',10)
  $bar=New-Object Windows.Forms.Panel;$bar.Dock='Top';$bar.Height=65;$bar.BackColor=[Drawing.Color]::FromArgb(27,23,38);$viewer.Controls.Add($bar)
  $note=New-Object Windows.Forms.Label;$note.Text="Server $ServerNumber - Live-Log, letzte 200 Zeilen";$note.AutoSize=$true;$note.Location=New-Object Drawing.Point(18,12);$bar.Controls.Add($note)
  $updated=New-Object Windows.Forms.Label;$updated.Text='Warte auf Logdatei ...';$updated.AutoSize=$true;$updated.Location=New-Object Drawing.Point(18,36);$updated.Font=New-Object Drawing.Font('Segoe UI',9);$updated.ForeColor=[Drawing.Color]::FromArgb(180,168,199);$bar.Controls.Add($updated)
  $web=New-Object Windows.Forms.Button;$web.Text='Geschuetzte Webkonsole';$web.Size=New-Object Drawing.Size(230,36);$web.Location=New-Object Drawing.Point(680,14);$web.Anchor='Top,Right';$web.FlatStyle='Flat';$web.Tag=$ServerNumber;$bar.Controls.Add($web)
  $web.Add_Click({param($sender,$eventArgs) Start-Process ('https://akamedevelopment.github.io/akamesmp/server/'+$sender.Tag+'/administration/#console-title')})
  $box=New-Object Windows.Forms.RichTextBox;$box.Dock='Fill';$box.ReadOnly=$true;$box.DetectUrls=$false;$box.WordWrap=$false;$box.BackColor=[Drawing.Color]::FromArgb(13,11,19);$box.ForeColor=[Drawing.Color]::FromArgb(225,216,237);$box.Font=New-Object Drawing.Font('Consolas',10);$box.BorderStyle='None';$box.ScrollBars='Both';$viewer.Controls.Add($box);$box.BringToFront()
  $timer=New-Object Windows.Forms.Timer;$timer.Interval=2000
  $state=[pscustomobject]@{viewer=$viewer;box=$box;updated=$updated;timer=$timer;path=(Join-Path $entry[0].directory 'logs\latest.log');tokens=$tokens}
  $refresh={
   try{
    if(-not (Test-Path -LiteralPath $state.path)){$state.updated.Text='Noch keine Logdatei vorhanden. Minecraft zuerst starten.';return}
    $lines=@(Get-Content -LiteralPath $state.path -Tail 200 -Encoding UTF8 -ErrorAction Stop)
    $text=$lines -join [Environment]::NewLine
    foreach($token in $state.tokens){if($token){$text=$text.Replace($token,'[REDACTED]')}}
    if($state.box.Text -ne $text){$position=$state.box.SelectionStart;$length=$state.box.SelectionLength;$atEnd=($position -ge $state.box.TextLength-10);$state.box.Text=$text
     if($atEnd){$state.box.SelectionStart=$state.box.TextLength;$state.box.ScrollToCaret()}else{$state.box.SelectionStart=[Math]::Min($position,$state.box.TextLength);$state.box.SelectionLength=[Math]::Min($length,$state.box.TextLength-$state.box.SelectionStart)}
    }
    $state.updated.Text='Letzter Logeintrag: '+(Get-Item -LiteralPath $state.path).LastWriteTime.ToString('HH:mm:ss')+' - nur lesen'
   }catch{$state.updated.Text='Logdatei momentan nicht lesbar. Neuer Versuch in zwei Sekunden.'}
  }.GetNewClosure()
  $timer.Add_Tick($refresh)
  $onShown={& $refresh;$state.timer.Start()}.GetNewClosure();$viewer.Add_Shown($onShown)
  $onClosed={$state.timer.Stop();$state.timer.Dispose()}.GetNewClosure();$viewer.Add_FormClosed($onClosed)
  $viewer.Show()
 }catch{[Windows.Forms.MessageBox]::Show('Konsole konnte nicht geoeffnet werden. Agent-Konfiguration und Serverordner pruefen.','AkameSMP Konsole') | Out-Null}
}
