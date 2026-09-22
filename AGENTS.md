# AGENTS.md

## Operational Commands

- Package manager: `bun` only. `bun.lock` is the only lockfile in the repo — do not run `npm install`, `yarn`, or `pnpm`.
- Install: `bun install`
- Run app (API server + Vite together): `bun run dev`
- Run API server alone (port 3002, hot reload): `bun run server`
- Test: `bun run test` (single run) / `bun run test:watch` (watch mode)
- Lint: `bun run lint`
- Build: `bun run build`

## Golden Rules

### Security Boundary — never leak real API key values to the client

`GET /api/config` must only return **booleans** indicating whether server-side env keys exist, never the key values themselves.
Evidence: `server/index.ts:147-157` returns `envKeys: { anthropic: !!ENV_KEYS.anthropic, google: !!ENV_KEYS.google }`; `.env` is gitignored (`.gitignore:29`).
Do: keep any new config/debug endpoint returning only presence flags for secrets.
Don't: echo `apiKey`, `ANTHROPIC_API_KEY`, or `GOOGLE_API_KEY` back in any response body or log line.

### Hard Constraint — AI-generated code must stay plain-JS and end in `render(...)`

Generated code runs through `react-live` in `noInline` mode (`src/components/LivePreview.tsx:14`), which does not strip TypeScript syntax and only paints a preview if a `render(...)` call exists.
Evidence: the system prompt explicitly bans imports and TS syntax and requires a trailing `render(<Component />)` call (`server/index.ts:9-20`); `ensureRenderCall` (`server/generator.ts:16-24`) auto-injects the call when the model forgets it.
Do: if you change the system prompt or the preview renderer, keep both in sync — plain-JS-only output and a guaranteed `render()` call.
Don't: pass generated code straight to `LiveProvider` without normalizing it first.

### Double Defense — two independent passes clean every AI response before preview

Every response is piped through `stripCodeFences` then `ensureRenderCall` (`server/generator.ts:5-24`, wired together at `server/index.ts:188`) before it reaches `LivePreview`.
Evidence: each function has its own dedicated test suite (`server/generator.test.ts`) covering fence-stripping and render-injection independently.
Do: keep these two normalization steps separate and independently testable.
Don't: collapse them into a single pass or remove one — either the fenced markdown or a missing `render()` call will silently break the live preview.

### Asymmetry — only the Google path has model fallback

`callGoogle` retries across `GOOGLE_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash']` via `withModelFallback` (`server/index.ts:5, 134-136`), while `callAnthropic` calls a single hardcoded model with no fallback (`server/index.ts:68-96`).
Evidence: `server/fallback.ts` exists solely to serve the Google path; there is no equivalent wrapper for Anthropic.
Do: assume this asymmetry is intentional (Gemini has needed retry logic that Claude has not) — if you add a new Anthropic model list, reuse `withModelFallback` rather than inventing a second retry mechanism.
Don't: assume the two providers must be handled identically.

### Test Boundary — side-effecting code has no tests, pure logic does

`server/generator.ts` and `server/fallback.ts` are pure functions with full unit tests (`server/generator.test.ts`, `server/fallback.test.ts`); `server/index.ts` (the `Bun.serve` handler making real HTTP calls to Anthropic/Google) has none. On the frontend, `PromptInput.tsx` is tested (`src/components/PromptInput.test.tsx`); `App.tsx`, `useComponentGenerator.ts`, `ComponentCard.tsx`, `CodeView.tsx`, and `LivePreview.tsx` are not.
Do: when adding new logic, extract it into a pure function (like `generator.ts`/`fallback.ts`) and add a matching `*.test.ts` — that's the pattern the team follows.
Don't: add non-trivial branching logic directly inside `server/index.ts`'s fetch handler or inside stateful components expecting it to be covered by existing tests — it won't be.

## Project Context

Prompt-to-React-component generator: a user types a description, a Bun API server proxies it to Anthropic Claude or Google Gemini, and the result renders instantly via `react-live`.

Tech stack: React 19, TypeScript, Vite, Bun (API server + runtime), react-live, Vitest, ESLint 9 (flat config).

## Standards & References

- Setup/usage docs live in `README.md` — don't duplicate them here.
- Source comments are written in Korean and explain *why* (rationale, invariants), not *what* — follow that convention (see `server/generator.ts:1-2`, `server/fallback.ts:1-2`).
- Vite dev server proxies `/api/*` to the Bun server on port `3002` (`vite.config.ts:8-15`) — don't hardcode `http://localhost:3002` in frontend fetch calls.

**Maintenance Policy:** if a Golden Rule above no longer matches the code (e.g. the asymmetric fallback is unified, or a previously-untested file gains tests), propose an update to this file rather than leaving it stale.
