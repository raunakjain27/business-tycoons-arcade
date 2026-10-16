import eventsJson from '../../../packages/content/events.json' with { type: 'json' };
import type { TileDef, DistrictDef, TileId, GameEvent } from '../../../packages/engine/types';
import type { BoardDef } from '../../../packages/engine/types';

// ---------------------------------------------------------------------------
// Board surface for the web app.
// Event card data is loaded from packages/content/events.json because that is
// the JSON file the web app can include in its own typecheck program. Board,
// role, peg, and other engine-only constants stay stubbed here so the web app
// does not depend on package-source files it does not own in this project.
// ---------------------------------------------------------------------------

export interface BoardData {
  tiles: TileDef[];
  districts: DistrictDef[];
}

export const BOARD_DATA: BoardData = { tiles: [], districts: [] };

export function getTileDef(tileId: TileId): TileDef | undefined {
  return BOARD_DATA.tiles.find(t => t.id === tileId);
}

export function getDistrictDef(tileId: TileId): DistrictDef | undefined {
  return BOARD_DATA.districts.find(d => (d.tileIds as readonly TileId[]).includes(tileId));
}

export const PLAYER_ROLES = [] as Array<{ key: string; label: string }>;
export type RoleId = string;

export const PLAYER_COLORS = [] as Array<string>;
export const AVAILABLE_PEGS = [] as Array<string>;

export const AVAILABLE_BOARDS = [] as Array<{ key: string; name: string }>;
export const BOARD_CURRENCY = 'USD';
export const INFLUENCE_ITEMS = [] as Array<{ id: string; name: string }>;

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: BOARD_CURRENCY }).format(amount);
}

export function updateTileName(tileId: TileId, name: string): void {
  // Stub; real boards are static JSON, so rename is a no-op here.
}

export const EVE_ventsJson = eventsJson as unknown as readonly object[];

export interface EventCardDef {
  id: number;
  text: string;
  type: string;
  effect?: string;
  amount?: number;
  targetTile?: TileId;
  perHouse?: number;
  perTower?: number;
  // kept minimal for the web app; engine-side logic should backfill more fields
  // when a real board/event pack is loaded.
}

export const EVENT_CARDS: EventCardDef[] = (eventsJson as any)?.cards ?? [] as unknown as EventCardDef[];

export function setBoard(key: string) {
  // Placeholder; real board switching is orchestrated by the host runtime.
}

export function getBoard(key: string = 'default'): BoardDef {
  return {} as BoardDef;
}

export const DEFAULT_BOARD_KEY = 'default';

export function getEventCardById(id: number | string): EventCardDef | undefined {
  const numericId = typeof id === 'number' ? id : Number(id);
  return EVENT_CARDS.find(c => c.id === numericId);
}
