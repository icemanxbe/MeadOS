#!/usr/bin/env python3
"""Parses a headless-Chrome DOM dump of test.html and fails the build if the
in-page unit checks (see test.html) didn't all pass.

test.html computes its own summary synchronously once every module has
loaded via document.write (see core/boot/00-manifest.js) — by the time
`--dump-dom` captures the page, #summary already holds the final
"<check>x ALL PASS  (N/N)" or "<check>x M FAILED  (pass/total)" text.

Usage: python3 ci/check_test_results.py <path-to-dumped-dom.html>
"""
import re
import sys

if len(sys.argv) != 2:
    print("usage: check_test_results.py <dumped-dom.html>", file=sys.stderr)
    sys.exit(2)

with open(sys.argv[1], "r", encoding="utf-8", errors="replace") as f:
    dom = f.read()

m = re.search(r'<div id="summary"[^>]*>(.*?)</div>', dom, re.S)
if not m:
    print("Could not find #summary in the dumped DOM — the page likely failed to load or run at all.")
    print("--- first 2000 chars of dump ---")
    print(dom[:2000])
    sys.exit(1)

summary = re.sub(r"<[^>]+>", "", m.group(1)).strip()
print("test.html summary: %s" % summary)

if "FAILED" in summary or "ALL PASS" not in summary:
    # Pull out the individual failing assertion lines for a useful CI log.
    fails = re.findall(r'<div (?!id="summary")[^>]*class="fail"[^>]*>(.*?)</div>', dom, re.S)
    if fails:
        print("\nFailing checks:")
        for f in fails:
            print(" - " + re.sub(r"<[^>]+>", "", f).strip())
    sys.exit(1)

print("All in-page unit checks passed.")
