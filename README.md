# Sesame Street Fighter (Browser-Only)

A small client-side parody fighting game inspired by classic arcade fighters, with Sesame Street-themed characters.

## Run

Open `index.html` in any modern browser.

Optional local server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Controls

- `A` / `D`: move
- `W`: jump
- `F`: jab
- `G`: kick

## Notes

- No backend required.
- All game logic runs in the browser (`game.js` + `<canvas>`).
- Realistic character sprites are supported from `assets/sprites/` (see `assets/sprites/README.md` for file names).
