@AGENTS.md

<!-- studz-router:start -->
# Claude Code specifics

Model routing: main session = Sonnet. Escalate to the `opus-debugger` subagent after one failed attempt, failed verification, or medium-complexity/multi-module bugs. Use `fable-escalation` only after two failed Opus attempts or for security/auth, payments, production data, or architecture (a hook asks Jake to approve). Hand routine follow-up back to Sonnet, and say which tier did what in your summary.

Memory: read `memory-bank/activeContext.md` and `memory-bank/progress.md` at the start. At the end of any task that changed code or made a decision, run the `memory-keeper` subagent (or `/update-memory`) and include the memory-bank changes in the same commit/PR. In cloud sessions this in-session update is the only memory update, so don't skip it.
<!-- studz-router:end -->
