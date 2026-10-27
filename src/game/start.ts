import { buildTeamOrder } from './sides';
import type { GameConfig } from './types';

function swapTeams(config: GameConfig): GameConfig {
  const [t0, t1] = config.teams!;
  const teams: [string[], string[]] = [[...t1], [...t0]];
  return { ...config, teams, playerIds: buildTeamOrder(teams) };
}

function rotate(config: GameConfig, by: number): GameConfig {
  const ids = config.playerIds;
  const k = by % ids.length;
  return { ...config, playerIds: [...ids.slice(k), ...ids.slice(0, k)] };
}

/** Lost aus, wer beginnt. Liefert eine neue Konfiguration. */
export function drawStart(config: GameConfig, random: () => number = Math.random): GameConfig {
  if (config.teams) return random() < 0.5 ? structuredClone(config) : swapTeams(config);
  return rotate(config, Math.floor(random() * config.playerIds.length));
}

/** Revanche: bei Teams beginnt das andere Team, bei Einzelspielen rückt der erste Spieler ans Ende. */
export function rematchConfig(config: GameConfig): GameConfig {
  return config.teams ? swapTeams(config) : rotate(config, 1);
}
