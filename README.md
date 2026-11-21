# best-stealth-game-20261121-1759

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/arayautis/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/arayautis/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

Glimmerwick is a top-down 2D stealth game: Wren, a young archivist, sneaks through a lantern-lit clockwork library at night to return a stolen star-map, slipping past patrolling clockwork sentinels with lantern vision cones, hiding behind bookshelves and in the dark, and reaching the Archive Door unseen.

## Run it

```sh
python3 -m http.server 8080 --directory game
```

Then open http://localhost:8080 in a desktop browser. No build step, no network requests — every file the game loads lives under `game/`.

## How to play

- **WASD / Arrow keys** — move
- **Shift** — sneak (slower and quieter, harder for sentinels to spot)
- **E** — toss a brass cog to lure a sentinel away with its clatter
- **R** — restart the floor · **P / Esc** — pause · **M** — mute

Collect all three star-charts on a floor and the Archive Door opens. Get seen and a sentinel's suspicion climbs — break line of sight to cool it down, or it gives chase. Get caught and the floor restarts. Three floors, each with more sentinels and tighter patrols. All art is drawn in code and all sound is synthesized with WebAudio.

---

Entered on [make.fun](https://make.fun/?ref=jm3nw0tn&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards
