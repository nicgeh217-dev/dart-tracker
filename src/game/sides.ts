import type { Game, GameConfig } from './types';

export interface Side {
  id: string;
  playerIds: string[];
}

export const teamSideId = (index: 0 | 1): string => `team:${index}`;

export function isTeamGame(config: GameConfig): boolean {
  return config.teams !== undefined;
}

/** Wurfreihenfolge eines Team-Spiels: T1-S1, T2-S1, T1-S2, T2-S2. */
export function buildTeamOrder(teams: [string[], string[]]): string[] {
  return [teams[0][0], teams[1][0], teams[0][1], teams[1][1]];
}

export function isValidTeamConfig(config: GameConfig): boolean {
  const teams = config.teams;
  if (!Array.isArray(teams) || teams.length !== 2) return false;
  for (const team of teams) {
    if (!Array.isArray(team) || team.length !== 2 || team.some((id) => typeof id !== 'string')) return false;
  }
  const order = buildTeamOrder(teams);
  if (new Set(order).size !== 4) return false;
  return config.playerIds.length === 4 && config.playerIds.every((id, i) => id === order[i]);
}

/** Seiten in Startreihenfolge: Einzelspieler oder zwei Teams. */
export function sidesOf(config: GameConfig): Side[] {
  if (config.teams) {
    return [
      { id: teamSideId(0), playerIds: config.teams[0] },
      { id: teamSideId(1), playerIds: config.teams[1] },
    ];
  }
  return config.playerIds.map((id) => ({ id, playerIds: [id] }));
}

export function sideOf(config: GameConfig, playerId: string): string {
  if (config.teams) return config.teams[0].includes(playerId) ? teamSideId(0) : teamSideId(1);
  return playerId;
}

export function sideName(game: Pick<Game, 'config' | 'playerNames'>, sideId: string): string {
  const side = sidesOf(game.config).find((s) => s.id === sideId);
  const ids = side ? side.playerIds : [sideId];
  return ids.map((id) => game.playerNames[id] ?? '?').join(' & ');
}
