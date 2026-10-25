import { getMode } from './modes';
import type { Game } from './types';

export interface PlayerStats {
  games: number;
  wins: number;
  avgPerRound: number;
}

export function playerStats(playerId: string, games: Game[]): PlayerStats {
  let played = 0;
  let wins = 0;
  let points = 0;
  let turns = 0;

  for (const game of games) {
    if (game.finishedAt === null || !game.config.playerIds.includes(playerId)) continue;
    played++;
    if (game.winnerId === playerId) wins++;
    if (game.config.mode === 'cricket') continue;
    const state = getMode(game.config.mode).computeState(game.config, game.darts);
    const p = state.players.find((s) => s.playerId === playerId);
    if (p) {
      points += p.pointsScored;
      turns += p.turnsPlayed;
    }
  }

  const avgPerRound = turns === 0 ? 0 : Math.round((points / turns) * 10) / 10;
  return { games: played, wins, avgPerRound };
}
