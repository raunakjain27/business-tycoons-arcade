import type { GameState, TileId, Tier } from '../../../packages/engine/types';
import { BOARD_DATA, getTileDef } from './boardData';

const TIER_MULT: Record<Tier, number> = {
  0: 1, // Land
  1: 5, // House
  2: 15, // Apartments
  3: 40, // Tower
  4: 70, // Landmark
};

export function countOwned(
  state: GameState,
  ownerId: string,
  type: 'hub' | 'utility' | 'property',
  districtId?: string
): number {
  let count = 0;
  for (const [idStr, tState] of Object.entries(state.tiles)) {
    const tileId = Number(idStr);
    const def = getTileDef(tileId);
    if (tState.ownerId !== ownerId) continue;
    if (type === 'property' && def.districtId !== districtId) continue;
    if (type === 'hub' && def.type !== 'hub') continue;
    if (type === 'utility' && def.type !== 'utility') continue;
    count++;
  }
  return count;
}

export function ownsFullDistrict(state: GameState, ownerId: string, districtId: string): boolean {
  const district = BOARD_DATA.districts[districtId];
  if (!district) return false;
  return district.tileIds.every(tileId => {
    const tState = state.tiles[tileId];
    return tState?.ownerId === ownerId && !tState.mortgaged;
  });
}

export function adjacencySynergy(state: GameState, tileId: TileId): number {
  let synergy = 0;
  const def = getTileDef(tileId);
  if (def.type !== 'property' || !def.districtId) return 0;
  const ownerId = state.tiles[tileId]?.ownerId;
  if (!ownerId) return 0;

  const neighbors = [(tileId - 1 + 40) % 40, (tileId + 1) % 40];
  for (const nIdx of neighbors) {
    const nDef = getTileDef(nIdx);
    const nState = state.tiles[nIdx];
    if (nState?.ownerId === ownerId && nDef.districtId === def.districtId) {
      synergy += 0.1;
    }
  }
  return synergy;
}

export function marketModifier(state: GameState, tileId: TileId): number {
  const market = state.market.current;
  if (market.kind === 'steady') return 1;
  const def = getTileDef(tileId);
  if (!def.districtId || market.districtId !== def.districtId) return 1;
  if (market.kind === 'boom') return 1.5;
  if (market.kind === 'crash') return 0.75;
  return 1;
}

export function computeRent(state: GameState, tileId: TileId, dice: [number, number]): number {
  const def = getTileDef(tileId);
  const t = state.tiles[tileId];
  if (!t || !t.ownerId || t.mortgaged) return 0;
  if (t.rentLockedUntilRound && t.rentLockedUntilRound >= state.round) return 0;

  // Don't collect rent while in prison rule
  if (state.rules.noRentInPrison !== false) {
    const owner = state.players[t.ownerId];
    if (owner && owner.inJail) return 0;
  }

  let rent = 0;
  if (def.type === 'hub') {
    const owned = countOwned(state, t.ownerId, 'hub');
    rent = 25 * Math.pow(2, Math.max(0, owned - 1));
  } else if (def.type === 'utility') {
    const n = countOwned(state, t.ownerId, 'utility');
    rent = (dice[0] + dice[1]) * (n === 2 ? 10 : 4);
  } else if (def.type === 'property') {
    const base = Math.round((def.price ?? 60) / 8);
    rent = base * (TIER_MULT[t.tier] ?? 1);
    if (t.tier === 0 && def.districtId && ownsFullDistrict(state, t.ownerId, def.districtId)) {
      if (state.rules.doubleRentFullSet !== false) {
        rent *= 2;
      }
    }
    rent *= 1 + adjacencySynergy(state, tileId);
  }

  rent *= marketModifier(state, tileId);
  const sudden = state.rules.suddenGrowthRound;
  if (sudden && state.round > sudden) {
    rent *= Math.pow(1.1, state.round - sudden);
  }

  return Math.round(rent);
}
