# AkameSMP Stats Sync — Fabric 26.3

Serverseitige Mod für die bestehende AkameSMP-Website:
https://akamedevelopment.github.io/akamesmp-stats.html

## Installation

1. Minecraft Java **26.3**, **Java 25**, Fabric Loader **0.20.1 oder neuer** und Fabric API für **26.3** installieren. Getesteter Build: Fabric API **0.166.2+26.3**.
2. `akamesmp-stats-1.0.1.jar` in den `mods/`-Ordner des Servers legen. Spieler benötigen diese Mod nicht.
3. Server einmal starten. Die Mod erstellt `config/akamesmp-stats.json`. Ohne Token bleibt die Synchronisierung deaktiviert; der Minecraft-Server kann weiterlaufen.
4. Auf dem Minecraft-Server einen zufaelligen Token mit mindestens 32 Zeichen, empfohlen 48 Zeichen, als `serverToken` eintragen. Alternativ die Umgebungsvariable `AKAMESMP_SERVER_TOKEN` setzen; sie hat Vorrang.
5. Den SHA-256-Pruefwert dieses Tokens in Supabase unter `private.akamesmp_mod_credentials` fuer `id = 1` hinterlegen lassen. Die Edge Function prueft den Bearer-Token serverseitig gegen diesen Hash. Den Klartext-Token nicht im Chat oder GitHub veroeffentlichen. Bei einer bereits eingerichteten Installation sind keine Token-Aenderungen erforderlich.
6. Server neu starten. Die vollstaendige Synchronisierung beginnt automatisch. Das private Dashboard benoetigt weiterhin Discord-Anmeldung und die bestehende Admin-/Owner-Rolle.

## Update von 1.0.0 und manuelle Synchronisierung

Server stoppen, `akamesmp-stats-1.0.0.jar` aus `mods/` entfernen, neue `akamesmp-stats-1.0.1.jar` hineinlegen und neu starten. Die bestehende Config und der Token bleiben erhalten. Nicht beide Versionen gleichzeitig installieren.

**Fehler behoben:** Minecraft 26.3 speichert Statistiken unter `<Welt>/players/stats/`. Version 1.0.0 hat nur unter `<Welt>/stats/` gesucht. Version 1.0.1 verwendet Minecrafts `PLAYER_STATS_DIR` und liest zusaetzlich den alten `stats/`-Ordner. Beide Ordner werden nur innerhalb der aktiven Welt gelesen. Daten aus beliebigen Welt-Backups werden nicht automatisch importiert.

In der Server-Konsole:

```text
akamesmpstats sync
```

Im Spiel als OP mit Admin-Berechtigung (Level 3 oder hoeher): `/akamesmpstats sync`.

Der Befehl fordert die naechste vollstaendige Synchronisierung an. Falls bereits eine laeuft, folgt sie danach. Die Konsole zeigt die gefundenen Ordner beim Start und nach Erfolg die Anzahl aller Spieler sowie der Offline-Spieler. Doppelte UUIDs werden einmal beruecksichtigt: aktuelle Online-Werte haben Vorrang, dann der aktuelle Minecraft-Ordner, dann der alte Ordner. Statistiken werden nicht addiert oder in Minecraft zurueckgeschrieben.

Konfiguration:

```json
{
  "endpoint": "https://wycdpuzlbivtfxwtarzn.supabase.co/functions/v1/akamesmp-server-status",
  "serverToken": "",
  "intervalSeconds": 30
}
```

`intervalSeconds` muss 10–60 sein. Die Website stuft den Server nach 90 Sekunden ohne Meldung als offline ein. Änderungen an der Konfiguration benötigen einen Neustart. Niemals einen Supabase-Service-Role-Key in diese Datei eintragen: Die Mod benötigt nur den separaten Server-Token.

## Daten

- Server: aktuelle Spielerzahl, maximale Spielerzahl, Spielerrekord, Laufzeit.
- Spieler: UUID, Name, Spielzeit in Sekunden, Spieler-Kills, Tode, Mob-Kills, abgebaute Blöcke, gelaufene Zentimeter und zuletzt gesehen.
- Die bestehende Edge Function berechnet Gesamtwerte und speichert die Einträge für das Leaderboard und die öffentliche Gesamtstatistik.
- Online-Werte werden auf dem Serverthread aus den Minecraft-Statistiken übernommen; Dateizugriffe und HTTPS laufen auf einem separaten Thread. Die Mod verändert keine Vanilla-Statistiken.
- Offline-Werte stammen aus `<Welt>/players/stats/*.json` und dem alten `<Welt>/stats/*.json`; Namen aus `usercache.json`. Fehlt ein alter Name im Cache, wird vorläufig der UUID-Anfang angezeigt. Beim nächsten Login wird der richtige Name gesendet.
- Für Online-Spieler ist „zuletzt gesehen“ der Zeitpunkt der Erfassung. Für Offline-Spieler dient die Änderungszeit der gespeicherten Statistikdatei als Näherung; historische exakte Logout-Zeiten kann Vanilla daraus nicht rekonstruieren.
- Die Laufzeit beginnt beim Serverstart. Der Spielerrekord seit Installation wird unter `<Welt>/akamesmp-stats-peak.json` gespeichert und überlebt Neustarts.
- Vorhandene Vanilla-Statistiken werden beim ersten Sync übernommen, einschließlich Offline-Spielern. Voraussetzung ist, dass die Statistikdateien noch vorhanden sind.
- Übertragen werden absolute Gesamtstände. Wiederholungen bei Netzwerkproblemen addieren keine Werte doppelt.
- Netzwerkfehler werden beim nächsten Intervall erneut versucht. Pro regulärem Intervall läuft höchstens ein Request. Beim Herunterfahren wird ein letzter Stand mit Spielerzahl 0 gesendet; das Online-Symbol der bestehenden Website kann noch bis zu 90 Sekunden grün bleiben.
- Die vorhandene API begrenzt einen vollständigen Stand auf 1000 Spieler und 1 MB. Bei Überschreitung wird die Übertragung abgebrochen, statt unvollständige Gesamtwerte zu veröffentlichen. Mehrere Server/Welten gleichzeitig werden von dieser vorhandenen Einzelserver-Schnittstelle nicht unterstützt.

## Fehlerbehebung

- `Server-Token fehlt`: Token auf dem Minecraft-Server setzen und neu starten.
- HTTP 503: Token-Pruefung oder Backend-Konfiguration in Supabase nicht erreichbar.
- HTTP 401: Token ist kuerzer als 32 Zeichen oder sein SHA-256-Pruefwert stimmt nicht mit Supabase ueberein.
- HTTP 400: Übertragene Daten passen nicht zur API-Validierung; z. B. geänderte Schnittstelle oder unzulässige Werte.
- HTTP 502: Die Edge Function konnte Daten nicht speichern; ihre Supabase-Logs prüfen.
- Keine Anzeige nach erfolgreichem Sync: Discord-Anmeldung und Admin-/Owner-Rechte prüfen.

## Quellcode bauen

Java 25 installieren, dann:

```sh
./gradlew build
```

Unter Windows: `gradlew.bat build`. Ergebnis: `build/libs/akamesmp-stats-1.0.1.jar`. Keine `-sources.jar` als Server-Mod installieren.

## Prüfung

`./gradlew build` erfolgreich gegen Minecraft 26.3. Fuenf automatisierte Tests prüfen Tick-Umrechnung, summierte Blockstatistiken, Übernahme von Offline-Spielern und Vorrang aktueller Online-Werte, fehlende/neue Statistiken sowie das Abbrechen bei beschädigten Dateien und negativen Werten. Ein Regressionstest prueft Minecrafts tatsaechlichen 26.3-Statistikordner und das Zusammenfuehren mit alten Dateien ohne doppelte Spieler.

Ein vollständiger Ingame-/Website-Test wurde noch nicht durchgeführt: Diese neue JAR wurde nicht auf einem laufenden AkameSMP-Spielserver gestartet. Die bestehende produktive Schnittstelle ist eingerichtet; die Server-Installation der neuen Version erfolgt durch den Betreiber.

Referenzen: https://meta.fabricmc.net/v2/versions/game · https://github.com/FabricMC/fabric-example-mod/tree/26.3 · https://supabase.com/docs/guides/functions/auth
