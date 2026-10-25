# Dart-Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine mobile-first, offline-fähige Darts-Webapp (X01, Cricket, Freies Zählen) mit Spielerverwaltung und Verlauf, gehostet auf GitHub Pages.

**Architecture:** Reine, UI-freie Spiellogik in `src/game/`, die den Spielstand immer aus einem Event-Log von Darts neu berechnet (`computeState(config, darts)`). Ein kleiner Store in `src/store/` hält Spieler, laufendes Spiel und Verlauf und speichert nach jeder Änderung in `localStorage`. Die UI in `src/ui/` besteht aus Screens als Funktionen `(root, params) => void` und einem Hash-Router, ohne Framework.

**Tech Stack:** Vite, TypeScript, Vitest (+ jsdom für UI-Tests), vite-plugin-pwa, @fontsource/big-shoulders-display, @fontsource/instrument-sans, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-25-dart-tracker-design.md`

## Global Constraints

- UI-Texte auf Deutsch, Satzschreibweise, aktive Verben („Spiel starten“, „Spieler hinzufügen“). Eine Aktion heißt überall gleich.
- Farben: Schiefer `#232B27` (Hintergrund), Schiefer hell `#2F3934` (Flächen/aktiver Spieler), Kreide `#ECE9DD` (Text), Kreide gedämpft `#9AA397` (Nebeninfos), Board-Rot `#C93A2E` (Double, Fehler, Bust), Board-Grün `#3F8A5A` (Triple, Bestätigung, Sieg). Als CSS-Variablen in `src/styles/tokens.css`.
- Schrift: Big Shoulders Display (Bold/ExtraBold, tabellarische Ziffern) für Stände und Überschriften, Instrument Sans für Bedienelemente und Text. Skala: aktiver Stand 96 px, übrige Stände 40 px, Überschriften 28 px, Text 16 px, Nebeninfos 14 px.
- Schriften über `@fontsource`, nie von Google Fonts (Offline-Betrieb).
- Tasten mindestens 48 px, sichtbarer Tastaturfokus, Textkontrast mindestens 4.5:1, Rot und Grün tragen nie allein die Bedeutung (Double/Triple zusätzlich beschriftet).
- Flächen flach: ein einheitlicher Radius, keine Schatten, keine Verläufe. Bewegung nur als Antwort auf Eingaben (Kreide-Wisch beim Stand-Update), `prefers-reduced-motion` wird respektiert.
- 2 bis 8 Spieler pro Spiel. Modi: X01 (301/501, optional Double-Out), Cricket, Frei. Kein Around the Clock.
- Persistenz nur in `localStorage`, kein Backend. Vite-`base` kommt aus `VITE_BASE`.
- Kein UI-Framework, `src/game/` importiert nie aus `src/store/` oder `src/ui/`.

## Review Focus

- Rückgängig über Rundengrenzen, nach Bust und nach dem Gewinn-Dart: Spielerwechsel, Stand und Gewinner werden korrekt zurückgesetzt (Tests in Task 2, 3 und 6).
- Checkout mit Bull: Double-Bull (50) beendet X01 mit Double-Out, Single-Bull (25) bei Rest 25 nicht (Task 2).
- Beschädigtes oder fehlendes `localStorage`: App startet leer und zeigt einen Hinweis statt abzustürzen (Task 6).
- Spielernamen: leer, nur Leerzeichen und Dubletten werden abgelehnt. Ein gelöschter Spieler bleibt im Verlauf mit seinem Namen sichtbar, ein Spieler im laufenden Spiel lässt sich nicht löschen (Task 6).
- Neuladen mitten im Spiel stellt das laufende Spiel mit allen Darts wieder her (Task 6).

---

## File Structure

```
index.html
package.json, tsconfig.json, vite.config.ts
public/icon.svg, public/icon-192.png, public/icon-512.png
src/main.ts                    App-Start, Router, Store-Anbindung
src/styles/tokens.css          Farben, Schriftgrößen, Radius
src/styles/base.css            Reset, Typografie, Buttons, Layout
src/game/types.ts              gemeinsame Typen + isValidDart
src/game/x01.ts, cricket.ts, free.ts
src/game/modes.ts              getMode(modeId)
src/game/stats.ts              playerStats
src/store/storage.ts           loadData/saveData
src/store/store.ts             App-Zustand und Aktionen
src/ui/router.ts               Hash-Router
src/ui/screens/start.ts, players.ts, newGame.ts, game.ts, finished.ts, history.ts
src/ui/components/keypad.ts, scoreboard.ts
tests/helpers.ts
tests/game/*.test.ts, tests/store/*.test.ts, tests/ui/keypad.test.ts
.github/workflows/deploy.yml
README.md
```

## Gemeinsame Typen (Referenz für alle Tasks)

Definiert in Task 2 (`src/game/types.ts`, inklusive der persistierten Typen unten), von allen späteren Tasks benutzt:

```ts
export type Multiplier = 1 | 2 | 3;
export type Field = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 25; // 0 = Miss, 25 = Bull
export interface Dart { playerId: string; field: Field; multiplier: Multiplier }
export type ModeId = 'x01' | 'cricket' | 'free';
export interface GameConfig { mode: ModeId; playerIds: string[]; x01?: { start: 301 | 501; doubleOut: boolean } }
export interface PlayerState {
  playerId: string;
  score: number;                  // X01: Rest, Cricket: Punkte, Frei: Summe
  marks: Record<number, number>;  // nur Cricket: Felder 15–20 und 25, je 0–3
  pointsScored: number;           // gezählte Punkte (Bust-Runden zählen 0)
  turnsPlayed: number;            // Runden mit mindestens einem Dart
}
export interface GameState {
  players: PlayerState[];         // in Reihenfolge von config.playerIds
  currentPlayerId: string;
  turnDarts: Dart[];              // Darts der laufenden Runde (0–2 vor dem nächsten Dart)
  round: number;                  // 1-basiert
  winnerId: string | null;
  bust: boolean;                  // der letzte Dart hat die Runde als Bust beendet
}
export interface GameMode { computeState(config: GameConfig, darts: Dart[]): GameState }
```

Persistierte Typen (ebenfalls in `src/game/types.ts` definiert, damit `src/game/` nie aus `src/store/` importiert; `src/store/store.ts` re-exportiert sie):

```ts
export interface Player { id: string; name: string }
export interface Game { id: string; config: GameConfig; playerNames: Record<string, string>; darts: Dart[]; startedAt: number; finishedAt: number | null; winnerId: string | null }
export interface AppData { players: Player[]; activeGame: Game | null; history: Game[] }
```

---

### Task 1: Projekt-Gerüst

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/styles/tokens.css`, `src/styles/base.css`, `tests/smoke.test.ts`, `.gitignore`
- Test: `tests/smoke.test.ts`

**Interfaces:**
- Consumes: nichts
- Produces: lauffähiges Vite+TS-Projekt mit Skripten `dev`, `build`, `test` und den CSS-Variablen aus Global Constraints

- [ ] **Step 1: Git-Repo anlegen und Vite-Projekt von Hand aufsetzen**

`git init` im Projektordner. `package.json` mit Skripten `dev` (vite), `build` (`tsc --noEmit && vite build`), `test` (vitest run). Dev-Dependencies: `vite`, `typescript`, `vitest`, `jsdom`. Dependencies: `@fontsource/big-shoulders-display`, `@fontsource/instrument-sans`. `tsconfig.json` mit `strict: true`, `target: ES2022`, `moduleResolution: bundler`. `vite.config.ts` setzt `base: process.env.VITE_BASE ?? '/'`.

- [ ] **Step 2: Failing smoke test schreiben**

`tests/smoke.test.ts`: `it('lädt die Farb-Tokens', ...)` liest `src/styles/tokens.css` per `fs` und erwartet, dass der Text `--chalk: #ECE9DD` und `--slate: #232B27` enthält.

- [ ] **Step 3: Test laufen lassen, muss fehlschlagen**

Run: `npm test` — Expected: FAIL (Datei existiert nicht).

- [ ] **Step 4: `tokens.css`, `base.css`, `index.html`, `src/main.ts` anlegen**

`tokens.css`: Variablen `--slate`, `--slate-raised`, `--chalk`, `--chalk-dim`, `--red`, `--green`, `--radius: 8px`, Schriftgrößen aus Global Constraints. `base.css`: Reset, `body` mit Schiefer-Hintergrund, Instrument Sans, Überschriften in Big Shoulders Display, Button-Basisstil (min. 48 px hoch), `:focus-visible`-Ring in Kreide, `@media (prefers-reduced-motion: reduce)` schaltet Animationen ab. `main.ts` importiert die Fonts (`@fontsource/big-shoulders-display/700.css`, `800.css`, `@fontsource/instrument-sans/400.css`, `600.css`) und beide CSS-Dateien und schreibt „Dart-Tracker“ in `#app`. `index.html` mit `viewport` (`width=device-width, initial-scale=1, viewport-fit=cover`), `theme-color #232B27`, Sprache `de`.

- [ ] **Step 5: Tests und Build prüfen**

Run: `npm test && npm run build` — Expected: Test PASS, Build ohne Fehler.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite TypeScript project with design tokens"
```

### Task 2: Typen und X01

**Files:**
- Create: `src/game/types.ts`, `src/game/x01.ts`, `tests/helpers.ts`
- Test: `tests/game/x01.test.ts`

**Interfaces:**
- Consumes: nichts
- Produces: alle Typen aus „Gemeinsame Typen“ und „Persistierte Typen“, `isValidDart(field: Field, multiplier: Multiplier): boolean`, `dartPoints(d: { field: Field; multiplier: Multiplier }): number`, `x01Mode: GameMode`, Testhelfer `dart(playerId: string, field: Field, multiplier?: Multiplier): Dart`

Regeln (aus der Spec): 3 Darts pro Runde, Spieler reihum. Mit Double-Out ist ein Dart Bust, wenn der Rest danach `< 0`, `== 1` oder `== 0` ohne Double ist. Ohne Double-Out ist nur Rest `< 0` Bust. Bei Bust springt der Stand auf den Rundenanfang zurück, die Runde endet sofort (`bust: true`) und ihre Punkte zählen 0 in `pointsScored`. Wer genau 0 erreicht, gewinnt, danach ändern weitere Darts nichts mehr. Gültig sind Miss (0, ×1), 1–20 (×1/2/3) und Bull (25, ×1/×2, kein Triple).

- [ ] **Step 1: Failing tests schreiben**

In `tests/game/x01.test.ts` mit `cfg = { mode: 'x01', playerIds: ['a','b'], x01: { start: 301, doubleOut: true } }`:
- `isValidDart`: `(25,3)` ist false, `(25,2)` true, `(0,2)` false, `(20,3)` true, `(21 as Field,1)` false.
- `'zieht Punkte ab und wechselt nach drei Darts'`: a wirft T20, 20, 1 → a.score 220, `currentPlayerId === 'b'`, `round === 1`; nach drei Darts von b ist `round === 2`.
- `'Bust bei Überwerfen setzt auf Rundenanfang zurück und beendet die Runde'`: Start 40 (Config `start` per Cast), a wirft T20 → Rest −20 → `score === 40`, `bust === true`, `currentPlayerId === 'b'`, `a.pointsScored === 0`.
- `'Rest 1 ist mit Double-Out Bust, ohne Double-Out nicht'`.
- `'Rest 0 ohne Double ist mit Double-Out Bust'`: Rest 20, Single 20 → Bust. Rest 40, D20 → `winnerId === 'a'`.
- `'Double-Bull beendet bei Rest 50, Single-Bull bei Rest 25 nicht'`: Rest 50 mit (25,2) → Gewinner a, Rest 25 mit (25,1) → Bust bei Double-Out.
- `'ignoriert Darts nach dem Gewinn'`.
- `'Rückgängig: computeState ohne den letzten Dart stellt Stand und Spieler zurück'`: nach einem Bust-Dart, nach einem Rundenwechsel-Dart und nach dem Gewinn-Dart liefert `computeState(cfg, darts.slice(0, -1))` jeweils den Zustand davor (aktueller Spieler, Stand, `winnerId === null`).

- [ ] **Step 2: Tests laufen lassen, müssen fehlschlagen**

Run: `npm test -- tests/game/x01.test.ts` — Expected: FAIL (Module fehlen).

- [ ] **Step 3: `types.ts` anlegen**

Alle Typen aus „Gemeinsame Typen“ und „Persistierte Typen“ plus `isValidDart` und `dartPoints` (Feld × Multiplikator, Miss = 0). `tests/helpers.ts` exportiert `dart`.

- [ ] **Step 4: `x01Mode.computeState` implementieren**

Spielt `darts` der Reihe nach ab und pflegt pro Spieler Rest, `pointsScored`, `turnsPlayed` sowie den Rundenanfangsstand. `startedAt`-unabhängig und rein. Ein Dart eines anderen als des aktuellen Spielers ist ein Programmierfehler und wirft `Error`.

- [ ] **Step 5: Tests laufen lassen, müssen bestehen**

Run: `npm test -- tests/game/x01.test.ts` — Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game tests
git commit -m "feat: add game types and X01 rules"
```

### Task 3: Cricket

**Files:**
- Create: `src/game/cricket.ts`
- Test: `tests/game/cricket.test.ts`

**Interfaces:**
- Consumes: Typen, `isValidDart`, `dart` aus Task 2
- Produces: `cricketMode: GameMode`, `CRICKET_FIELDS: readonly number[]` (= `[20,19,18,17,16,15,25]`)

Regeln: Nur Felder 15–20 und Bull (25) zählen, andere Darts (inkl. Miss) sind wirkungslos. Marks werden pro Spieler bei 3 gedeckelt angezeigt. Hat ein Spieler ein Feld geschlossen und mindestens ein Gegner hat es noch nicht (Marks < 3), bringen die Marks über 3 hinaus je `Feldwert` Punkte (Bull = 25). Sind alle Gegner geschlossen, gibt es keine Punkte. Sieger ist, wer nach einem seiner Darts alle 7 Felder geschlossen hat und mindestens so viele Punkte wie jeder andere hat. Runden zu 3 Darts, `bust` ist immer false.

- [ ] **Step 1: Failing tests schreiben**

- `'Triple schließt ein Feld in einem Dart'`: a wirft T20 → `marks[20] === 3`.
- `'Marks über drei punkten, solange ein Gegner offen ist'`: a wirft T20, 20 → `score === 20`, b hat 20 noch offen.
- `'keine Punkte, wenn alle Gegner geschlossen haben'`.
- `'Felder unter 15 und Miss tun nichts'`.
- `'Bull zählt 25 Punkte je Mark über drei, Double-Bull sind zwei Marks'`.
- `'Sieger braucht alle Felder geschlossen und gleich viele oder mehr Punkte'`: a schließt alles bei weniger Punkten als b → kein Sieger. Bei Gleichstand der Punkte gewinnt a.
- `'Rückgängig nach dem Gewinn-Dart stellt winnerId null wieder her'`.

- [ ] **Step 2: Tests laufen lassen, müssen fehlschlagen**

Run: `npm test -- tests/game/cricket.test.ts` — Expected: FAIL.

- [ ] **Step 3: `cricketMode.computeState` implementieren**

Replay wie in Task 2. Gegner-Check über `marks[field] < 3` aller anderen Spieler zum Zeitpunkt des Darts. Die Sieg-Prüfung läuft nach jedem Dart des aktuellen Spielers.

- [ ] **Step 4: Tests laufen lassen, müssen bestehen**

Run: `npm test -- tests/game/cricket.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/cricket.ts tests/game/cricket.test.ts
git commit -m "feat: add Cricket rules"
```

### Task 4: Frei, Modus-Register und Statistik

**Files:**
- Create: `src/game/free.ts`, `src/game/modes.ts`, `src/game/stats.ts`
- Test: `tests/game/free.test.ts`, `tests/game/stats.test.ts`

**Interfaces:**
- Consumes: Typen, `dartPoints`, `x01Mode`, `cricketMode`
- Produces: `freeMode: GameMode`, `freeLeader(state: GameState): string` (höchste Summe, bei Gleichstand der erste in Spielreihenfolge), `getMode(id: ModeId): GameMode`, `playerStats(playerId: string, games: Game[]): { games: number; wins: number; avgPerRound: number }`

Regeln: Frei addiert `dartPoints` je Dart auf `score`, Runden zu 3 Darts, `winnerId` ist immer `null` (der Nutzer beendet das Spiel manuell). `playerStats` zählt nur beendete Spiele (`finishedAt !== null`), in denen der Spieler mitspielte. `avgPerRound` ist Summe `pointsScored` geteilt durch Summe `turnsPlayed` über X01- und Frei-Spiele (Cricket zählt nicht), gerundet auf eine Nachkommastelle, `0` ohne Runden. `playerStats` berechnet die Zustände selbst über `getMode(...).computeState(game.config, game.darts)`.
- [ ] **Step 1: Failing tests schreiben**

- `free.test.ts`: `'addiert Punkte je Dart'` (T20, 5, Miss → 65), `'hat nie einen Sieger'`, `'freeLeader nimmt bei Gleichstand den ersten Spieler'`.
- `stats.test.ts`: `'zählt Spiele und Siege nur für beendete Spiele'`, `'Schnitt pro Runde über X01 und Frei, Cricket ausgenommen'` (z. B. 60 + 30 Punkte in 2 Runden → 45.0), `'Bust-Runden zählen mit 0'`, `'Spieler ohne Spiele liefert Nullen'`.

- [ ] **Step 2: Tests laufen lassen, müssen fehlschlagen**

Run: `npm test -- tests/game` — Expected: FAIL.

- [ ] **Step 3: Implementieren**

`free.ts` und `modes.ts` (`getMode` über ein Objekt `Record<ModeId, GameMode>`), `stats.ts` mit `Game` aus `./types`.

- [ ] **Step 4: Tests laufen lassen, müssen bestehen**

Run: `npm test` — Expected: alle PASS.

- [ ] **Step 5: Commit**

```bash
git add src tests
git commit -m "feat: add free mode, mode registry and player stats"
```

### Task 5: Persistenz-Schicht

**Files:**
- Create: `src/store/storage.ts`
- Test: `tests/store/storage.test.ts` (`// @vitest-environment jsdom`)

**Interfaces:**
- Consumes: `AppData` aus `src/game/types.ts`
- Produces: `loadData(): { data: AppData; warning: string | null }`, `saveData(data: AppData): boolean`, Konstante `STORAGE_KEY = 'dart-tracker-v1'`, `emptyData(): AppData`

Verhalten: `loadData` liefert bei fehlendem Eintrag `emptyData()` ohne Warnung. Bei kaputtem JSON, falscher Struktur (fehlendes `players`/`history`-Array) oder wenn `localStorage` wirft, kommt `emptyData()` mit `warning: 'Gespeicherte Daten konnten nicht gelesen werden. Die App startet leer.'`. `saveData` gibt `false` zurück, wenn Schreiben wirft (z. B. Speicher voll oder gesperrt), sonst `true`.

- [ ] **Step 1: Failing tests schreiben**

`'liefert leere Daten ohne Warnung bei leerem Speicher'`, `'liest gespeicherte Daten zurück'`, `'liefert leere Daten und Warnung bei kaputtem JSON'`, `'liefert leere Daten und Warnung bei falscher Struktur'`, `'liefert leere Daten und Warnung, wenn localStorage wirft'` (mit `vi.spyOn(Storage.prototype, 'getItem')`), `'saveData liefert false, wenn setItem wirft'`.

- [ ] **Step 2: Tests laufen lassen, müssen fehlschlagen**

Run: `npm test -- tests/store/storage.test.ts` — Expected: FAIL.

- [ ] **Step 3: `storage.ts` implementieren**

- [ ] **Step 4: Tests laufen lassen, müssen bestehen**

Run: `npm test -- tests/store/storage.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store tests/store
git commit -m "feat: add localStorage persistence with corruption handling"
```

### Task 6: Store

**Files:**
- Create: `src/store/store.ts`
- Test: `tests/store/store.test.ts` (`// @vitest-environment jsdom`)

**Interfaces:**
- Consumes: `loadData`, `saveData`, `getMode`, `freeLeader`, `isValidDart`
- Produces (alle aus `src/store/store.ts`, die Typen `Player`, `Game`, `AppData` werden aus `src/game/types.ts` re-exportiert): `initStore(): { warning: string | null }`, `getData(): AppData`, `subscribe(fn: () => void): () => void`, `getGameState(): GameState | null`, `addPlayer(name: string): Result<Player>`, `renamePlayer(id: string, name: string): Result<Player>`, `removePlayer(id: string): Result<null>` mit `type Result<T> = { ok: true; value: T } | { ok: false; error: string }`, `startGame(config: GameConfig): Game`, `throwDart(field: Field, multiplier: Multiplier): void`, `undoDart(): void`, `finishGame(winnerId: string | null): void`, `closeGame(): void`, `abortGame(): void`, `resetStoreForTests(): void`

Verhalten:
- Namen werden getrimmt. Leer und Dublette (ohne Beachtung der Groß-/Kleinschreibung) ergeben `{ ok: false, error }` mit deutschen Texten („Gib einen Namen ein.“, „Diesen Namen gibt es schon.“).
- `removePlayer` lehnt Spieler im laufenden Spiel ab („Dieser Spieler spielt gerade mit.“). Sonst wird er aus `players` entfernt, die Historie bleibt über `Game.playerNames` lesbar.
- `startGame` verlangt 2–8 Spieler (sonst `Error`), schreibt `playerNames`-Snapshot, setzt `activeGame`.
- `throwDart` ignoriert ungültige Darts und Darts bei beendetem Spiel. Der Dart gehört dem aktuellen Spieler aus `getGameState()`. Erscheint ein Sieger, setzt der Store `finishedAt` und `winnerId`, das Spiel bleibt in `activeGame`, damit „Rückgängig“ möglich ist.
- `undoDart` entfernt den letzten Dart und öffnet ein beendetes Spiel wieder (`finishedAt`, `winnerId` zurück auf `null`).
- `finishGame(winnerId)` beendet manuell (Frei). `closeGame()` verschiebt das beendete Spiel an den Anfang von `history` und setzt `activeGame` auf `null`. `abortGame()` verwirft das Spiel ohne Verlauf.
- Jede Änderung speichert über `saveData` und benachrichtigt Abonnenten.

- [ ] **Step 1: Failing tests schreiben**

`'lehnt leere und doppelte Namen ab'` (`'  '`, `'Mia'` und `'mia'`), `'trimmt Namen'`, `'startGame verlangt 2 bis 8 Spieler'`, `'removePlayer lehnt Spieler im laufenden Spiel ab'`, `'gelöschter Spieler bleibt im Verlauf mit Namen'`, `'throwDart ignoriert ungültige Darts und Darts nach dem Gewinn'`, `'undoDart öffnet ein gewonnenes Spiel wieder'`, `'undoDart über eine Rundengrenze gibt den Zug zurück'`, `'closeGame verschiebt das Spiel in den Verlauf'`, `'Neuladen stellt das laufende Spiel wieder her'` (`initStore()` nach `resetStoreForTests()` ohne Löschen des Speichers liest dieselben Darts), `'initStore meldet die Warnung bei kaputtem Speicher'`.

- [ ] **Step 2: Tests laufen lassen, müssen fehlschlagen**

Run: `npm test -- tests/store/store.test.ts` — Expected: FAIL.

- [ ] **Step 3: Store implementieren**

Modul-interner Zustand, `crypto.randomUUID()` für IDs. `getGameState()` ruft `getMode(config.mode).computeState(config, darts)`.

- [ ] **Step 4: Alle Tests laufen lassen**

Run: `npm test` — Expected: alle PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store tests/store
git commit -m "feat: add app store with players, active game and history"
```

### Task 7: App-Shell, Router, Start- und Spieler-Screen

**Files:**
- Create: `src/ui/router.ts`, `src/ui/screens/start.ts`, `src/ui/screens/players.ts`, `src/ui/dom.ts`
- Modify: `src/main.ts`, `src/styles/base.css`

**Interfaces:**
- Consumes: Store aus Task 6
- Produces: `type Screen = (root: HTMLElement, params: string[]) => void`, `registerRoutes(routes: Record<string, Screen>)`, `navigate(path: string): void`, `startRouter(root: HTMLElement): void`, Hilfsfunktion `el<K extends keyof HTMLElementTagNameMap>(tag: K, props?: Partial<HTMLElementTagNameMap[K]> & { class?: string }, ...children: (Node | string)[]): HTMLElementTagNameMap[K]`

Routen: `#/` Start, `#/players`, `#/new`, `#/game`, `#/finished`, `#/history`, `#/history/<id>`. Der Router rendert bei Hash-Wechsel und bei Store-Änderungen neu. Läuft ein Spiel (`activeGame` offen), leitet `#/` auf `#/game` weiter. Zeigt `initStore().warning` einen Hinweis, steht er als Banner oben (Rot-Rand, Text „Gespeicherte Daten konnten nicht gelesen werden. Die App startet leer.“).

- **Start:** Titel, Buttons „Neues Spiel“, „Spieler“, „Verlauf“. Ohne Spieler führt „Neues Spiel“ zu `#/players` mit Hinweis „Noch keine Spieler. Lege den ersten an, um ein Spiel zu starten.“
- **Spieler:** Liste mit Name und Statistik („12 Spiele · 5 Siege · Ø 41,3“), Formular „Spieler hinzufügen“ (Fehlertexte aus dem Store inline), Umbenennen und „Löschen“ je Zeile, Löschen-Fehler inline. Leerer Zustand wie oben.

- [ ] **Step 1: Router und `el`-Helfer schreiben, Start-Screen und Spieler-Screen bauen**

- [ ] **Step 2: Im Browser prüfen**

Run: `npm run dev`, im Browser-Pane `390×844` öffnen. Erwartet: Spieler anlegen, umbenennen, Dublette und leeren Namen ablehnen, löschen, Neuladen behält die Spieler. Keine Konsolenfehler, Tasten ≥ 48 px, Fokusring sichtbar.

- [ ] **Step 3: Build und Tests**

Run: `npm test && npm run build` — Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add router, start screen and player management"
```

### Task 8: Neues-Spiel-Screen

**Files:**
- Create: `src/ui/screens/newGame.ts`
- Modify: `src/main.ts` (Route registrieren), `src/styles/base.css`

**Interfaces:**
- Consumes: `getData`, `startGame`, `navigate`, `el`
- Produces: Screen für `#/new`

Inhalt: Modus-Auswahl (X01, Cricket, Frei) als Gruppe von Umschaltknöpfen mit `aria-pressed`. Bei X01 zusätzlich Startwert 301/501 (Standard 501) und Double-Out-Schalter (Standard aus). Spielerliste: Antippen wählt einen Spieler und hängt ihn in der Reihenfolge an, die Position erscheint als Zahl am Spieler (hier ist es wirklich eine Reihenfolge), erneutes Antippen entfernt ihn. Button „Spiel starten“ ist deaktiviert, solange nicht 2–8 Spieler gewählt sind, mit Hinweis „Wähle 2 bis 8 Spieler.“ Nach Start `navigate('#/game')`.

- [ ] **Step 1: Screen bauen**

- [ ] **Step 2: Im Browser prüfen**

Erwartet: Reihenfolge der Auswahl bleibt erhalten, neunter Spieler lässt sich nicht wählen, Start mit jedem Modus öffnet `#/game`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add new game screen"
```

### Task 9: Eingabe-Tastatur, Scoreboard und Spielscreen

**Files:**
- Create: `src/ui/components/keypad.ts`, `src/ui/components/scoreboard.ts`, `src/ui/screens/game.ts`
- Test: `tests/ui/keypad.test.ts` (`// @vitest-environment jsdom`)
- Modify: `src/main.ts`, `src/styles/base.css`

**Interfaces:**
- Consumes: `getGameState`, `getData`, `throwDart`, `undoDart`, `finishGame`, `abortGame`, `freeLeader`
- Produces: `createKeypad(onDart: (field: Field, multiplier: Multiplier) => void, onUndo: () => void): HTMLElement`, `renderScoreboard(root: HTMLElement, game: Game, state: GameState): void`, Screen für `#/game`

Keypad: Umschalter „Single | Double | Triple“ (`aria-pressed`, Farben Kreide/Rot/Grün, beschriftet), Zahlentasten 1–20, „Bull“, „Miss“, „Rückgängig“. Nach jedem Dart springt der Umschalter auf Single zurück. Tasten, die in der Kombination ungültig sind (Bull mit Triple, Miss mit Double/Triple), sind deaktiviert. Die Tastaturfarbe folgt dem Umschalter (CSS-Klasse am Container).

Scoreboard: Alle Spieler in Reihenfolge, Name links, Stand rechts (X01: Rest, Cricket: Punkte plus Marks für 20–15 und Bull, Frei: Summe). Aktiver Spieler auf `--slate-raised` mit 96-px-Stand, die übrigen 40 px, darunter die Darts der laufenden Runde („T20 20 –“). Bei Bust Hinweis „Bust – die Runde zählt nicht.“ in Rot mit Text. Ändert sich ein Stand, spielt die Ziffer den Kreide-Wisch (CSS-Animation, ca. 250 ms), nur für geänderte Ziffern, indem das Scoreboard die zuletzt angezeigten Stände merkt. Gewinn: Weiterleitung auf `#/finished`. Frei: Button „Spiel beenden“, der `finishGame(freeLeader(state))` aufruft. Zusätzlich „Spiel abbrechen“ mit Rückfrage (`confirm`).

- [ ] **Step 1: Failing Keypad-Test schreiben**

`'Double + 20 ruft onDart(20, 2) und springt auf Single zurück'`, `'Triple deaktiviert Bull und Miss'`, `'Rückgängig ruft onUndo'`.

- [ ] **Step 2: Test laufen lassen, muss fehlschlagen**

Run: `npm test -- tests/ui/keypad.test.ts` — Expected: FAIL.

- [ ] **Step 3: Keypad, Scoreboard und Spielscreen implementieren**

- [ ] **Step 4: Tests laufen lassen**

Run: `npm test` — Expected: PASS.

- [ ] **Step 5: Im Browser prüfen**

Ein X01-Spiel mit Double-Out durchspielen (Bust, Rundenwechsel, Rückgängig, Sieg), ein Cricket-Spiel (Marks und Punkte), ein freies Spiel (Spiel beenden). Erwartet: korrekte Stände, Kreide-Wisch nur bei geänderten Ziffern, Neuladen mitten im Spiel behält den Stand. Viewport `390×844` und `360×640`, ohne horizontales Scrollen.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add keypad, scoreboard and game screen"
```

### Task 10: Ende-Screen und Verlauf

**Files:**
- Create: `src/ui/screens/finished.ts`, `src/ui/screens/history.ts`
- Modify: `src/main.ts`, `src/styles/base.css`

**Interfaces:**
- Consumes: `getData`, `getGameState`, `closeGame`, `undoDart`, `startGame`, `getMode`, `playerStats`-unabhängige Statistik aus `GameState`
- Produces: Screens für `#/finished`, `#/history`, `#/history/<id>`

- **Ende:** Sieger in Grün mit Text „<Name> gewinnt“, Tabelle pro Spieler (Runden, Punkte, Ø pro Runde, bei Cricket Marks/Punkte), Buttons „Rückgängig“ (letzten Dart zurücknehmen, öffnet das Spiel wieder und führt auf `#/game`), „Revanche“ (`closeGame()`, dann `startGame` mit gleicher Config und um eins rotierter Spielerreihenfolge, `#/game`), „Zur Startseite“ (`closeGame()`, `#/`). Ohne beendetes Spiel führt die Route auf `#/`.
- **Verlauf:** Liste beendeter Spiele, neueste zuerst: Datum, Modus, Spieler (aus `playerNames`), Sieger. Antippen öffnet `#/history/<id>` mit derselben Statistiktabelle (aus `computeState` des gespeicherten Spiels). Leerer Zustand: „Noch keine Spiele. Starte ein Spiel, dann erscheint es hier.“

- [ ] **Step 1: Screens bauen**

- [ ] **Step 2: Im Browser prüfen**

Erwartet: Nach Sieg erscheint der Ende-Screen, „Rückgängig“ öffnet das Spiel wieder, „Revanche“ startet mit rotierter Reihenfolge, Verlauf zeigt Spiele auch von gelöschten Spielern mit Namen.

- [ ] **Step 3: Tests und Build**

Run: `npm test && npm run build` — Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add finished screen and game history"
```

### Task 11: PWA

**Files:**
- Create: `public/icon.svg`, `public/icon-192.png`, `public/icon-512.png`
- Modify: `vite.config.ts`, `package.json`

**Interfaces:**
- Consumes: Build aus Task 1
- Produces: Manifest und Service Worker über `vite-plugin-pwa`

Manifest: Name „Dart-Tracker“, `short_name` „Darts“, `display: standalone`, `theme_color` und `background_color` `#232B27`, `lang: de`, `start_url` und `scope` relativ zu `base`. Icon: Kreide-Scheibe mit Rot und Grün auf Schiefer (SVG, daraus PNGs 192 und 512 auch als maskable). `registerType: 'autoUpdate'`, Precache für alle gebauten Dateien inkl. Schriften.

- [ ] **Step 1: Plugin installieren und konfigurieren, Icons erzeugen**

- [ ] **Step 2: Build prüfen**

Run: `npm run build` — Expected: `dist/` enthält `manifest.webmanifest` und `sw.js`, Precache listet die `.woff2`-Dateien.

- [ ] **Step 3: Offline im Browser prüfen**

Run: `npm run build && npx vite preview`, Seite laden, im Browser-Pane Netzwerk trennen und neu laden. Erwartet: App lädt offline mit korrekten Schriften.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: make the app installable and offline-capable"
```

### Task 12: GitHub Pages Deployment und README

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`

**Interfaces:**
- Consumes: Build mit `VITE_BASE`
- Produces: Workflow, der bei Push auf `main` testet, baut und nach GitHub Pages deployt

Workflow: Trigger `push` auf `main`, Berechtigungen `contents: read`, `pages: write`, `id-token: write`. Schritte: Checkout, Node 20 mit npm-Cache, `npm ci`, `npm test`, `npm run build` mit `VITE_BASE=/${{ github.event.repository.name }}/`, `actions/upload-pages-artifact` für `dist`, `actions/deploy-pages`. README: kurze Beschreibung, Befehle (`npm run dev`, `npm test`, `npm run build`), Hinweis zum Aktivieren von Pages („Settings → Pages → Source: GitHub Actions“), Installation aufs Handy.

- [ ] **Step 1: Workflow und README schreiben**

- [ ] **Step 2: Lokal gegen die Pages-Base prüfen**

Run: `VITE_BASE=/dart-tracker/ npm run build && npx vite preview` — Expected: App läuft unter `/dart-tracker/`, Assets und Service Worker laden ohne 404.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "ci: deploy to GitHub Pages"
```

- [ ] **Step 4: GitHub-Repo anlegen und pushen (nur nach Bestätigung)**

Vor `gh repo create` den Nutzer nach Repo-Name und Sichtbarkeit fragen, nichts ohne ausdrückliches Ja pushen. Danach in den Repo-Einstellungen Pages auf „GitHub Actions“ stellen (oder dem Nutzer den Hinweis geben) und den ersten Workflow-Lauf prüfen.
