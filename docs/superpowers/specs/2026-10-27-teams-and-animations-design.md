# Teams (2 gegen 2), zufälliger Start und mehr Animationen – Design-Spec

Datum: 2026-10-27
Baut auf: `docs/superpowers/specs/2026-10-25-dart-tracker-design.md` (Stand: App ist live auf GitHub Pages)

## Ziel

Die App bekommt ein Team-Spiel (2 gegen 2) für alle drei Modi, eine zufällige Auslosung, welches Team beginnt, und deutlich mehr Rückmeldung nach jeder Eingabe. Einzelspiele und alle bereits gespeicherten Spiele bleiben unverändert gültig.

## Abgestimmter Umfang

- Team-Spiel 2 gegen 2 in X01, Cricket und Frei. Genau 4 Spieler, zwei Teams mit je zwei Spielern.
- Pro Team **ein gemeinsamer Stand**. Beide Spieler eines Teams spielen auf denselben X01-Rest, dieselben Cricket-Marks und Punkte bzw. dieselbe Summe bei Frei.
- Wurfreihenfolge: Team 1 Spieler 1, Team 2 Spieler 1, Team 1 Spieler 2, Team 2 Spieler 2, danach wieder von vorn.
- Zufälliger Start mit Glücksrad-Animation. Bei Teams immer an, bei Einzelspielen ein Schalter „Zufälliger Start“ (Standard aus).
- Mehr Animationen nach jeder Dart-Eingabe (siehe unten).
- Nicht dabei: weitere Spielmodi (Around the Clock, Shanghai, Killer, Halve-It), andere Teamgrößen, Teamnamen von Hand vergeben, Sound.

## Datenmodell

Der Spielzustand wird pro **Seite** geführt. Eine Seite ist ein Einzelspieler oder ein Team.

- `GameConfig` bekommt optional `teams?: [string[], string[]]`. Jedes Team hat genau 2 Spieler-IDs. `playerIds` bleibt die **Wurfreihenfolge**. Bei Teams gilt immer `playerIds = [t0[0], t1[0], t0[1], t1[1]]`, und `teams[0]` ist das Team, das beginnt.
- Seiten-IDs: bei Einzelspielen die Spieler-ID, bei Teams `team:0` und `team:1` (Index in `config.teams`). Hilfsfunktion `sidesOf(config)` liefert die Seiten in Startreihenfolge, `sideOf(config, playerId)` die Seite eines Spielers.
- `Game.winnerId` bedeutet ab jetzt **ID der Gewinner-Seite**. Bei Einzelspielen ist das die Spieler-ID wie bisher, alte Daten bleiben gültig.
- `GameState` bekommt `sides: SideState[]` (Seiten-ID, Mitglieder, `score`, `marks`) und `currentSideId`. `PlayerState` behält nur `playerId`, `pointsScored`, `turnsPlayed` und wird weiter pro Person geführt. `winnerId` im Zustand ist die Seiten-ID. `currentPlayerId` bleibt der Werfer.
- Regeln pro Seite: X01 (Rest, Bust, Double-Out), Cricket (Gegner sind alle anderen Seiten, „alle Gegner geschlossen“ prüft deren Marks) und Frei rechnen auf den Seiten-Stand. Punkte und Runden für die Statistik werden dem werfenden Spieler gutgeschrieben.
- Eine „Runde“ ist vorbei, wenn jeder Spieler einmal dran war (bei Teams also nach vier Aufnahmen).
- Speicher-Validierung (`storage.ts`): `teams` ist optional. Falls vorhanden müssen es zwei Arrays mit je zwei Strings sein, `playerIds` hat 4 Einträge und entspricht der Verschränkung oben. Alles andere gilt als beschädigt (leere Daten plus Hinweis wie bisher).

## Neues-Spiel-Screen

- Bei X01, Cricket und Frei erscheint ein Schalter „Teams (2 gegen 2)“. Ist er an, verlangt „Spiel starten“ genau 4 Spieler. Die ersten zwei angetippten Spieler bilden Team 1, die nächsten zwei Team 2. Die Reihenfolge im Team bestimmt, wer zuerst wirft. Jede Zeile zeigt zusätzlich „Team 1“ oder „Team 2“.
- Hinweis solange nicht passend: „Wähle 4 Spieler für 2 gegen 2.“
- Ein zweiter Schalter „Zufälliger Start“. Bei eingeschalteten Teams ist er fest an und nicht änderbar. Bei Einzelspielen steht er standardmäßig auf aus.
- `startGame(config, options?: { randomStart?: boolean; random?: () => number })` entscheidet die Auslosung **vor** dem Speichern: Bei Teams werden mit 50 % die beiden Teams getauscht, bei Einzelspielen wird die Spielerreihenfolge so rotiert, dass ein zufälliger Spieler beginnt. Das Ergebnis steckt in `config` und bleibt nach Neuladen und Rückgängig unverändert. `random` ist für Tests injizierbar.

## Wer beginnt?

- Nach dem Start (nur wenn ausgelost wurde) zeigt ein Vollbild-Overlay „Wer beginnt?“. Die Seitennamen laufen wie ein Glücksrad durch, werden langsamer (ca. 14 bis 18 Schritte über etwa 1,8 s) und bleiben beim Startteam bzw. Startspieler stehen. Das Ergebnis steht vorher fest, die Animation landet nur darauf.
- Danach hebt sich der Gewinner 0,7 s hervor („Anna & Ben beginnen“, bei Einzelspielen „Anna beginnt“), das Overlay blendet aus. Tippen überspringt.
- Das Overlay deckt die Tastatur ab, vorher kann kein Dart eingegeben werden. Nach Neuladen erscheint es nicht erneut. Bei „Bewegung reduzieren“ wird das Ergebnis ohne Lauf 1,2 s lang gezeigt.
- Der Übergabe-Zustand ist rein UI-seitig (`src/ui/draw.ts`), nichts davon wird gespeichert.

## Spielscreen bei Teams

- Die Spielerleiste und die aktive Karte zeigen Seiten („Anna & Ben“). Unter dem Seitennamen steht, wer wirft („Anna wirft“).
- Der Ring und die Marks gehören zur Seite. Bei Frei zeigt der Ring die Darts der laufenden Aufnahme des Werfers.
- Einzelspiele sehen aus wie bisher.

## Ende und Verlauf bei Teams

- Der Ende-Screen zeigt „Anna & Ben gewinnen“. Die Tabelle hat pro Team eine Kopfzeile (Name, Badge „Sieger“) und darunter die zwei Spieler mit Runden, Punkte und Ø pro Runde. Bei Cricket gibt es eine Zeile pro Team mit „Geschlossen“ und „Punkte“.
- „Revanche“ lässt das andere Team beginnen (Teams tauschen), bei Einzelspielen bleibt die bisherige Rotation. Rückgängig auf dem Ende-Screen bleibt wie bisher.
- Der Verlauf zeigt „Anna & Ben gegen Cleo & Dan“ und den Sieger-Team-Namen.
- Statistik: Spiele und Siege zählen für jeden Spieler im Siegerteam (Vergleich `sideOf(config, playerId) === winnerId`). Der Schnitt pro Runde kommt pro Spieler aus `pointsScored/turnsPlayed` und gilt weiter für X01 und Frei.

## Animationen nach der Eingabe

Alles ohne Bibliothek (CSS, Web Animations API, ein Canvas für Konfetti). Alle Effekte sind aus, wenn `prefers-reduced-motion` gesetzt ist. Das Haptik-Feedback gibt es nur, wo `navigator.vibrate` existiert.

Auslöser ist ein **neuer Dart**: Der Spielscreen vergleicht `game.darts.length` mit der zuletzt gezeigten Länge desselben Spiels und spielt Effekte nur, wenn genau ein Dart dazugekommen ist. Beim Neuladen, Rückgängig und Seitenwechsel passiert nichts.

Welche Effekte laufen, bestimmt die reine Funktion `describeThrow(config, before: GameState, dart, after: GameState): ThrowEvent[]` in `src/game/events.ts` (getestet). Ereignisse:

| Ereignis | Wann |
|---|---|
| `points` (Wert) | Dart brachte Punkte, bei Cricket nur gewertete Punkte |
| `triple`, `double`, `bull` | Treffer des Dart |
| `oneEighty` | Dritter Triple-20 derselben Aufnahme in X01 oder Frei |
| `bust` | Dart beendete die Aufnahme als Bust |
| `closed` (Feld) | Cricket: Dart schloss ein Feld für die Seite |
| `win` | Dart entschied das Spiel |

Wirkung:
- **Chip:** Der neue Dart-Chip springt ein (Skalierung 0.6 → 1.1 → 1 in 220 ms).
- **Punkte fliegen:** „+60“ startet an der gedrückten Taste und fliegt in 550 ms zum Ring, wo es verschwindet. Bei 0 Punkten kein Flug, bei Bust fliegt „Bust“ in Rot. Die Ebene liegt als Overlay am Body und überlebt das Neuzeichnen.
- **Ring:** Kurzes Leuchten, grün bei Triple, rot bei Double, creme bei Bull (400 ms).
- **Bust:** Der Ring wackelt (400 ms) und die Karte blitzt rot auf.
- **180 und Sieg:** „180!“ bzw. „Checkout!“ groß in der Mitte (900 ms) plus Konfetti in Rot, Grün und Creme (1,6 s, nicht klickbar). Der Sieg löst dasselbe Konfetti auf dem Ende-Screen aus.
- **Cricket:** Neu geschlossene Marks werden eingestempelt (Skalierung 2 → 1 mit leichter Drehung, 400 ms).
- **Spielerwechsel:** Die neue aktive Karte gleitet in 280 ms von rechts ein.
- **Zahlen:** Das bestehende Einrollen des Standes bleibt.
- **Haptik:** Triple 15 ms, 180 und Sieg Muster 20-40-20 ms, Bust 40 ms. Der normale Tastendruck bleibt bei 8 ms.

## Design-Konsistenz

Farben, Schrift und Formen bleiben wie im bestehenden Design (Graphit, Dartboard-Rot und -Grün, Creme, Inter, Pillen und 24-px-Karten). Das Konfetti nutzt nur diese drei Farben. Ein Team zeigt sich nicht durch eigene Farben, sondern durch den Namen „Anna & Ben“ und die Zeile „Team 1/2“, damit Rot und Grün weiter nur Double, Triple, Sieg und Bust bedeuten.

## Tests

- Vitest für die Spiellogik mit Seiten: X01, Cricket und Frei als Team (gemeinsamer Stand, Wurfreihenfolge T1-S1, T2-S1, T1-S2, T2-S2, Bust, Cricket-Punkte nur solange ein Gegner offen ist, Sieg), `sidesOf`, `sideOf`, `describeThrow`, Statistik mit Siegerteam, Validierung von `teams` im Speicher, `startGame` mit injiziertem `random` (Team-Tausch, Rotation, Reihenfolge-Invariante, Rückgängig ändert die Auslosung nicht).
- Alle bisherigen Tests laufen unverändert weiter (Einzelspiele sind rückwärtskompatibel).
- jsdom-Test für die Effekt-Schicht: bei `prefers-reduced-motion` entstehen keine Overlay-Elemente.
- Manuelle Prüfung im Browser bei 390×844: Team-Spiel in allen drei Modi, Auslosung, jede Animation, Neuladen mitten im Team-Spiel, Revanche, Verlauf.

## Randfälle, die die Umsetzung abdecken muss

- Rückgängig über den Wechsel zwischen Teammitgliedern und über den Teamwechsel hinweg.
- Cricket, wenn der Partner ein Feld schließt und der andere weiterwirft.
- Neuladen mitten im Team-Spiel stellt Reihenfolge, Stand und Werfer wieder her.
- Ein Team-Spiel kann nicht mit anderer Spielerzahl als 4 gestartet werden.
- Ein Spieler eines laufenden Team-Spiels lässt sich nicht löschen, im Verlauf bleiben Namen über den Snapshot erhalten.
- Das Overlay „Wer beginnt?“ verhindert Eingaben, bis es fertig ist oder übersprungen wird.
- Bei schnellen Eingaben hintereinander überlagern sich Animationen nicht fehlerhaft (alte Overlays werden entfernt).
