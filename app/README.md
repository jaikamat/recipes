# Recipe Kitchen App

A small local webapp over the family recipe markdown collection: a
large-type **cook mode** with arrow-key step-through and batch scaling, a
**shopping list** that aggregates ingredients across recipes, and a
**weekly planner** that totals calories and macros per day.

The markdown files in `breakfast/`, `dinner/`, `snacks/`, and `pantry/`
remain the single source of truth. The app **never writes to them** — it
re-reads them on every browser refresh (and on window focus), so edits made
in any text editor show up immediately.

## Quick start

**Double-click `start.command`** in the repo root (the first time, macOS
Gatekeeper may require right-click → Open). It installs dependencies on
first run, starts the server, and opens <http://localhost:7878>. Close the
Terminal window to stop.

From a terminal instead:

```sh
cd app
npm install   # first time only
npm start
```

## Scripts

| Command            | What it does                                                                         |
| ------------------ | ------------------------------------------------------------------------------------ |
| `npm start`        | Build if app code changed, start the server, open the browser                        |
| `npm run dev`      | Development mode: tsx-watched server + Vite client with hot reload                   |
| `npm test`         | Run the full Vitest suite (parser, aggregation, components)                          |
| `npm run validate` | Parse every recipe and report problems (`-- -v` lists pass-through ingredient lines) |
| `npm run check`    | Typecheck (`tsc --noEmit`) + Prettier formatting check                               |
| `npm run format`   | Apply Prettier formatting                                                            |
| `npm run build`    | Production client build into `dist/`                                                 |

Requires Node ≥ 20.19 (`nvm install 22`).

## Architecture

```
 breakfast/*.md ─┐
 dinner/*.md    ─┤   shared/parser/        GET /api/recipes      React client
 snacks/*.md    ─┼─► parseRecipe.ts   ─►   (Express, port  ─►   list / cook /
 pantry/*.md    ─┘   parseIngredient.ts     7878, no cache)      shopping / planner
                                                                      │
                     shared/aggregate.ts  ◄── shopping list ──────────┤
                     shared/scale.ts      ◄── batch scaling ──────────┘
                                              localStorage: plan + shopping list
```

- **`shared/`** — isomorphic domain code, used by the server, the client
  (via the `@shared` Vite alias), and tests. All types live in
  `shared/types.ts`; the parser in `shared/parser/`; shopping-list math in
  `shared/aggregate.ts`; batch scaling in `shared/scale.ts`.
- **`server/`** — ~80 lines of Express: one JSON endpoint that parses the
  markdown fresh per request, plus static serving of the built client.
  There is deliberately no cache and no file watcher.
- **`client/`** — React 19 + react-router. No state-management library:
  the shopping list and weekly plan persist in `localStorage`
  (`recipes.shopping.v1`, `recipes.plan.v1`) and self-heal if a recipe
  file is renamed or deleted.
- **`scripts/`** — the `npm start` launcher and the recipe validator.

All app state is per-browser. There is no database and nothing to back up;
deleting the two localStorage keys resets the shopping list and planner.

## The recipe format contract

The parser implements the template documented in the repo's `CLAUDE.md`.
In short, a recipe must have:

- exactly one `### Title`
- `**Servings:** N …` and `**Per serving:** X cal | Xg protein | Xg fat | Xg carbs`
  (pantry recipes may use `**Yield:** …` instead, macros optional)
- `**Ingredients:**` with `- ` bullets, optionally under `_Group:_` headers
- `**Instructions:**` with `1.`-numbered steps, optionally under `_Phase:_`
  headers (numbering continues across phases)

It also tolerates: a `TODO …` line above Servings, a `**Per 100g:** …`
line, suffixes in Servings (`12 muffins`, `4 (690g each)`), and trailing
`**Freeze/Thaw/Reheat/Serve/Storage/Notes:**` sections in inline or
bullet-list form. Unknown `**Header:**` lines are kept (shown under Notes)
and flagged as warnings.

Ingredient lines parse best as `<qty><unit> <name>, <note>` — e.g.
`454g (1 lb) ground turkey (93/7)` or `2-3 TBSP maple syrup`. Lines without
a leading quantity (`Salt to taste`) are fine; they pass through scaling
and shopping lists verbatim under "Check manually".

**After editing recipes, run `npm run validate`.** Problems also surface as
a banner in the app. A parse error never blanks the app — the recipe
renders as best it can.

## Where things live

| To change…                   | Edit…                                                          |
| ---------------------------- | -------------------------------------------------------------- |
| What the parser accepts      | `shared/parser/parseRecipe.ts` (+ fixture tests)               |
| Ingredient line grammar      | `shared/parser/parseIngredient.ts` + `parseIngredient.test.ts` |
| Units / conversions          | `shared/parser/units.ts`                                       |
| Shopping aggregation rules   | `shared/aggregate.ts` + tests                                  |
| Batch scaling display        | `shared/scale.ts` + tests                                      |
| Cook-mode keyboard shortcuts | `client/src/pages/CookPage.tsx` (`bindings`)                   |
| Styling                      | `client/src/styles/global.css` (sectioned)                     |
| Planner slots/days           | `client/src/state/plannerStore.ts`                             |

When a new ingredient shape misparses, add it as a row in
`parseIngredient.test.ts` first, then make it pass. The golden corpus test
(`shared/parser/corpus.test.ts`) parses every real recipe file and fails on
any new error or unallowlisted warning.

## Troubleshooting

- **"This app needs Node 20.19+"** — `nvm install 22 && nvm alias default 22`,
  then relaunch.
- **start.command won't open (Gatekeeper)** — right-click → Open, once.
- **Port 7878 in use** — the launcher detects a running instance and just
  opens the browser; if something else owns the port, change `PORT` in
  `server/index.ts`.
- **Changes to app code not showing** — `npm start` rebuilds only when
  `client/` or `shared/` files are newer than `dist/`; if in doubt,
  `npm run build`. Recipe markdown edits never need a rebuild.
- **Screen still sleeps in cook mode** — the Wake Lock indicator
  ("☀ screen stays on") only appears when the browser grants the lock;
  Low Power Mode can refuse it.
