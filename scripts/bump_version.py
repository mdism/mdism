#!/usr/bin/env python3
"""Bump the website version in one go.

Usage (from the repo root):
    python scripts/bump_version.py 2.2.0 "Added case-study pages"

Updates:
  - site/version.json        (read by the footer)
  - CHANGELOG.md             (new entry at the top)
  - ?v=<version> on the CSS/JS links in every site/**/*.html
    so browsers fetch the new files instead of a cached copy
"""
import datetime
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = ROOT / "site"


def main():
    if len(sys.argv) < 3 or not re.fullmatch(r"\d+\.\d+\.\d+", sys.argv[1]):
        sys.exit('Usage: python scripts/bump_version.py <MAJOR.MINOR.PATCH> "<what changed>"')
    version, notes = sys.argv[1], sys.argv[2]
    today = datetime.date.today().isoformat()

    vfile = SITE / "version.json"
    old = json.loads(vfile.read_text(encoding="utf-8"))["version"]
    vfile.write_text(json.dumps({"version": version, "date": today, "notes": notes}, indent=2) + "\n", encoding="utf-8")

    cl = ROOT / "CHANGELOG.md"
    text = cl.read_text(encoding="utf-8")
    entry = f"## [{version}] - {today}\n- {notes}\n\n"
    text = text.replace("## [", entry + "## [", 1)
    cl.write_text(text, encoding="utf-8")

    pattern = re.compile(r'(assets/(?:css/site\.css|js/site\.js))(\?v=[\w.]+)?"')
    for html in SITE.rglob("*.html"):
        src = html.read_text(encoding="utf-8")
        new = pattern.sub(lambda m: f'{m.group(1)}?v={version}"', src)
        new = re.sub(r'(id="ver"[^>]*>)v[\w.]+', rf'\g<1>v{version}', new)
        if new != src:
            html.write_text(new, encoding="utf-8")

    print(f"Version {old} -> {version} ({today}). Commit, push, then deploy in cPanel.")


if __name__ == "__main__":
    main()
