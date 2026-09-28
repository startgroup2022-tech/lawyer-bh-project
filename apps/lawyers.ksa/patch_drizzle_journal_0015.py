#!/usr/bin/env python3
import json
from pathlib import Path

journal_path = Path("drizzle/meta/_journal.json")
journal = json.loads(journal_path.read_text())

entries = journal.setdefault("entries", [])
tags = {entry.get("tag") for entry in entries}

if "0015_legal_cases" not in tags:
    entries.append({
        "idx": 15,
        "version": "7",
        "when": 1783100000000,
        "tag": "0015_legal_cases",
        "breakpoints": True,
    })

entries.sort(key=lambda entry: entry["idx"])
for idx, entry in enumerate(entries):
    entry["idx"] = idx

journal_path.write_text(
    json.dumps(journal, ensure_ascii=False, indent=2) + "\n"
)

print("Updated", journal_path)
print("Last entry:", entries[-1])
