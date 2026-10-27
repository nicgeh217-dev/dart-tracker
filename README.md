# Dart-Tracker

Webapp zum Mitschreiben von Darts-Spielen am Dartboard, gebaut fürs Handy. Läuft offline, speichert alles im Browser und braucht kein Konto.

- **Spielmodi:** X01 (301/501, optional Double-Out), Cricket, Frei
- **Teams:** 2 gegen 2 in allen Modi mit gemeinsamem Stand je Team. Wurfreihenfolge: Team 1, Team 2, Team 1, Team 2
- **Zufälliger Start:** Auslosung mit „Wer beginnt?“-Animation. Bei Teams immer, bei Einzelspielen per Schalter
- **Animationen:** Punkte fliegen zum Ring, Leuchten bei Double, Triple und Bull, Wackeln bei Bust, Banner und Konfetti bei 180 und Sieg. Bei „Bewegung reduzieren“ im System sind sie aus
- **Eingabe:** Dart für Dart, mit Rückgängig
- **Spieler:** 2 bis 8 pro Spiel, mit Statistik (Spiele, Siege, Schnitt pro Runde)
- **Verlauf:** alle beendeten Spiele mit Rundenstatistik

## Entwickeln

```bash
npm install
npm run dev      # lokaler Server
npm test         # Spielregeln und Store
npm run build    # Produktions-Build nach dist/
```

Die Spiellogik liegt in `src/game/` und kennt keine UI. Ein Spiel ist ein Log aus Darts, den Stand berechnet `computeState` daraus. Design und Plan stehen in `docs/superpowers/`.

## Auf GitHub Pages veröffentlichen

1. Repo auf GitHub anlegen und `main` pushen.
2. Im Repo unter **Settings → Pages → Source** den Eintrag **GitHub Actions** wählen.
3. Der Workflow `.github/workflows/deploy.yml` testet, baut und veröffentlicht bei jedem Push auf `main`. Die Adresse ist `https://<name>.github.io/<repo>/`.

## Aufs Handy installieren

Die Seite im Handy-Browser öffnen und „Zum Startbildschirm hinzufügen“ (iOS Safari) oder „App installieren“ (Chrome auf Android) wählen. Danach startet die App wie eine normale App und funktioniert ohne Netz.
