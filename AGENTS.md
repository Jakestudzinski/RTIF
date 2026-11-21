# AGENTS.md

Shared instructions for every coding agent on this repo: Claude Code, Codex, Cursor, Devin.
Keep this file short and current. Project-specific facts live here; history lives in `memory-bank/`.

## Project
- Name: RTIF
- What it does: Website and multi-tenant Stripe payment gateway for research-tif.com (Next.js). Public repo: keep notes generic, no business secrets or customer data.
- Owner: Jake Studzinski
- Vercel project: `rtif` (team jake-studzinskis-projects)

## Stack and commands
- Stack: Next.js, TypeScript
- Install: `npm install`
- Dev: `npm run dev`
- Test: _(no test script yet)_
- Build: `npm run build`
- Lint: `npm run lint`

## Conventions
- Work on a branch or a git worktree; never push straight to `main`.
- Never commit secrets. Env vars go in `.env.local` (not committed).

## Memory bank (all agents)
Before starting work, read:
1. `memory-bank/activeContext.md` - current focus and next steps
2. `memory-bank/progress.md` - what works, what's left, known issues

Read `memory-bank/decisions.md` and `memory-bank/systemPatterns.md` only when making architecture-level changes.

When you finish a task that changed code or made a decision, update the memory bank in the same commit/PR:
- `activeContext.md` - rewrite: current focus, next steps
- `progress.md` - update done / left / known issues
- `decisions.md` - append `## YYYY-MM-DD - <decision>` with Context / Decision / Why
- `sessions/YYYY-MM-DD-HHmm-<agent>.md` - short log: goal, files changed, outcome, open threads

Facts only. No secrets, API keys, or customer PII in memory files.

## Model / effort routing (any tool that supports model choice)
- Default to the fast/cheap model for planning, small fixes, lint/type/build errors, log reading.
- Escalate to the strongest standard model when a fix attempt fails, verification fails, or the bug spans 2+ modules.
- Use the top-tier model only after two failed escalations or for security/auth, payments, production data, or architecture. Ask Jake first.

## Claude operations (added by the SOP-029 rollout)
- Requests: fixes, improvements and new-site requests come in through Studz Requests (see SOP-029). Claude plans first, then opens a PR; it never pushes straight to `main`.
- CI: `.github/workflows/ci.yml` runs no tests (none exist yet) and a type-error ratchet (fails only on NEW errors; baseline in `.github/ci/tsc-baseline.json`), then labels the PR `risk:green|yellow|red` from `.github/ci/risk-paths.json`. Require the check **CI gate**.
- Risk tiers: green may auto-merge once CI passes; yellow needs a second-reviewer pass and a short objection window; red (money, auth, customer data, schema, env/config, CI files) needs Jake. This repo has no passing automated tests, so the floor is **yellow**: nothing here auto-merges until tests exist.
- Never commit secrets. No customer personal data in issues, PRs or memory files.
