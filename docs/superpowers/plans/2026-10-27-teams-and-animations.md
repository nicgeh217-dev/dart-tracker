# Teams, zufälliger Start und Animationen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 2-gegen-2-Teamspiel in X01, Cricket und Frei, zufällige Auslosung des Starters mit „Wer beginnt?“-Glücksrad und deutlich mehr Animationen nach jeder Dart-Eingabe.

**Architecture:** Die Spiellogik rechnet den Zustand weiter aus dem Dart-Log neu, jetzt aber pro **Seite** (Einzelspieler oder Team) mit gemeinsamem Stand; Statistik bleibt pro Person. Eine reine Funktion `describeThrow` leitet aus zwei Zuständen die Ereignisse eines Darts ab, eine kleine Effekt-Schicht (`src/ui/fx.ts`) macht daraus Animationen in einer Overlay-Ebene, die das Neuzeichnen überlebt.

**Tech Stack:** Vite, TypeScript, Vitest (+ jsdom), CSS, Web Animations API, ein Canvas für Konfetti. Keine neuen Abhängigkeiten.

**Spec:** `docs/superpowers/specs/2026-10-27-teams-and-animations-design.md`

## Global Constraints

- Keine neuen Abhängigkeiten. Alle 72 bestehenden Tests laufen unverändert weiter (Einzelspiele und alte Speicherdaten bleiben gültig).
- Teams: genau 4 Spieler, zwei Teams mit je 2. `playerIds` ist die Wurfreihenfolge `[t0[0], t1[0], t0[1], t1[1]]`, `teams[0]` beginnt. Seiten-IDs: Einzelspieler = Spieler-ID, Team = `team:0` / `team:1`. `Game.winnerId` ist die ID der Gewinner-Seite.
- `src/game/` importiert nie aus `src/store/` oder `src/ui/`.
- UI-Texte auf Deutsch, Satzschreibweise, aktive Verben. Beschriftungen: „Teams (2 gegen 2)“, „Zufälliger Start“, „Wer beginnt?“, „Team 1“, „Team 2“, „Wähle 4 Spieler für 2 gegen 2.“, „<Name> beginnt“ bzw. „<Name> beginnen“, „<Name> gewinnt“ bzw. „<Name> gewinnen“, „<Name> wirft“, „<Team 1> gegen <Team 2>“. Teamname = Spielernamen mit „ & “ verbunden.
- Alle Effekte sind aus, wenn `prefers-reduced-motion: reduce` gilt (CSS-Animationen über die bestehende Regel, JS-Effekte über `motionAllowed()`). Haptik nur, wo `navigator.vibrate` existiert.
- Effekte laufen nur, wenn genau ein Dart dazukam (nicht bei Neuladen, Rückgängig, Seitenwechsel). Alte Effekt-Overlays werden vor neuen entfernt.
- Dauern: Chip-Sprung 220 ms, Punkte-Flug 550 ms, Ring-Leuchten 400 ms, Wackeln 400 ms, Stempeln 400 ms, Kartenwechsel 280 ms, Banner 900 ms, Konfetti 1,6 s, Glücksrad ca. 1,8 s mit 14 bis 18 Schritten plus 0,7 s Hervorhebung. Haptik: Tastendruck 8 ms (besteht), Triple 15 ms, 180 und Sieg `[20, 40, 20]`, Bust 40 ms.
- Farben und Formen aus den bestehenden Tokens (`--bg`, `--surface`, `--cream`, `--red`, `--green`, 24-px-Karten, Pillen). Teams bekommen keine eigenen Farben. Konfetti nur in Rot, Grün, Creme.
- Tasten mindestens 48 px, Kontrast mindestens 4.5:1, kein horizontales Scrollen bei 390 px Breite.

## Review Focus

- Rückgängig über den Wechsel zwischen zwei Teammitgliedern und über den Teamwechsel hinweg stellt Werfer, Stand und Gewinner wieder her. Die Auslosung ändert sich dadurch nie (Tests in Task 2 und 6).
- Cricket im Team: Schließt der Partner ein Feld und der andere wirft weiter, zählt das Feld für das Team. Punkte gibt es nur, solange mindestens eine gegnerische Seite das Feld noch offen hat (Task 2).
- Neuladen mitten im Team-Spiel stellt Reihenfolge, Stand und Werfer wieder her. Das „Wer beginnt?“-Overlay erscheint danach nicht erneut (Task 6 und 9).
- Schnelle Eingaben hintereinander und fehlende Browser-Funktionen (`matchMedia`, `Element.animate`, `navigator.vibrate`, kein Ursprungs-Rechteck): Effekte stapeln sich nicht, nichts wirft (Task 10).
- Team-Spiel mit anderer Spielerzahl als 4 oder beschädigten `teams` im Speicher: kein Absturz, Spielstart verweigert bzw. leere Daten plus Hinweis (Task 1, 6).

**Spec-Auflösung:** Die Spec sagt zugleich, `PlayerState` verliere `score`/`marks`, und „alle bisherigen Tests laufen unverändert“. Dieser Plan hält beides ein, indem `PlayerState` `score` und `marks` als **Spiegel der Seite** behält (bei Einzelspielen identisch mit der Seite). Verbraucher, die Seiten brauchen, lesen `state.sides`.

---

## File Structure

```
src/game/types.ts          + teams?, SideState, GameState.sides/currentSideId
src/game/sides.ts          NEU  sidesOf, sideOf, buildTeamOrder, isTeamGame, isValidTeamConfig, sideName
src/game/start.ts          NEU  drawStart, rematchConfig
src/game/events.ts         NEU  ThrowEvent, describeThrow
src/game/turns.ts          + newSideState, mirrorSides
src/game/x01.ts, cricket.ts, free.ts   rechnen pro Seite
src/game/progress.ts, stats.ts         Seiten-ID bzw. Siegerseite
src/store/store.ts, storage.ts         Team-Validierung, startGame(config, options)
src/ui/draw.ts             NEU  armDraw, consumeDraw, drawSequence, showDrawOverlay
src/ui/fx.ts               NEU  Effekt-Schicht
src/ui/components/scoreboard.ts, summary.ts, keypad.ts   Seiten, Stempel, Ursprung merken
src/ui/screens/newGame.ts, game.ts, finished.ts, history.ts
src/styles/base.css        Team-Zeilen, Overlay, Effekt-Klassen
tests/game/sides.test.ts, start.test.ts, events.test.ts
tests/ui/draw.test.ts, fx.test.ts, summary.test.ts
```

## Gemeinsame Typen (Referenz)

Neu bzw. geändert (Task 1 und 2):

```ts
// types.ts
export interface GameConfig { /* bisher */ teams?: [string[], string[]] }
export interface SideState { sideId: string; playerIds: string[]; score: number; marks: Record<number, number> }
export interface GameState { /* bisher: players, currentPlayerId, turnDarts, round, winnerId, bust */
  sides: SideState[];        // in Startreihenfolge (Einzelspiel: in playerIds-Reihenfolge)
  currentSideId: string;     // Seite des Werfers
  // winnerId ist jetzt die Seiten-ID (Einzelspiel: Spieler-ID wie bisher)
}
// sides.ts
export interface Side { id: string; playerIds: string[] }
export const teamSideId: (index: 0 | 1) => string;                       // 'team:0' | 'team:1'
export function sidesOf(config: GameConfig): Side[];
export function sideOf(config: GameConfig, playerId: string): string;
export function buildTeamOrder(teams: [string[], string[]]): string[];   // [t0[0], t1[0], t0[1], t1[1]]
export function isTeamGame(config: GameConfig): boolean;
export function isValidTeamConfig(config: GameConfig): boolean;
export function sideName(game: Pick<Game, 'config' | 'playerNames'>, sideId: string): string;
// start.ts
export function drawStart(config: GameConfig, random?: () => number): GameConfig;
export function rematchConfig(config: GameConfig): GameConfig;
// events.ts
export type ThrowEvent =
  | { kind: 'points'; value: number } | { kind: 'triple' } | { kind: 'double' } | { kind: 'bull' }
  | { kind: 'oneEighty' } | { kind: 'bust' } | { kind: 'closed'; field: number } | { kind: 'win' };
export function describeThrow(config: GameConfig, before: GameState, dart: Dart, after: GameState): ThrowEvent[];
```

---

### Task 1: Seiten-Helfer und Team-Konfiguration

**Files:**
- Create: `src/game/sides.ts`
- Modify: `src/game/types.ts` (`GameConfig.teams?`)
- Test: `tests/game/sides.test.ts`

**Interfaces:**
- Consumes: bestehende Typen
- Produces: alles aus `sides.ts` laut „Gemeinsame Typen“

Regeln: `sidesOf` liefert bei Einzelspielen eine Seite je Spieler (`id` = Spieler-ID), bei Teams `[{id:'team:0', playerIds: teams[0]}, {id:'team:1', playerIds: teams[1]}]`. `isValidTeamConfig` ist true nur bei `playerIds.length === 4`, zwei Teams mit je 2 Strings, alle 4 IDs verschieden und `playerIds` gleich `buildTeamOrder(teams)`; bei Configs ohne `teams` ist es false. `sideName` verbindet bei Teams die Namen aus `playerNames` mit „ & “, sonst der Name des Spielers.

- [ ] **Step 1: Failing tests schreiben** (`sides.test.ts`, Konfigurationen `solo = {mode:'x01', playerIds:['a','b','c']}` und `team = {mode:'x01', playerIds:['a','c','b','d'], teams:[['a','b'],['c','d']]}`)
  - `'sidesOf liefert Spieler als Seiten'`, `'sidesOf liefert zwei Team-Seiten in Startreihenfolge'`
  - `'sideOf ordnet Spieler ihrer Seite zu'`: `sideOf(team,'d') === 'team:1'`, `sideOf(solo,'b') === 'b'`
  - `'buildTeamOrder verschränkt die Teams'`: `[['a','b'],['c','d']]` → `['a','c','b','d']`
  - `'isTeamGame'` true/false
  - `'isValidTeamConfig akzeptiert eine korrekte Konfiguration'` und lehnt ab: falsche Reihenfolge, Team mit 3 Spielern, doppelte ID, Config ohne `teams`
  - `'sideName verbindet Teamnamen mit &'`: `'Anna & Ben'`; Einzelspieler `'Anna'`
- [ ] **Step 2: Test laufen lassen, muss fehlschlagen**

Run: `npm test -- tests/game/sides.test.ts` — Expected: FAIL (Modul fehlt).
- [ ] **Step 3: `sides.ts` implementieren und `teams?` in `GameConfig` ergänzen**
- [ ] **Step 4: Test laufen lassen, muss bestehen**

Run: `npm test` — Expected: alle PASS (72 alt plus neue).
- [ ] **Step 5: Commit**

```bash
git add src/game tests/game/sides.test.ts
git commit -m "feat: add side helpers and team config"
```

### Task 2: Zustand pro Seite in X01, Cricket und Frei

**Files:**
- Modify: `src/game/types.ts`, `src/game/turns.ts`, `src/game/x01.ts`, `src/game/cricket.ts`, `src/game/free.ts`
- Test: `tests/game/x01.test.ts`, `tests/game/cricket.test.ts`, `tests/game/free.test.ts` (neue Fälle anhängen)

**Interfaces:**
- Consumes: `sidesOf`, `sideOf` aus Task 1
- Produces: `SideState`, `GameState.sides`, `GameState.currentSideId` (Referenz oben); `newSideState(sideId: string, playerIds: string[], score?: number): SideState` und `mirrorSides(config: GameConfig, players: PlayerState[], sides: SideState[]): void` in `turns.ts`

Regeln: Jeder Modus führt `SideState` je Seite und `PlayerState` je Person. Punkte und Runden für die Statistik (`pointsScored`, `turnsPlayed`) gehen an den werfenden Spieler. Der Stand (`score`, `marks`) gehört der Seite, wird am Ende der Berechnung per `mirrorSides` in die `PlayerState`s der Mitglieder gespiegelt. X01: Rundenanfangsstand ist der Seitenstand zu Beginn der Aufnahme, Bust setzt die Seite darauf zurück. Cricket: Gegner eines Darts sind alle anderen **Seiten**, Sieg wenn die eigene Seite alle 7 Felder geschlossen hat und mindestens so viele Punkte wie jede andere Seite. `winnerId` und `currentSideId` sind Seiten-IDs. Ein Dart eines Werfers außer der Reihe wirft wie bisher einen `Error`.

- [ ] **Step 1: Failing tests schreiben** (mit `team = {mode, playerIds:['a','c','b','d'], teams:[['a','b'],['c','d']]}`; ein Testhelfer `turn(id, ...darts)` füllt jede Aufnahme mit Miss auf drei Darts auf, damit die Reihenfolge a, c, b, d stimmt)
  - X01 (`start: 301`, ohne Double-Out): `'Team: gemeinsamer Rest und Wurfreihenfolge'` (a T20,T20,T20 → `sides[0].score === 121`, `currentPlayerId === 'c'`, `currentSideId === 'team:1'`; c dreimal Miss → `currentPlayerId === 'b'`, `currentSideId === 'team:0'`; b wirft 20 → `sides[0].score === 101`), `'Runde zählt nach allen vier Aufnahmen'` (nach a, c, b, d: `round === 2`, `currentPlayerId === 'a'`), `'Team: Bust setzt auf den Aufnahmeanfang des Werfers zurück'` (Start 40 mit Double-Out: Aufnahme a = D10, Miss, Miss → Rest 20; Aufnahme c = Miss×3; b wirft T20 → Bust, `sides[0].score === 20`, `currentPlayerId === 'd'`), `'Team: Sieg meldet die Seite'` (Start 40, Double-Out: a D20 → `winnerId === 'team:0'`, `sides[0].score === 0`), `'Team: Statistik pro Spieler'` (a 60, b 0 `pointsScored`, `players[0].score` spiegelt `sides[0].score`), `'Einzelspiel: Seiten entsprechen Spielern'` (`sides.map(s => s.sideId)` gleich `['a','b']`, `currentSideId === currentPlayerId`).
  - Cricket: `'Team: Marks gehören dem Team'` (Aufnahme a = T20, Miss, Miss; c = Miss×3; b wirft 20 → `sides[0].marks[20] === 3`, `sides[0].score === 20`), `'Team: keine Punkte, wenn die Gegner-Seite geschlossen hat'` (Aufnahmen a = Miss×3; c = T20, Miss, Miss; b = Miss×3; d = Miss×3; dann a wirft T20 und 20 → `sides[0].score === 0`), `'Team: Sieg mit allen Feldern'` (a T20,T19,T18; c Miss×3; b T17,T16,T15; d Miss×3; a Double-Bull plus Bull → `winnerId === 'team:0'`), `'Team: Rückgängig nach dem Gewinn-Dart'` (ohne letzten Dart `winnerId === null`, `currentPlayerId === 'a'`).
  - Frei: `'Team: gemeinsame Summe'` (a 20,5,1; c Miss×3; b 10 → `sides[0].score === 36`, `players` a `pointsScored` 26, b 10), `'Team: Rückgängig über den Teamwechsel'` (nach den drei Darts von a ist `currentPlayerId === 'c'`, ohne den dritten Dart wieder `'a'` mit 2 Darts in `turnDarts`).
- [ ] **Step 2: Tests laufen lassen, müssen fehlschlagen**

Run: `npm test -- tests/game` — Expected: neue Tests FAIL, alte PASS.
- [ ] **Step 3: `types.ts`, `turns.ts` und die drei Modi auf Seiten umstellen** — je Modus: Seiten aus `sidesOf(config)` bauen, pro Dart `sideOf(config, d.playerId)` nachschlagen, am Ende `mirrorSides`, Rückgabe um `sides` und `currentSideId` ergänzen. Die Regelmodule teilen sich weiter `TurnCursor`.
- [ ] **Step 4: Tests laufen lassen, müssen bestehen**

Run: `npx tsc --noEmit && npm test` — Expected: keine Typfehler (UI-Dateien benutzen bisher nur `players`, das unverändert bleibt), alle PASS.
- [ ] **Step 5: Commit**

```bash
git add src/game tests/game
git commit -m "feat: compute game state per side so teams share one score"
```

### Task 3: Fortschritt, Statistik und Frei-Führender auf Seiten

**Files:**
- Modify: `src/game/progress.ts`, `src/game/stats.ts`, `src/game/free.ts`
- Test: `tests/game/progress.test.ts`, `tests/game/stats.test.ts`, `tests/game/free.test.ts`

**Interfaces:**
- Consumes: `sideOf`, `GameState.sides`
- Produces: `playerProgress(config, state, sideId)` (dritter Parameter ist jetzt eine **Seiten-ID**, bei Einzelspielen gleich der Spieler-ID), `freeLeader(state): string` liefert die **Seiten-ID** des Führenden (erste Seite bei Gleichstand), `playerStats(playerId, games)` zählt Siege über `sideOf(game.config, playerId) === game.winnerId`

- [ ] **Step 1: Failing tests schreiben**
  - `progress`: `'Team: X01-Fortschritt nutzt den Seitenstand'` (Team nach a T20×3 → `playerProgress(team, s, 'team:0') ≈ 180/301`, `'team:1'` 0), `'Team: Cricket-Fortschritt je Seite'`, `'Team Frei: nur die aktuelle Seite zeigt die Aufnahme'`.
  - `free`: `'freeLeader liefert die Seiten-ID bei Teams'` (Team 0 mit mehr Punkten → `'team:0'`).
  - `stats`: `'Team-Sieg zählt für beide Teammitglieder'` (beendetes Team-Spiel, `winnerId: 'team:0'`: a und b `wins === 1`, c und d `wins === 0`, alle `games === 1`), `'Schnitt pro Spieler im Team'` (a 60 Punkte in 1 Runde, b 20 Punkte in 1 Runde → `playerStats('a').avgPerRound === 60`, b 20).
- [ ] **Step 2: Tests laufen lassen, müssen fehlschlagen**

Run: `npm test -- tests/game` — Expected: neue FAIL.
- [ ] **Step 3: Implementieren** — `progress.ts` liest die Seite aus `state.sides`; Frei nutzt `state.currentSideId`.
- [ ] **Step 4: Tests laufen lassen, müssen bestehen**

Run: `npx tsc --noEmit && npm test` — Expected: alle PASS.
- [ ] **Step 5: Commit**

```bash
git add src/game tests/game
git commit -m "feat: progress, stats and free leader work per side"
```

### Task 4: Wurf-Ereignisse

**Files:**
- Create: `src/game/events.ts`
- Test: `tests/game/events.test.ts`

**Interfaces:**
- Consumes: `getMode`, `sideOf`, `CRICKET_FIELDS`, `dartPoints`
- Produces: `ThrowEvent`, `describeThrow` laut Referenz

Regeln und feste Reihenfolge im Ergebnis: `points`, dann Treffer-Art, dann `oneEighty`, dann `closed`, dann `bust`, dann `win`. `points`: X01 und Frei `dartPoints(dart)` wenn > 0 und kein Bust; Cricket die Differenz des Seitenstands (`after` minus `before`) wenn > 0. Treffer-Art: Feld 25 → `bull`, sonst Multiplikator 3 → `triple`, 2 → `double`, Single und Miss nichts. `oneEighty`: Modus X01 oder Frei, `before.turnDarts` hat 2 Darts, beide und der neue Dart sind Triple-20, kein Bust. `closed`: Cricket-Feld, dessen Marks der Seite des Werfers von `< 3` auf `3` gehen. `bust`: `after.bust`. `win`: `before.winnerId === null` und `after.winnerId !== null`.

- [ ] **Step 1: Failing tests schreiben** (Zustände jeweils per `getMode(...).computeState` vor und nach dem letzten Dart)
  - `'Single 20 in X01 meldet nur Punkte'` → `[{kind:'points', value:20}]`
  - `'Triple 20 meldet Punkte und triple'` → `[{points 60}, {triple}]`
  - `'Double 16 meldet Punkte und double'`, `'Double-Bull meldet bull'`, `'Miss meldet nichts'` → `[]`
  - `'dritte Triple 20 meldet oneEighty'` (X01 und Frei), `'zwei Triple 20 und ein Single meldet kein oneEighty'`
  - `'Bust meldet nur bust und triple, keine Punkte'` (Start 40, T20)
  - `'Sieg meldet win'` (Start 40 mit Double-Out, D20 → `points`, `double`, `win`)
  - `'Cricket: Schließen meldet closed'` (T20 → `triple`, `closed 20`, keine Punkte), `'Cricket: Punkte über Marks'` (zweiter 20er → `points 20`), `'Cricket: bereits geschlossenes Feld meldet kein closed'`
  - `'Team: closed gehört der Seite des Partners'` (a T20, später b 20 → kein erneutes `closed`)
- [ ] **Step 2: Test laufen lassen, muss fehlschlagen**

Run: `npm test -- tests/game/events.test.ts` — Expected: FAIL.
- [ ] **Step 3: `describeThrow` implementieren**
- [ ] **Step 4: Tests laufen lassen, müssen bestehen**

Run: `npm test` — Expected: alle PASS.
- [ ] **Step 5: Commit**

```bash
git add src/game/events.ts tests/game/events.test.ts
git commit -m "feat: derive throw events for animations"
```

### Task 5: Auslosung und Revanche

**Files:**
- Create: `src/game/start.ts`
- Test: `tests/game/start.test.ts`

**Interfaces:**
- Consumes: `buildTeamOrder`, `isValidTeamConfig`, `isTeamGame`
- Produces: `drawStart`, `rematchConfig` laut Referenz

Regeln: `drawStart` mutiert die Eingabe nicht und liefert eine neue Config. Teams: `random() < 0.5` lässt alles, sonst werden die Teams getauscht (`teams = [t1, t0]`, `playerIds = buildTeamOrder(neu)`). Einzelspiele: `k = Math.floor(random() * n)`, `playerIds` um `k` nach links rotiert. `rematchConfig`: Teams tauschen (anderes Team beginnt), Einzelspiele rotieren um 1 wie bisher (erster Spieler rückt ans Ende).

- [ ] **Step 1: Failing tests schreiben**
  - `'Teams: random unter 0.5 lässt die Reihenfolge'`, `'Teams: random ab 0.5 tauscht die Teams'` (`teams` gleich `[['c','d'],['a','b']]`, `playerIds` gleich `['c','a','d','b']`)
  - `'Einzel: random 0 lässt die Reihenfolge, 0.5 rotiert um 1, 0.99 um 2'` (drei Spieler `a,b,c` → `['a','b','c']`, `['b','c','a']`, `['c','a','b']`)
  - `'drawStart mutiert die Eingabe nicht'` und `'drawStart liefert gültige Team-Konfigurationen'` (`isValidTeamConfig` true)
  - `'Revanche tauscht bei Teams die Startreihenfolge'`, `'Revanche rotiert Einzelspieler um 1'`
- [ ] **Step 2: Test laufen lassen, muss fehlschlagen**

Run: `npm test -- tests/game/start.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implementieren**
- [ ] **Step 4: Tests laufen lassen, müssen bestehen**

Run: `npm test` — Expected: alle PASS.
- [ ] **Step 5: Commit**

```bash
git add src/game/start.ts tests/game/start.test.ts
git commit -m "feat: add random start draw and rematch config"
```

### Task 6: Store und Speicher für Teams

**Files:**
- Modify: `src/store/store.ts`, `src/store/storage.ts`
- Test: `tests/store/store.test.ts`, `tests/store/storage.test.ts`

**Interfaces:**
- Consumes: `drawStart`, `isValidTeamConfig`, `isTeamGame`
- Produces: `startGame(config: GameConfig, options?: { randomStart?: boolean; random?: () => number }): Game`; `throwDart` und `undoDart` arbeiten unverändert, `finishGame(winnerId)` erhält eine **Seiten-ID**

Regeln: `startGame` wendet zuerst `drawStart(config, options.random)` an, wenn `options.randomStart` gesetzt ist, und prüft dann: bei Teams `isValidTeamConfig` (sonst `Error`), sonst 2 bis 8 verschiedene Spieler wie bisher. Der Namens-Snapshot enthält alle Spieler. In `storage.ts` ist eine Config mit `teams` nur gültig, wenn `isValidTeamConfig` sie akzeptiert, sonst wie bisher leere Daten plus Hinweis.

- [ ] **Step 1: Failing tests schreiben**
  - `store`: `'startGame verlangt für Teams genau 4 Spieler in gültiger Reihenfolge'` (3 Spieler mit `teams` wirft, falsche Reihenfolge wirft), `'startGame mit randomStart tauscht die Teams per injiziertem random'` (`random: () => 0.9` → `game.config.teams[0]` ist das ursprüngliche Team 2, `playerIds[0]` dessen erster Spieler), `'Einzel mit randomStart rotiert die Reihenfolge'`, `'Team: Darts gehen reihum an a, c, b, d'` (vier Aufnahmen, `game.darts.map(d => d.playerId)` stimmt), `'Team: Rückgängig über Spielerwechsel und Teamwechsel'`, `'Rückgängig ändert die Auslosung nicht'`, `'Team: Neuladen stellt Spiel und Reihenfolge wieder her'`, `'Team-Spieler im laufenden Spiel lassen sich nicht löschen'`.
  - `storage`: `'liest ein gültiges Team-Spiel'`, `'liefert leere Daten und Warnung bei falscher Team-Reihenfolge'`, `'… bei Team mit drei Spielern'`, `'… wenn teams Spieler enthält, die nicht in playerIds stehen'`.
- [ ] **Step 2: Tests laufen lassen, müssen fehlschlagen**

Run: `npm test -- tests/store` — Expected: neue FAIL.
- [ ] **Step 3: `store.ts` und `storage.ts` anpassen**
- [ ] **Step 4: Tests laufen lassen, müssen bestehen**

Run: `npx tsc --noEmit && npm test` — Expected: alle PASS.
- [ ] **Step 5: Commit**

```bash
git add src/store tests/store
git commit -m "feat: validate team games in store and storage, add random start"
```

### Task 7: Neues-Spiel-Screen mit Teams und zufälligem Start

**Files:**
- Modify: `src/ui/screens/newGame.ts`, `src/styles/base.css`
- Create: `src/ui/draw.ts` (nur `armDraw`/`consumeDraw`, der Rest folgt in Task 9)

**Interfaces:**
- Consumes: `startGame(config, options)`, `buildTeamOrder`, `isTeamGame`
- Produces: `armDraw(): void` und `consumeDraw(): boolean` in `src/ui/draw.ts` (Modul-Flag; `consumeDraw` liefert den Wert und setzt ihn zurück)

Verhalten: Schalter „Teams (2 gegen 2)“ (`aria-pressed`) und darunter „Zufälliger Start“. Teams an: „Zufälliger Start“ ist an und deaktiviert, „Spiel starten“ verlangt genau 4 Spieler, Hinweis „Wähle 4 Spieler für 2 gegen 2.“, die Zeilen zeigen zusätzlich „Team 1“ (Auswahl 1 und 2) bzw. „Team 2“ (Auswahl 3 und 4), bei mehr als 4 Spielern sind weitere gesperrt. Teams aus: bisheriges Verhalten (2 bis 8). Beim Start baut der Screen für Teams `teams: [[s0,s1],[s2,s3]]` und `playerIds: buildTeamOrder(teams)`, ruft `armDraw()` falls ausgelost wird und dann `startGame(config, { randomStart })` (Teams immer `true`, Einzel je nach Schalter).

- [ ] **Step 1: Screen umbauen** (Schalter, Zeilen-Labels, Startlogik, `armDraw`)
- [ ] **Step 2: Im Browser prüfen**

Run: `npm run dev`, Viewport 390×844. Expected: Teams an zeigt Team 1/2 an den ersten vier Antipp-Zeilen, „Spiel starten“ erst bei genau 4, fünfter Spieler gesperrt, Einzelspiel unverändert. Keine Konsolenfehler.
- [ ] **Step 3: Tests und Build**

Run: `npx tsc --noEmit && npm test` — Expected: PASS.
- [ ] **Step 4: Commit**

```bash
git add src/ui src/styles
git commit -m "feat: add team and random start options to new game screen"
```

### Task 8: Seiten und Teams im Spielscreen, Ende und Verlauf

**Files:**
- Modify: `src/ui/components/scoreboard.ts`, `src/ui/components/summary.ts`, `src/ui/screens/game.ts`, `src/ui/screens/finished.ts`, `src/ui/screens/history.ts`, `src/styles/base.css`
- Test: `tests/ui/summary.test.ts` (`// @vitest-environment jsdom`)

**Interfaces:**
- Consumes: `GameState.sides`, `sideName`, `playerProgress(config, state, sideId)`, `rematchConfig`, `isTeamGame`
- Produces: `renderSummary(game: Game): HTMLElement` stellt Team-Spiele wie unten dar

Verhalten: Scoreboard und aktive Karte laufen über `state.sides` (Name per `sideName`, Reihenfolge der Leiste ab der nächsten Seite, Ring und Marks je Seite, Ring-Schlüssel mit Seiten-ID). Bei Teams steht unter dem Seitennamen „<Werfer> wirft“. Ende-Screen: „<Name> gewinnt“ (Einzel) bzw. „<Name> gewinnen“ (Team); Revanche über `rematchConfig`. Verlauf: Spielerliste „<Team 1> gegen <Team 2>“, „Sieger: <Seitenname>“. Zusammenfassung bei Teams: je Team eine Kopfzeile (Name, Badge „Sieger“) und darunter die zwei Spieler mit Runden, Punkte, Ø pro Runde; Cricket-Teams eine Zeile je Team mit „Geschlossen“ und „Punkte“. Einzelspiele bleiben wie bisher.

- [ ] **Step 1: Failing Test schreiben** (`summary.test.ts`): `'Team X01: Kopfzeile je Team und Spielerzeilen darunter'` (Zeilenzahl 2 + 4, Kopfzeile des Siegerteams enthält „Sieger“), `'Team Cricket: eine Zeile je Team mit Geschlossen und Punkte'`, `'Einzelspiel bleibt unverändert (eine Zeile je Spieler)'`.
- [ ] **Step 2: Test laufen lassen, muss fehlschlagen**

Run: `npm test -- tests/ui/summary.test.ts` — Expected: FAIL.
- [ ] **Step 3: Scoreboard, Summary, Game, Finished, History umstellen**
- [ ] **Step 4: Tests laufen lassen**

Run: `npx tsc --noEmit && npm test` — Expected: alle PASS.
- [ ] **Step 5: Im Browser prüfen**

Je ein Team-Spiel in X01, Cricket und Frei bei 390×844 durchspielen (inkl. Rückgängig, Neuladen mittendrin, Sieg, Revanche, Verlauf). Expected: gemeinsamer Stand, Werferzeile wechselt a, c, b, d, Siegerteam korrekt, Revanche lässt das andere Team beginnen, Verlauf zeigt „A & B gegen C & D“, kein horizontales Scrollen, Tasten ≥ 48 px.
- [ ] **Step 6: Commit**

```bash
git add src tests
git commit -m "feat: show sides and teams in game, finish and history screens"
```

### Task 9: „Wer beginnt?“-Overlay

**Files:**
- Modify: `src/ui/draw.ts`, `src/ui/screens/game.ts`, `src/styles/base.css`
- Test: `tests/ui/draw.test.ts` (`// @vitest-environment jsdom`)

**Interfaces:**
- Consumes: `armDraw`/`consumeDraw` (Task 7), `sidesOf`, `sideName`, `motionAllowed` (Task 10; bis dahin lokal über `matchMedia`)
- Produces: `drawSequence(count: number, winnerIndex: number, steps?: number): number[]` (Länge `steps`, Standard 16, letzter Eintrag `winnerIndex`, alle Werte `< count`, ohne direkte Wiederholung zweier gleicher Indizes hintereinander, wenn `count > 1`), `showDrawOverlay(names: string[], verb: 'beginnt' | 'beginnen', onDone: () => void): HTMLElement`

Verhalten: Der Spielscreen ruft beim Rendern eines Spiels mit `game.darts.length === 0` `consumeDraw()`; liefert es `true`, zeigt er das Overlay mit den Seitennamen in der Startreihenfolge der Config (Gewinner ist Index 0, also die erste Seite). Das Overlay hängt am `body` (überlebt Neuzeichnen), deckt die Tastatur ab, läuft `drawSequence` mit wachsendem Abstand (ca. 60 ms bis 220 ms, insgesamt ca. 1,8 s), hebt den Gewinner 0,7 s hervor („Anna & Ben beginnen“ / „Anna beginnt“), blendet aus und ruft `onDone`. Tippen springt sofort zum Ende. Bei „Bewegung reduzieren“ keine Läufe, das Ergebnis steht 1,2 s. Nichts wird gespeichert, nach Neuladen ist das Flag weg.

- [ ] **Step 1: Failing tests schreiben**
  - `'drawSequence endet beim Gewinner'` (mehrere Gewinner-Indizes, `count` 2 bis 8), `'drawSequence bleibt im Bereich und wiederholt keinen Index direkt'`, `'drawSequence hat die gewünschte Länge'`
  - `'armDraw und consumeDraw: einmaliges Flag'` (zweites `consumeDraw()` liefert `false`)
  - `'showDrawOverlay hängt am body, trägt den Gewinnernamen und entfernt sich nach onDone'` (Fake-Timer, `matchMedia` auf „reduce“ gestellt für den Kurzpfad)
- [ ] **Step 2: Tests laufen lassen, müssen fehlschlagen**

Run: `npm test -- tests/ui/draw.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implementieren und im Spielscreen einhängen**
- [ ] **Step 4: Tests und Build**

Run: `npx tsc --noEmit && npm test && npm run build` — Expected: PASS.
- [ ] **Step 5: Im Browser prüfen**

Team-Spiel und Einzelspiel mit „Zufälliger Start“ starten. Expected: Overlay erscheint genau einmal, landet auf dem Startteam bzw. -spieler, Tastatur ist währenddessen nicht bedienbar, Tippen überspringt, Neuladen zeigt es nicht erneut, der erste Werfer entspricht dem Ergebnis.
- [ ] **Step 6: Commit**

```bash
git add src tests
git commit -m "feat: add who-starts draw overlay"
```

### Task 10: Effekt-Schicht

**Files:**
- Create: `src/ui/fx.ts`
- Test: `tests/ui/fx.test.ts` (`// @vitest-environment jsdom`)

**Interfaces:**
- Consumes: `ThrowEvent` (Task 4)
- Produces (alles aus `src/ui/fx.ts`): `motionAllowed(): boolean`, `rememberOrigin(el: Element): void`, `takeOrigin(): DOMRect | null`, `haptic(pattern: number | number[]): void`, `clearFx(): void`, `flyText(text: string, from: DOMRect | null, to: Element, tone?: 'default' | 'bad'): void`, `banner(text: string): void`, `confetti(): void`, `playEffects(events: ThrowEvent[], ctx: { mode: ModeId; ring: Element | null; origin: DOMRect | null }): void`

Verhalten: Alle sichtbaren Effekte hängen in einer Ebene `.fx-layer` am `body` (`position: fixed; inset: 0; pointer-events: none`), `clearFx()` leert sie. `motionAllowed()` ist `false`, wenn `matchMedia` fehlt oder „reduce“ meldet. `playEffects` ruft zuerst `clearFx()` und tut bei `!motionAllowed()` nichts außer Haptik. Zuordnung: `points` → `flyText('+N', origin, ring)` (ohne `origin` Start in der Bildschirmmitte); `bust` → `flyText('Bust', …, 'bad')`, Klasse `shake` plus `flash-bad` am Ring, Haptik 40; `triple` → Klasse `glow-green` am Ring, Haptik 15; `double` → `glow-red`; `bull` → `glow-cream`; `oneEighty` → `banner('180!')` plus `confetti()`, Haptik `[20,40,20]`; `win` → X01 `banner('Checkout!')`, sonst `banner('Sieg!')`, plus `confetti()`, Haptik `[20,40,20]`. Ring-Klassen werden nach `animationend` bzw. nach 450 ms entfernt. `flyText` nutzt `Element.animate` (550 ms, Bewegung zur Ringmitte, Ausblenden), fehlt `animate`, wird nur angezeigt und per Timeout entfernt. `confetti` zeichnet ca. 60 Partikel in Rot, Grün, Creme auf ein Canvas (1,6 s), liefert `getContext('2d')` `null`, endet es still.

- [ ] **Step 1: Failing tests schreiben**
  - `'motionAllowed ist false bei prefers-reduced-motion und wenn matchMedia fehlt'`
  - `'playEffects erzeugt bei reduzierter Bewegung keine Overlay-Elemente, ruft aber Haptik'` (`navigator.vibrate` als Spy)
  - `'oneEighty erzeugt Banner und Canvas in der fx-Ebene'` (`HTMLCanvasElement.prototype.getContext` auf `null` gestellt)
  - `'points ohne Ursprung wirft nicht und erzeugt einen fliegenden Text'`, `'fehlendes Element.animate wirft nicht'`
  - `'triple setzt glow-green am Ring und entfernt es nach 450 ms'` (Fake-Timer), `'bust setzt shake und flash-bad'`
  - `'zweiter playEffects-Aufruf räumt die alten Overlays weg'`
  - `'rememberOrigin und takeOrigin geben das Rechteck einmalig zurück'`
  - `'haptic ohne navigator.vibrate wirft nicht'`
- [ ] **Step 2: Tests laufen lassen, müssen fehlschlagen**

Run: `npm test -- tests/ui/fx.test.ts` — Expected: FAIL.
- [ ] **Step 3: `fx.ts` implementieren und die zugehörigen CSS-Klassen in `base.css` anlegen** (`.fx-layer`, `.fx-float`, `.fx-banner`, `.shake`, `.flash-bad`, `.glow-green`, `.glow-red`, `.glow-cream` als kurze Keyframe-Animationen mit den Dauern aus den Global Constraints)
- [ ] **Step 4: Tests laufen lassen, müssen bestehen**

Run: `npx tsc --noEmit && npm test` — Expected: alle PASS.
- [ ] **Step 5: Commit**

```bash
git add src tests
git commit -m "feat: add animation effects layer"
```

### Task 11: Animationen im Spielscreen verdrahten

**Files:**
- Modify: `src/ui/components/keypad.ts`, `src/ui/components/scoreboard.ts`, `src/ui/screens/game.ts`, `src/ui/screens/finished.ts`, `src/styles/base.css`

**Interfaces:**
- Consumes: `describeThrow`, `playEffects`, `rememberOrigin`, `takeOrigin`, `confetti`, `getMode`
- Produces: keine neuen öffentlichen Funktionen; `createKeypad(onDart, onUndo)` behält seine Signatur (die Tests bleiben gültig)

Verhalten:
- **Keypad:** Beim Tippen ruft `press` vor `onDart` `rememberOrigin(button)`.
- **Spielscreen:** Merkt pro Spiel `lastCount` (Dart-Anzahl) und `lastSide` (Seiten-ID des Werfers) in Modul-Maps. Beim Rendern: kam genau ein Dart dazu, berechnet er `before` mit `getMode(...).computeState(config, darts.slice(0, -1))`, `events = describeThrow(config, before, lastDart, state)` und ruft `playEffects(events, { mode, ring, origin: takeOrigin() })`. Beim ersten Rendern, bei Rückgängig und bei Seitenwechsel gibt es keine Effekte. Ist `state.currentSideId !== lastSide` (und es gab einen neuen Dart), bekommt die aktive Karte die Klasse `slide-in` (280 ms von rechts).
- **Scoreboard:** Der neueste Dart-Chip der Aufnahme bekommt `pop` (220 ms, 0.6 → 1.1 → 1), wenn ein Dart dazukam. Neu geschlossene Cricket-Marks (Marks der Seite stiegen gegenüber der zuletzt gezeigten Anzeige, Map `lastMarks` je Seite und Feld) bekommen am Glyph die Klasse `stamp` (400 ms, 2 → 1 mit leichter Drehung).
- **Ende-Screen:** Zeigt ein Spiel mit Sieger zum ersten Mal (Modul-Set `celebrated` mit Spiel-ID) `confetti()` (nur wenn `motionAllowed()`), nicht beim Neuladen derselben Seite.

- [ ] **Step 1: Verdrahtung und CSS** (`.pop`, `.stamp`, `.slide-in` als Keyframes, bei „Bewegung reduzieren“ greift die bestehende Regel)
- [ ] **Step 2: Tests und Build**

Run: `npx tsc --noEmit && npm test && npm run build` — Expected: alle PASS (Keypad-Tests unverändert grün).
- [ ] **Step 3: Im Browser prüfen**

Bei 390×844: X01 mit Triple 20 (Chip springt, „+60“ fliegt von der Taste zum Ring, grünes Leuchten), dreimal Triple 20 (Banner „180!“ plus Konfetti), Bust (Ring wackelt, rotes „Bust“), Checkout (Banner und Konfetti, auf dem Ende-Screen Konfetti), Cricket Feld schließen (Stempel), Spielerwechsel (Karte gleitet ein). Neuladen mitten im Spiel und Rückgängig lösen keinen Effekt aus. Zehn Eingaben hintereinander schnell tippen: keine hängenden Overlays, keine Konsolenfehler. Mit emuliertem „Bewegung reduzieren“ passiert nichts außer Haptik.
- [ ] **Step 4: Commit**

```bash
git add src
git commit -m "feat: animate dart input with chips, flying points, ring effects and confetti"
```

### Task 12: Abschluss, README und Veröffentlichung

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: alles Vorherige
- Produces: aktualisierte Dokumentation, veröffentlichte App

- [ ] **Step 1: README aktualisieren** — Abschnitt „Spielmodi“ um „Team-Spiel 2 gegen 2“ und „Zufälliger Start“ ergänzen, Hinweis auf Animationen und „Bewegung reduzieren“.
- [ ] **Step 2: Gesamtprüfung**

Run: `npx tsc --noEmit && npm test && npm run build` — Expected: alles grün, Build ohne Fehler.
- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: document teams, random start and animations"
```

- [ ] **Step 4: Veröffentlichen (nur nach Bestätigung)**

`git push` auf `main` veröffentlicht die neue Version sofort über den Workflow. Vorher den Nutzer fragen, nichts ohne ausdrückliches Ja pushen. Danach den Workflow-Lauf prüfen (`gh run list`, `gh run watch`) und die Seite auf `https://nicgeh217-dev.github.io/dart-tracker/` abrufen.
