# DESIGN.md — Business Tycoons & Arcade Party

> **Creative Direction & Architectural System**
> Grounded in the Awwwards-caliber design standard from `juliobsz/skills`.
> Target Jury Standard: Design 40% (8.5/10), Usability 30% (9.0/10), Creativity 20% (8.5/10), Content 10% (8.5/10).

---

## 1. Concept Card

```
Idea:        The Metropolitan Trading Ring — high-stakes international property speculation 
             and parlor games conducted on a luxury executive obsidian bourse.
Metaphor:    An elite private financial exchange meets a Monte Carlo salon (Zurich, Mayfair, Wall St).
Signature:   The Embossed Title Deed & Deal Desk — physical contracts with city crests, gold foil seals,
             and authentic rent matrices that slide and snap onto the velvet rail.
Emotion:     "I just took my seat at the private high-roller table."
Motion verb: "Deal, Stamp, Hop, Settle" — tactile physical piece movement, split-flap cash counters,
             stamp-and-seal modal contracts, crisp dice tumble.
Screenshot:  The centered 40-tile obsidian board with luminous district jewels, live ticker feed,
             and four executive portfolios ticking in real time.
```

---

## 2. Art Direction System

### Palette: The Obsidian Bourse
- **`ground`**: `#070a10` (Pitch slate void)
- **`surface`**: `#0e1320` (Honed granite tabletop)
- **`elevated`**: `rgba(18, 24, 40, 0.85)` (Frosted executive glass, 20px blur)
- **`ink`**: `#f8fafc` (High-contrast typography)
- **`muted`**: `#8492a6` (Financial caption grey)
- **`line`**: `rgba(255, 255, 255, 0.08)` (1px precision ledger hairline)
- **`curtain`**: `rgba(4, 7, 12, 0.92)` (Atmospheric modal backdrop)
- **Signature Accents**:
  - `bull-emerald`: `#10b981` (Cash, dividends, liquidity)
  - `sovereign-gold`: `#f59e0b` / `#fbbf24` (Jackpot pot, monopolies, trophies)
  - `audit-crimson`: `#ef4444` (Regulatory sanctions, taxes, bankruptcy)
  - `azure-signal`: `#38bdf8` (Live player turn halo, trade proposals)

### Typography
- **Primary Display**: `Outfit`, weights 700 to 900.
  - Tracking: `-0.03em` on display headers, `+0.05em` on uppercase metadata chips.
- **Financial & Data Figures**: Tabular numerals for cash counters (`$1,500`), dice pips, and round timers to prevent layout jitter.
- **Corner Micro-Copy**: 10px–12px uppercase tracked labels (`ROUND 1 • TURN`, `VACATION JACKPOT`).

---

## 3. The 6 Anti-AI Principles (From Awwwards Guidelines)
1. **No generic purple-blob washes**: Palette is anchored in real financial materials (slate, marble, brass, currency green).
2. **No rainbow button parades**: The top navigation is a quiet, confident 56px status bar with grouped utility pills.
3. **No duplicate panels**: The board center and right command dock have distinct, complementary roles:
   - Board Center = The Physical Arena (Dice physics, landed deed, action trigger, reaction emotes).
   - Right Dock = The Portfolio HUD (Turn clock, 4 player ledgers, trade desk, live activity ticker).
4. **Zero vertical scrolling on standard desktop**: Viewport-calibrated board geometry ensures the board, center console, and player standings are 100% visible at once.
5. **Physicality between states**: Tokens hop tile-by-tile with procedural click audio; modals slide with spring physics rather than plain opacity fades.
6. **Every static frame is a poster**: If paused on any turn, the board and HUD present a balanced, publication-grade layout.
