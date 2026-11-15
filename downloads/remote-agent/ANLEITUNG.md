# AkameSMP Windows-Agent

Für die gemeinsame Windows-Maschine mit zwei getrennten Minecraft-Servern:

- Server 1: `C:\Game Server\Minecraft v26.3`
- Server 2: `C:\Game Server\Minecraft V26.3 v2`

## Einmalige Einrichtung

1. `AkameSMP-Windows-Agent.zip` nach **C:\AkameServerAgent** entpacken. Der Ordner muss dauerhaft dort bleiben.
2. Als **Owner oder Developer** eine Server-Administration öffnen. Unter **Windows-Agent mit Autostart** einmal **Agent-Konfiguration erstellen** anklicken. `agent-setup.json` in den entpackten Agentenordner legen. Diese Datei enthält private Schlüssel; nicht veröffentlichen.
3. Beide Minecraft-Server regulär stoppen und das vollständige Herunterfahren abwarten.
4. **Installieren.cmd als Administrator ausführen.** Bei mehreren Startdateien pro Server die richtige `.bat` oder `.cmd` auswählen. Sie muss Java direkt aufrufen, ohne `start` zum Abtrennen des Java-Prozesses.
5. Der Installer sichert `server.properties`, richtet getrennte lokale RCON-Zugänge ein und blockiert externe RCON-Verbindungen über die Windows-Firewall. Er übernimmt den Java-Pfad und schlägt erkannte RAM-Werte aus den Startdateien vor (sonst 4 GiB maximal / 1 GiB Start-RAM). Den maximalen RAM pro Server bestätigst oder änderst du bei der Installation. Zwei Aufgaben der Windows-Aufgabenplanung starten die Agenten sofort und künftig bei jedem Windows-Start als SYSTEM, auch ohne Anmeldung.
6. In der Website sollte **Agent verbunden · Gestoppt** erscheinen. Minecraft über **Starten** in der jeweiligen Server-Administration starten.
7. Optional **Dashboard.vbs** öffnen (ohne Konsolenfenster; `Dashboard.cmd` bleibt als kompatibler Starter vorhanden): getrennte Anzeigen für Minecraft-Status und Agent-Verbindung, letzte Verbindung, Links zur Administration und getrennte RAM-Regler. **Konsole öffnen** zeigt das lokale Live-Log des jeweiligen Servers in einem eigenen Fenster (nur lesen). Über **Geschützte Webkonsole** bleiben Befehle auf Owner und Developer beschränkt. Das Fenster darf geschlossen werden, ohne die Agenten zu beenden.

**Nach einem Windows-Neustart:** Die Agenten starten automatisch und stellen die Fernsteuerung bereit. Minecraft selbst bleibt gestoppt, bis du es in der Administration startest. Das Dashboard muss dafür nicht geöffnet sein.

## RAM im Windows-Dashboard

Pro Server lassen sich **Start-RAM** und **maximaler RAM** in GiB speichern. Die Änderung wird beim nächsten Serverstart oder Neustart angewendet; ein laufender Server wird beim Speichern nicht neu gestartet. Die Summe beider Maximalwerte muss mindestens 2 GiB für Windows frei lassen. Die Werte gelten auch dann, wenn die Startdatei bereits andere `-Xms`-/`-Xmx`-Angaben enthält.

Beim Start wendet der Agent die RAM-Werte über `_JAVA_OPTIONS` ausschließlich auf den gestarteten Serverprozess an. Er ändert keine globalen Java-Einstellungen. Bei einem manuellen Start außerhalb des Agenten gelten weiterhin die Angaben der Startdatei.

## Rechte und Trennung

- Owner / Developer: beide Server, Start / Stop / Neustart sowie Konsolenbefehle.
- SMP-Admin: nur Server 1; Steuerung erlaubt, Konsole ausschließlich lesen.
- SMP-Admin2: nur Server 2; Steuerung erlaubt, Konsole ausschließlich lesen.
- Normale Mitglieder und globale Admins ohne jeweilige Serverrolle erhalten keine Fernsteuerung.

Jeder Agent verwendet einen eigenen Schlüssel und getrennte RCON-Ports (25575 / 25576). Die Minecraft-Spielports werden aus den vorhandenen `server.properties` gelesen und müssen verschieden sein. Statistik-Mods und ihre Schlüssel bleiben unverändert.

Die Verbindung zur Website erfolgt ausschließlich ausgehend per HTTPS. Der Agent nimmt keine öffentlichen HTTP-Verbindungen an. RCON wird nur über Loopback genutzt; die Windows-Firewall muss aktiv bleiben. Konfigurationsdateien werden auf Administratoren, SYSTEM und den einrichtenden Benutzer beschränkt.

## Verhalten und Fehler

- Stop sendet den Minecraft-Befehl `stop`; die Welt wird regulär gespeichert. Neustart wartet auf das Ende des zugeordneten Java-Prozesses. Kein `taskkill`, kein erzwungenes Beenden.
- Start wird nach spätestens drei Minuten als fehlgeschlagen gemeldet, wenn Minecraft nicht per RCON erreichbar ist. Bei Fehlern `logs/latest.log` und die Startdatei prüfen, bevor ein erneuter Start versucht wird.
- Pro Server kann nur eine Aktion gleichzeitig laufen. Nicht abgeholte Befehle verfallen nach 60 Sekunden. Bei unklaren Netzwerkabbrüchen werden bereits abgeholte Befehle nicht automatisch erneut ausgeführt.
- Die Konsole zeigt die letzten übertragenen Logzeilen. Sehr lange Zeilen werden gekürzt; lokale vollständige Logs bleiben in `logs/latest.log` erhalten.
- Die Agenten erkennen auch manuell gestartete Minecraft-Server, wenn deren RCON-Konfiguration aktiv ist.
- Eine neue Agent-Konfiguration ersetzt die bisherigen Schlüssel **beider Agenten**. Danach beide Minecraft-Server stoppen und den Installer mit der neuen Datei erneut ausführen. Nicht erneut erstellen, wenn die Installation bereits funktioniert.
- Aufgabenplanung: `AkameSMP-Agent-1` und `AkameSMP-Agent-2`. Die Aufgaben starten bei Windows-Start und werden bei einem Agentenabsturz neu gestartet. Falls nichts angezeigt wird, im Dashboard **Diagnose** öffnen. Frühe Startfehler erscheinen zusätzlich in `startup-server1.log` bzw. `startup-server2.log` im geschützten Agentenordner.

## Validierung

Serverseitige Rollen-, Trennungs- und Befehlsbestätigungstests sowie Browser-Tests werden mit isolierten Testdaten ausgeführt. PowerShell-Syntax und RCON-Protokollclient werden separat geprüft. Die endgültige Einrichtung und der Start echter Windows-/Minecraft-Prozesse müssen auf dem Zielrechner überprüft werden; dieses Paket wurde dort noch nicht ausgeführt.
