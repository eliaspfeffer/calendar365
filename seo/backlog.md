# SEO-Backlog

## Umsetzung vom 15.10.2026

- Nicht sichtbares FAQ mit unbelegtem best-/unlimited-free-Versprechen entfernt; Beschreibung und WebApplication-Schema nennen Demo und Anmeldung zum Speichern.
- Vorhandenes echtes demo.png als lokale Socialvorschau eingebunden, statt Lovable-Platzhalter. Ohne JavaScript erklärt ein sichtbarer Fallback die Jahresansicht und nötige Anmeldung.
- Auth-, Reset-, Share-, Invite-, Agent-, Long- und Legal-Routen erhalten HTTP-noindex; Clientnavigation entfernt zusätzlich Home-Canonical und Home-Schema. Rückkehr zur Startseite stellt Metadaten korrekt wieder her.
- SEO-Arbeitsdateien vom Deployment ausgeschlossen. Sitemap bleibt auf öffentliche Hauptseite begrenzt; private Kalender werden nicht aufgelistet.

## Noch offen

Die interaktive Kalenderansicht benötigt weiterhin JavaScript; der Fallback ist keine serverseitig gerenderte Benutzerkalenderansicht. Vollständige authentifizierte Browserabläufe und Google-Indexierung nach Chrome-Verbindung prüfen. Keine privaten Kalenderdaten für SEO veröffentlichen. Bestehende 27 Lintfehler und 29 TypeScriptfehler liegen in unveränderten Produktdateien.
