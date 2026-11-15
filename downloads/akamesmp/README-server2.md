# AkameSMP Stats2 — Server 2

Für Minecraft Java 26.3, Java 25, Fabric Loader >= 0.20.1 und Fabric API für 26.3. Nur auf dem Minecraft-Server installieren; Spieler benötigen die Mod nicht.

## Installation

1. `akamesmp-stats2-1.0.1.jar` in den `mods`-Ordner von **Server 2** legen. Die normale `akamesmp-stats`-Mod gehört ausschließlich auf Server 1; auf Server 2 durch Stats2 ersetzen.
2. Als Owner oder Developer `https://akamedevelopment.github.io/akamesmp/server/2/administration/` öffnen. Unter „Statistik-Mod für Server 2“ auf „Konfiguration erstellen & herunterladen“ klicken.
3. Die heruntergeladene Datei auf **Server 2** als `config/akamesmp-stats2.json` ablegen und Server 2 neu starten. Die Datei enthält einen geheimen Schlüssel: privat aufbewahren und nicht auf GitHub oder im Chat veröffentlichen.
4. Die Werte erscheinen auf der Server-2-Seite, die erweiterten Statistiken in dessen Administration. Server-2-Admins dürfen die erweiterten Statistiken lesen; nur Owner und Developer können die Mod-Konfiguration erstellen.

Ein neuer Konfigurationsdownload erzeugt einen neuen Server-2-Schlüssel und ersetzt den bisherigen. Bei einer bereits laufenden Installation muss anschließend auch deren Config aktualisiert werden. Server 1 ist davon unabhängig.

Alternativ überschreibt die Umgebungsvariable `AKAMESMP2_SERVER_TOKEN` den Schlüssel aus der Datei. Die Variable von Server 1 (`AKAMESMP_SERVER_TOKEN`) wird absichtlich ignoriert.

## Eigene Dateien und Schnittstelle

- Mod-ID: `akamesmp_stats2`
- Config: `config/akamesmp-stats2.json`
- Endpoint: `https://wycdpuzlbivtfxwtarzn.supabase.co/functions/v1/akamesmp2-server-status`
- Weltdatei für Spielerrekord: `akamesmp-stats2-peak.json`
- Befehl für eine manuelle Synchronisierung: `akamesmpstats2 sync` (Serverkonsole) oder `/akamesmpstats2 sync` (OP im Spiel).
- Standardintervall 30 Sekunden, konfigurierbar von 10 bis 60 Sekunden. Nach 90 Sekunden ohne Meldung gilt der Server als offline.

Übernimmt Online- und gespeicherte Offline-Spielerstatistiken aus der aktiven Welt (`players/stats/` und alter `stats/`-Ordner), ohne doppelte UUIDs oder doppelte Zählung. Die Mod verändert keine Minecraft-Statistiken und gibt keine Serversteuerung frei. Steuerung und Konsole werden separat verbunden.

Server 2 verwendet eigene Datenbanktabellen `akamesmp2_player_stats`, `akamesmp2_server_status` und `akamesmp2_public_totals`. Auch derselbe Spieler kann auf beiden Servern unterschiedliche Werte haben. Die bereits produktiven Server-1-Daten werden nicht verschoben oder verändert.

## Bauen und Prüfung

Mit Java 25 in `source/`: `./gradlew build` oder unter Windows `gradlew.bat build`. Ergebnis: `build/libs/akamesmp-stats2-1.0.1.jar`.

Build und Java-Statistiktests bestanden. Datenempfänger und Website wurden mit Testdaten geprüft. Ein Start auf dem echten Minecraft-Server 2 steht noch aus.
