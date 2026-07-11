#!/usr/bin/env python3
"""Extract the real user prompts that led to the current commit.

Reads the live Claude Code session transcript (JSONL) for THIS repo, selects
genuine user prompts newer than the previous commit, redacts obvious secrets,
writes them to .prompts/<ts>-<hash>.md, and prints that relative path so the
git hook can add a `Prompt-Log:` trailer and stage the file.

Honesty note: this captures user prompts in the window since the last commit.
That correlates with, but is not a proof of, exactly which prompt produced each
line of the diff (hand-edits and multi-prompt commits exist). The trailer claim
is deliberately "prompts since last commit", not "the one prompt for this code".
"""
import argparse
import datetime
import glob
import hashlib
import json
import os
import re
import subprocess
import sys


def norm(p):
    return os.path.normcase(os.path.normpath(p)) if p else p


def find_transcript(repo_root):
    """Newest JSONL under ~/.claude/projects/*/ whose entries' cwd == repo_root."""
    home = os.path.expanduser("~")
    target = norm(repo_root)
    best, best_m = None, -1.0
    for f in glob.glob(os.path.join(home, ".claude", "projects", "*", "*.jsonl")):
        cwd = None
        try:
            with open(f, encoding="utf-8") as fh:
                for i, line in enumerate(fh):
                    if i > 300:
                        break
                    if '"cwd"' in line:
                        try:
                            cwd = json.loads(line).get("cwd")
                        except json.JSONDecodeError:
                            cwd = None
                        if cwd:
                            break
        except OSError:
            continue
        if cwd and norm(cwd) == target:
            m = os.path.getmtime(f)
            if m > best_m:
                best, best_m = f, m
    return best


SECRET_PATTERNS = [
    (re.compile(r'(?i)\b(api[_-]?key|secret|token|password|passwd|pwd|authorization|bearer)\b\s*[:=]\s*\S+'),
     r'\1=[REDACTED]'),
    (re.compile(r'\bsk-[A-Za-z0-9]{16,}\b'), '[REDACTED-KEY]'),
    (re.compile(r'\bAKIA[0-9A-Z]{16}\b'), '[REDACTED-AWS]'),
    (re.compile(r'\bghp_[A-Za-z0-9]{20,}\b'), '[REDACTED-GH]'),
    (re.compile(r'\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b'), '[REDACTED-JWT]'),
]

WRAPPER_RE = re.compile(
    r'</?(command-name|command-message|command-args|local-command-stdout|local-command-caveat)>',
    re.S,
)
REMINDER_RE = re.compile(r'<system-reminder>.*?</system-reminder>', re.S)
IDE_TAG_RE = re.compile(r'<ide_opened_file>.*?</ide_opened_file>', re.S)
SLASH_ONLY_RE = re.compile(r'^/?[a-z][a-z0-9-]*$', re.I)


def redact(text):
    for pat, rep in SECRET_PATTERNS:
        text = pat.sub(rep, text)
    return text


def extract_text(msg):
    c = msg.get("content")
    if isinstance(c, str):
        return c
    if isinstance(c, list):
        return "\n".join(
            b.get("text", "") for b in c
            if isinstance(b, dict) and b.get("type") == "text"
        )
    return ""


def clean_prompt(text):
    text = REMINDER_RE.sub("", text)
    text = IDE_TAG_RE.sub("", text)
    text = WRAPPER_RE.sub("", text)
    # Drop lines that are only a slash-command / command echo (e.g. "/clear",
    # "grill-me"); keep everything with real content (args, follow-ups).
    kept = [ln for ln in text.splitlines() if not SLASH_ONLY_RE.match(ln.strip())]
    return "\n".join(kept).strip()


def staged_files(repo):
    """Files staged for this commit (the code the prompts changed)."""
    try:
        out = subprocess.run(
            ["git", "-C", repo, "diff", "--cached", "--name-only"],
            capture_output=True, text=True, timeout=10, check=False,
        )
        return [ln for ln in out.stdout.splitlines() if ln.strip()]
    except Exception:
        return []


def summarize(prompts):
    """One-line summary. NOT an LLM summary — the hook has no model access.
    Prefers an explicit PROMPT_SUMMARY override, else a heuristic extract of the
    first substantive prompt. A future model-backed analyzer can regenerate a
    better one from the .md file (that's why the format stays decoupled)."""
    override = os.environ.get("PROMPT_SUMMARY", "").strip()
    if override:
        return override
    for _, text in prompts:
        t = " ".join(text.split())
        if len(t) >= 30:
            first = re.split(r"(?<=[.!?])\s", t, maxsplit=1)[0]
            return first if len(first) <= 160 else first[:157] + "..."
    t = " ".join(prompts[-1][1].split())
    return t if len(t) <= 160 else t[:157] + "..."


def parse_ts(ts):
    if not ts:
        return None
    try:
        return datetime.datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except ValueError:
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--since", default="", help="ISO lower bound (exclusive)")
    ap.add_argument("--outdir", required=True)
    args = ap.parse_args()

    tf = find_transcript(args.repo)
    if not tf:
        sys.stderr.write("capture_prompt: no transcript found for this repo\n")
        return 0

    since = parse_ts(args.since) if args.since else None

    prompts = []
    with open(tf, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                o = json.loads(line)
            except json.JSONDecodeError:
                continue
            if o.get("type") != "user" or o.get("isMeta"):
                continue
            msg = o.get("message")
            if not isinstance(msg, dict) or msg.get("role") != "user":
                continue
            tsd = parse_ts(o.get("timestamp"))
            if since and tsd and tsd <= since:
                continue
            clean = clean_prompt(extract_text(msg))
            if clean:
                prompts.append((o.get("timestamp"), clean))

    if not prompts:
        sys.stderr.write("capture_prompt: no new user prompts since last commit\n")
        return 0

    if len(prompts) > 50:  # avoid dumping an entire fresh session on first commit
        prompts = prompts[-50:]

    lines = [
        "# Prompts captured for this commit",
        f"_source transcript: {os.path.basename(tf)}_",
        f"_captured: {datetime.datetime.now().astimezone().isoformat(timespec='seconds')}_",
        "_scope: user prompts since the previous commit (see .prompts/README.md for the honesty caveat)_",
        "",
    ]
    for ts, clean in prompts:
        lines.append(f"## {ts or 'unknown-time'}")
        lines.append("")
        lines.append(redact(clean))
        lines.append("")
    content = "\n".join(lines) + "\n"

    digest = hashlib.sha1(content.encode("utf-8")).hexdigest()[:12]
    fname = f"{datetime.datetime.now().strftime('%Y%m%dT%H%M%S')}-{digest}.md"
    os.makedirs(args.outdir, exist_ok=True)
    with open(os.path.join(args.outdir, fname), "w", encoding="utf-8") as fh:
        fh.write(content)

    # JSON sidecar — metadata for a future (Docker-based) historical analyzer.
    # Kept fully decoupled from SonarQube. `commit` is null here (the sha is not
    # knowable before the commit exists); post-commit fills it in.
    summary = summarize(prompts)
    sidecar = {
        "schemaVersion": 1,
        "commit": None,
        "promptFile": fname,
        "promptSummaryOneLiner": summary,
        "timestamp": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
        "filesChanged": staged_files(args.repo),
        "agent": "Claude Code",
    }
    sidecar_name = fname[:-3] + ".json"
    with open(os.path.join(args.outdir, sidecar_name), "w", encoding="utf-8") as fh:
        json.dump(sidecar, fh, indent=2)
        fh.write("\n")

    # stdout -> git hook: "<md relpath>\t<one-line summary>"
    print(f".prompts/{fname}\t{summary}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
