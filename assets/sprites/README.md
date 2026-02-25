# Sprite Files

Drop your realistic PNG sprite images in this folder using the exact naming pattern:

- `<character>_idle.png`
- `<character>_run.png`
- `<character>_jump.png`
- `<character>_jab.png`
- `<character>_kick.png`
- `<character>_hit.png`

Supported `<character>` keys:

- `elmo`
- `cookie_monster`
- `big_bird`
- `oscar`
- `bert`
- `ernie`

Example:

- `elmo_idle.png`
- `elmo_run.png`
- `elmo_jump.png`
- `elmo_jab.png`
- `elmo_kick.png`
- `elmo_hit.png`

Notes:

- PNGs can be any size; the game scales them to fighter dimensions.
- Missing files gracefully fall back to simple block rendering.
