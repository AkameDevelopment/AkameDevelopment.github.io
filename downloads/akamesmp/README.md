# AkameSMP Stats Sync — Fabric 26.3

Serverseitige Mod für die bestehende AkameSMP-Website:
https://akamedevelopment.github.io/akamesmp-stats.html

## Installation

1. Minecraft Java **26.3**, **Java 25**, Fabric Loader **0.20.1 oder neuer** und Fabric API für **26.3** installieren. Getesteter Build: Fabric API **0.166.2+26.3**.
2. `akamesmp-stats-1.0.0.jar` in den `mods/`-Ordner des Servers legen. Spieler benötigen diese Mod nicht.
3. Server einmal starten. Die Mod erstellt `config/akamesmp-stats.json`. Ohne Token bleibt die Synchronisierung deaktiviert; der Minecraft-Server kann weiterlaufen.
4. Im Supabase-Projekt `AkameDevelopment` unter **Edge Functions → Secrets** ein Secret mit Namen **AKAMESMP_SERVER_TOKEN** setzen. Einen eigenen zufälligen Token mit mindestens 32 Bytes verwenden, z. B. lokal mit `python -c "import secrets; print(secrets.token_urlsafe(48))"` erzeugen.
5. Auf dem Minecraft-Server denselben Wert als Umgebungsvariable `AKAMESMP_SERVER_TOKEN` setzen. Alternativ in `config/akamesmp-stats.json` bei `serverToken` eintragen. Die Umgebungsvariable hat Vorrang. Den Token vertraulich behandeln und nicht ins Website-Repository hochladen.
6. Server neu starten. Nach etwa 30 Sekunden und dem nächsten Website-Refresh werden Daten angezeigt. Das private Dashboard benötigt weiterhin Discord-Anmeldung und die bestehende Admin-/Owner-Rolle.

**Aktuell geprüft:** Die vorhandene Edge Function ist erreichbar, meldet aber HTTP 503 mit `server_token_not_configured`. Das Secret muss noch gesetzt werden. Es wurde keine produktive Datenbank oder Edge Function verändert.

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
- Offline-Werte stammen aus `<Welt>/stats/*.json`; Namen aus `usercache.json`. Fehlt ein alter Name im Cache, wird vorläufig der UUID-Anfang angezeigt. Beim nächsten Login wird der richtige Name gesendet.
- Für Online-Spieler ist „zuletzt gesehen“ der Zeitpunkt der Erfassung. Für Offline-Spieler dient die Änderungszeit der gespeicherten Statistikdatei als Näherung; historische exakte Logout-Zeiten kann Vanilla daraus nicht rekonstruieren.
- Die Laufzeit beginnt beim Serverstart. Der Spielerrekord seit Installation wird unter `<Welt>/akamesmp-stats-peak.json` gespeichert und überlebt Neustarts.
- Vorhandene Vanilla-Statistiken werden beim ersten Sync übernommen, einschließlich Offline-Spielern. Voraussetzung ist, dass die Statistikdateien noch vorhanden sind.
- Übertragen werden absolute Gesamtstände. Wiederholungen bei Netzwerkproblemen addieren keine Werte doppelt.
- Netzwerkfehler werden beim nächsten Intervall erneut versucht. Pro regulärem Intervall läuft höchstens ein Request. Beim Herunterfahren wird ein letzter Stand mit Spielerzahl 0 gesendet; das Online-Symbol der bestehenden Website kann noch bis zu 90 Sekunden grün bleiben.
- Die vorhandene API begrenzt einen vollständigen Stand auf 1000 Spieler und 1 MB. Bei Überschreitung wird die Übertragung abgebrochen, statt unvollständige Gesamtwerte zu veröffentlichen. Mehrere Server/Welten gleichzeitig werden von dieser vorhandenen Einzelserver-Schnittstelle nicht unterstützt.

## Fehlerbehebung

- `Server-Token fehlt`: Token auf dem Minecraft-Server setzen und neu starten.
- HTTP 503: Secret `AKAMESMP_SERVER_TOKEN` oder Backend-Konfiguration in Supabase fehlt.
- HTTP 401: Token in Minecraft und Supabase stimmen nicht überein.
- HTTP 400: Übertragene Daten passen nicht zur API-Validierung; z. B. geänderte Schnittstelle oder unzulässige Werte.
- HTTP 502: Die Edge Function konnte Daten nicht speichern; ihre Supabase-Logs prüfen.
- Keine Anzeige nach erfolgreichem Sync: Discord-Anmeldung und Admin-/Owner-Rechte prüfen.

## Quellcode bauen

Java 25 installieren, dann:

```sh
./gradlew build
```

Unter Windows: `gradlew.bat build`. Ergebnis: `build/libs/akamesmp-stats-1.0.0.jar`. Keine `-sources.jar` als Server-Mod installieren.

## Prüfung

`./gradlew build` erfolgreich gegen Minecraft 26.3. Vier automatisierte Tests prüfen Tick-Umrechnung, summierte Blockstatistiken, Übernahme von Offline-Spielern und Vorrang aktueller Online-Werte, fehlende/neue Statistiken sowie das Abbrechen bei beschädigten Dateien und negativen Werten.

Ein vollständiger Ingame-/Website-Test wurde noch nicht durchgeführt: Der produktiven Schnittstelle fehlt der Server-Token, und es stand kein laufender AkameSMP-Spielserver zur Verfügung.

Referenzen: https://meta.fabricmc.net/v2/versions/game · https://github.com/FabricMC/fabric-example-mod/tree/26.3 · https://supabase.com/docs/guides/functions/auth
