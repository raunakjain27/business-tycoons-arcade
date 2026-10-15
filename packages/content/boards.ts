import type { BoardDef } from '../engine/types';
import boardDefault from './board.json' with { type: 'json' };
import boardIndia from './board.india.json' with { type: 'json' };
import boardUsa from './board.usa.json' with { type: 'json' };
import boardUk from './board.uk.json' with { type: 'json' };
import boardUae from './board.uae.json' with { type: 'json' };
import boardMixed from './board.mixed.json' with { type: 'json' };
import boardAfterDark from './board.afterdark.json' with { type: 'json' };
import boardCustomFriends from './board.customfriends.json' with { type: 'json' };

export const BOARDS: Record<string, BoardDef> = {
  default: boardDefault as BoardDef,
  india: boardIndia as BoardDef,
  usa: boardUsa as BoardDef,
  uk: boardUk as BoardDef,
  uae: boardUae as BoardDef,
  mixed: boardMixed as BoardDef,
  afterdark: boardAfterDark as BoardDef,
  customfriends: boardCustomFriends as BoardDef,
};

export const DEFAULT_BOARD_KEY = 'default';

export function getBoard(key: string = DEFAULT_BOARD_KEY): BoardDef {
  return BOARDS[key] || BOARDS[DEFAULT_BOARD_KEY];
}
