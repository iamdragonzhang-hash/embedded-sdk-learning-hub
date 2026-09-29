#!/usr/bin/env python3
"""Validate shipped archive and daily quiz JSON without calling an API."""
import json
from pathlib import Path
from generate_daily import validate

DATA = Path(__file__).resolve().parents[1] / "site" / "data"


def main():
    archive = json.loads((DATA / "archive.json").read_text(encoding="utf-8"))
    manifest = json.loads((DATA / "manifest.json").read_text(encoding="utf-8"))
    ids = set()
    for batch in archive["batches"]:
        for q in batch["questions"]:
            assert q["id"] not in ids
            ids.add(q["id"])
    assert len(set(manifest["days"])) == len(manifest["days"])
    for day in manifest["days"]:
        d = json.loads((DATA / "days" / (day + ".json")).read_text(encoding="utf-8"))
        assert d["date"] == day
        validate([{k: v for k, v in q.items() if k != "id"} for q in d["questions"]])
        for q in d["questions"]:
            assert q["id"] not in ids
            ids.add(q["id"])
    print("PASS:", len(ids), "unique questions; daily batches:", len(manifest["days"]))


if __name__ == "__main__":
    main()
