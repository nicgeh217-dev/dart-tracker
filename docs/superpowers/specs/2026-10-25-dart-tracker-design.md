# Dart-Tracker – Design-Spec

Datum: 2026-10-25

## Ziel

Eine Webapp zum Tracken von Darts-Spielen am Dartboard, vor allem auf dem Handy bedient. Spieler und Spielmodi lassen sich verwalten, geworfen wird pro Dart eingegeben. Läuft offline, ist auf den Homescreen installierbar und wird über GitHub Pages gehostet. Kein Backend, keine Konten.

## Abgestimmter Umfang

- Spielmodi: X01 (301/501, optional Double-Out), Cricket, Freies Zählen. Around the Clock ist nicht dabei.
- Eingabe: pro Dart (Feld 1–20, Bull, Miss, Umschalter Single/Double/Triple), mit Rückgängig für den letzten Dart.
- Spieler: 2 bis 8 pro Spiel, anlegen, umbenennen, löschen. Statistiken pro Spieler: Spiele, Siege, Schnitt pro Runde.
- Nicht in Version 1: Konten, Cloud-Sync, Online-Multiplayer, Sprachausgabe, Export/Import (naheliegendes nächstes Extra).

## Screens

- **Start:** „Neues Spiel“, „Spieler“, „Verlauf“.
- **Spieler:** Liste mit Statistik, Spieler hinzufügen, umbenennen, löschen.
- **Neues Spiel:** Modus wählen, Spieler wählen (Reihenfolge per Tippen), Optionen. X01: Startwert 301/501 und Double-Out. Cricket und Frei haben keine Optionen.
- **Spielscreen:** Alle Spieler mit Stand, aktueller Spieler hervorgehoben, die drei Darts der laufenden Runde, darunter die Eingabe.
- **Ende:** Sieger, Rundenstatistik, „Revanche“, „Zur Startseite“.
- **Verlauf:** Beendete Spiele, antippbar für Details.

## Spielregeln

- **X01:** Bust bei Überwerfen, bei Rest 1 oder bei Rest 0 ohne Double (nur mit Double-Out). Bei Bust zählt die ganze Runde nicht, der Stand springt auf den Rundenanfang zurück. Wer genau 0 erreicht, gewinnt.
- **Cricket:** Felder 15–20 und Bull. Drei Treffer schließen ein Feld (Single 1, Double 2, Triple 3 Treffer). Ist ein Feld bei dir geschlossen und bei mindestens einem Gegner offen, sammelst du dort Punkte. Sieger ist, wer alle Felder geschlossen hat und mindestens gleich viele Punkte wie alle anderen hat.
- **Frei:** Punkte pro Dart addieren, kein Ziel. Das Spiel beendet der Nutzer manuell.

## Architektur

- Vite, TypeScript, reines DOM und CSS. Kein UI-Framework.
- `src/game/`: reine Spiellogik, gemeinsames `GameMode`-Interface, Implementierungen `x01.ts`, `cricket.ts`, `free.ts`. Keine UI-Abhängigkeit, getestet mit Vitest.
- `src/store/`: App-Zustand (Spieler, laufendes Spiel, Verlauf), Persistenz in `localStorage`.
- `src/ui/`: Screens und Komponenten.
- Ein Spiel ist ein Event-Log aus Darts (Spieler, Feld, Multiplikator). Der Stand wird daraus berechnet. Rückgängig entfernt den letzten Dart, Statistiken lesen dasselbe Log.
- Fehlerbehandlung: Ist `localStorage` nicht verfügbar oder beschädigt, startet die App leer und zeigt einen Hinweis. Ungültige Eingaben (z. B. Triple Bull) gibt es im Eingabefeld gar nicht.

## PWA und Deployment

- `vite-plugin-pwa` liefert Manifest und Service Worker, damit die App installierbar und offline nutzbar ist.
- Schriften werden über `@fontsource` ausgeliefert, nicht von Google Fonts, damit sie offline verfügbar sind.
- GitHub Action baut bei Push auf `main` und deployt nach GitHub Pages. Die `base`-URL von Vite wird auf den Repo-Namen gesetzt.

## Visuelles Design

**Leitidee:** Die Kreidetafel in der Kneipe, auf der man Darts-Stände mitschreibt. Die App fühlt sich an wie eine Schiefertafel mit Kreide-Ziffern, in die das Dartboard-Rot und -Grün als einzige Farben eingreifen.

**Farben**
- Schiefer `#232B27` – Hintergrund
- Schiefer hell `#2F3934` – Flächen, aktueller Spieler
- Kreide `#ECE9DD` – Text und Ziffern
- Kreide gedämpft `#9AA397` – Nebeninfos
- Board-Rot `#C93A2E` – Double, Fehler, Bust
- Board-Grün `#3F8A5A` – Triple, Bestätigung, Sieg
- Alle Textfarben erreichen mindestens Kontrast 4.5:1 auf Schiefer. Rot und Grün tragen nie allein die Bedeutung, Double und Triple sind zusätzlich beschriftet.

**Schrift**
- Big Shoulders Display (Bold/ExtraBold) für Punktestände und Überschriften. Die schmale Signage-Schrift ermöglicht sehr große Ziffern auf kleinem Display. Ziffern sind tabellarisch.
- Instrument Sans für Bedienelemente und Fließtext.
- Skala: Punktestand des aktiven Spielers 96 px, übrige Stände 40 px, Überschriften 28 px, Text 16 px, Nebeninfos 14 px.

**Layout (Spielscreen, linksbündig für Namen, rechtsbündig für Zahlen)**

```
+----------------------------------+
| Jonas                      301   |  <- aktiv, große Kreide-Ziffern
|   Runde 3:  [T20] [20] [ - ]     |
| Mia                        218   |
| Tom                        144   |
+----------------------------------+
|  [ Single | Double | Triple ]    |  <- Umschalter
|  [1][2][3][4][5]                 |
|  [6][7]...[20]                   |
|  [Bull] [Miss]       [Rückgängig]|
+----------------------------------+
```

**Prinzipien**
- Die einzige große Geste sind die Kreide-Ziffern des Spielstands. Alles andere bleibt ruhig: flache Flächen, ein einheitlicher Radius, keine Schatten, keine Verläufe.
- Der Multiplikator-Umschalter wechselt seine Farbe (Single Kreide, Double Rot, Triple Grün) und färbt damit die gesamte Zahlentastatur ein, so dass man vor dem Tippen sieht, was zählt.
- Bewegung nur als Antwort auf Eingaben: Die Ziffer wischt beim Stand-Update wie weggewischte Kreide und die neue Zahl erscheint. Keine Einblend-Effekte beim Laden. `prefers-reduced-motion` wird respektiert.
- Tasten mindestens 48 px groß, sichtbarer Tastaturfokus, kein Zoom nötig. Beschriftungen in Satzschreibweise und aktiv („Spiel starten“, „Spieler hinzufügen“).
- Leere Zustände nennen den nächsten Schritt, z. B. „Noch keine Spieler. Lege den ersten an, um ein Spiel zu starten.“
- Das App-Icon ist eine Kreide-Scheibe mit Rot und Grün auf Schiefer.

## Tests

- Vitest-Unit-Tests für alle Spielregeln: X01 (Bust-Fälle, Double-Out, Checkout), Cricket (Schließen, Punkte, Sieg), Frei, Rückgängig.
- Manuelle Prüfung der UI auf einem Handy-Viewport und der Installation als PWA.
