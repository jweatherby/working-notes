# Testing Conventions

## Unit tests — `**/tests/*.test.spec.ts`

- Colocated with the code: `src/api/{domain}/tests/`, `src/shared/*/tests/`, `src/lib/common/tests/`, `cli/tests/`, `scripts/backup/tests/`
- Build dependencies with `createTestRegistry({ ...overrides })` from `src/shared/registry.test.ts`. Mock only the Prisma models and storage calls the operation touches, cast with `as unknown as Registry['prisma']`.
- Test logic worth testing: validation (chart specs, CLI argument coercion), planning (migrations, retention), branching and error paths. Don't unit-test straight Prisma passthroughs.
- Run: `bun run test`

## Integration tests — `tests/integration/*.test.ts`

- Run against real SQLite in `./data/test` (`APP_ENV=test`). `setup.ts` **refuses to run** unless the data dir resolves to `./data/test`, so it can never wipe the real notebook.
- Before each file, `setup.ts` deletes `./data/test`, creates the database through `ensureDatabase()` (the real migrator), and seeds three people: `person_alice`, `person_bob`, `person_carol`.
- Call operations with `getRegistry()`. Tests run single-fork and share the database within a file.
- Coverage:
  - `health`
  - `notebook`: person → team → note → todo → tag
  - `reports`: branding resolution, chart validation
  - `migrate`: fresh, idempotent, edited-migration refusal
  - `backup`: change detection, hard links, restore round trip, refusal while the app runs
  - `cli`: `bin/wnotes` from another directory with no server
  - `mcp`: `wnotes mcp` over stdio: tool list, calls, errors as tool results, stdout kept to protocol messages
- Run: `bun run test:integration`

## Manual verification

- `bun run check` must have zero errors. It also type-checks `cli/` and `scripts/`.
- UI changes: run `bun run dev` and check the page in the browser
- API changes: exercise the procedure through `wnotes`
