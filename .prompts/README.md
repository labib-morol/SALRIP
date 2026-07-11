# .prompts/ — AI-usage audit trail

Every commit gets a Markdown file here containing the **actual user prompts**
pulled from the live Claude Code session transcript, plus a `Prompt-Log:`
trailer in the commit message pointing to it. Nothing is typed from memory.

## How it works

1. `prepare-commit-msg` runs `scripts/capture_prompt.py`.
2. The script finds this repo's newest session transcript under
   `~/.claude/projects/<repo-slug>/*.jsonl`, selects genuine user prompts with
   `timestamp` newer than the previous commit, redacts obvious secrets, and
   writes `.prompts/<ts>-<hash>.md`.
3. The hook stages that file (so it lands in the same commit) and appends
   `Prompt-Log: .prompts/<file>` to the message.

## JSON sidecar

Each `<file>.md` gets a `<file>.json` sidecar — metadata for a future
(Docker-based) historical analyzer, **decoupled from SonarQube**:

```json
{
  "schemaVersion": 1,
  "commit": "<short sha, filled by post-commit; null until then>",
  "promptFile": "<the .md filename>",
  "promptSummaryOneLiner": "<heuristic or PROMPT_SUMMARY-overridden one-liner>",
  "timestamp": "<ISO>",
  "filesChanged": ["<git diff --cached --name-only>"],
  "agent": "Claude Code"
}
```

Notes:
- `commit` is `null` at capture time (a commit can't contain its own hash);
  `post-commit` writes the real sha into the sidecar, which the **next** commit
  sweeps in. The final commit's sidecar sha therefore trails by one commit.
- `promptSummaryOneLiner` is **not** an LLM summary — the hook runs a plain
  script. It is a heuristic extract, overridable via the `PROMPT_SUMMARY` env
  var at commit time. The future analyzer can regenerate a better one from the
  `.md`. The one-liner is also appended to the `Prompt-Log:` commit trailer.

## Honesty caveat (read this)

The captured window is **"user prompts since the previous commit."** That
correlates with the diff but is **not** a cryptographic proof that a specific
prompt produced a specific line — hand-edits happen, and one commit can bundle
several prompts. We claim exactly what is true and no more. If the organizers
require stricter 1:1 mapping, commit more granularly (one logical prompt → one
commit) and the window collapses to that single prompt.

## Redaction

`capture_prompt.py` scrubs common secret shapes (api keys, bearer/JWT, AWS,
GitHub tokens, `password=`) before writing. It is best-effort, not a guarantee —
prompts become **permanent git history**, so avoid pasting live credentials or
real customer rows into the chat.
