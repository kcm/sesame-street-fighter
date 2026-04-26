# Sesame Street Fighter

Browser-only parody fighting game. No build step, no backend, no dependencies.

## Stack

- `index.html` — page structure, HUD elements, canvas
- `game.js` — all game logic (~614 lines, single file)
- `styles.css` — layout and UI
- `assets/sprites/` — PNG sprite sheets (one per character × state)

## Running

Open `index.html` directly in a browser, or:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

No npm, no bundler, no compile step.

## Characters

Six fighters, each with `speed`, `power`, `jump`, `width`, `height` stats:
Elmo, Cookie Monster, Big Bird, Oscar, Bert, Ernie.

Each needs 6 PNG sprites: `idle`, `run`, `jump`, `jab`, `kick`, `hit`.
File naming: `{char_key}_{state}.png` e.g. `cookie_monster_idle.png`.
Missing sprites fall back to colored rectangles.

## Key architecture notes

- `Fighter` class owns physics, state, sprite selection, drawing, and attack logic
- CPU AI lives in `runCpuAI()` — simple distance-based chase + random attacks
- Raytrace lighting is approximated via `segmentIntersectsRect` sampling (not GPU); toggled with `R`
- Attack boxes are axis-aligned rects with a TTL; combo multiplier accrues on the attacker
- Round win condition: opponent HP ≤ 0 or timer hits 0; first to 2 rounds wins the match

## Controls

| Key | Action |
|-----|--------|
| A / D | move left / right |
| W | jump |
| F | jab |
| G | kick |
| R | toggle raytrace lighting |
