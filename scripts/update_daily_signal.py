#!/usr/bin/env python3
"""Update the website's latest daily signal data and optional daily image."""

from __future__ import annotations

import argparse
import json
import shutil
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "public" / "data" / "site-data.json"
DAILY_IMAGE_PATH = ROOT / "public" / "assets" / "daily-signal.png"


def normalize_date(value: str) -> str:
    raw = value.strip().replace("/", "-")
    if len(raw) == 8 and raw.isdigit():
        return f"{raw[:4]}-{raw[4:6]}-{raw[6:]}"
    return raw


def main() -> None:
    parser = argparse.ArgumentParser(description="Update latest 威尔/多芬 signal data.")
    parser.add_argument("--date", required=True, help="Signal date, e.g. 2026-06-04 or 20260604")
    parser.add_argument("--summary-image", help="Optional daily summary image path to copy into the site")
    parser.add_argument("--weiler-status", required=True)
    parser.add_argument("--weiler-entered", required=True)
    parser.add_argument("--weiler-suggestion", required=True)
    parser.add_argument("--duofen-status", required=True)
    parser.add_argument("--duofen-entered", required=True)
    parser.add_argument("--duofen-suggestion", required=True)
    args = parser.parse_args()

    with DATA_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)

    data["meta"]["updatedAt"] = normalize_date(args.date)
    data["meta"]["generatedAt"] = datetime.now().isoformat(timespec="seconds")
    data["latest"]["marketDate"] = normalize_date(args.date)

    data["latest"]["weiler"]["status"] = args.weiler_status
    data["latest"]["weiler"]["enteredAt"] = normalize_date(args.weiler_entered)
    data["latest"]["weiler"]["suggestion"] = args.weiler_suggestion

    data["latest"]["duofen"]["status"] = args.duofen_status
    data["latest"]["duofen"]["enteredAt"] = normalize_date(args.duofen_entered)
    data["latest"]["duofen"]["suggestion"] = args.duofen_suggestion

    with DATA_PATH.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    if args.summary_image:
        source = Path(args.summary_image).expanduser().resolve()
        if not source.exists():
            raise FileNotFoundError(f"Daily image not found: {source}")
        shutil.copyfile(source, DAILY_IMAGE_PATH)

    print(f"Updated daily signal for {data['latest']['marketDate']}")
    if args.summary_image:
        print(f"Copied image to {DAILY_IMAGE_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
