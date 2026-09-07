#!/usr/bin/env python3
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content"
entries = []


def decode_hash_unicode(value: str) -> str:
    """Decode names produced by some zip tools, e.g. #Ub3d9 -> 동."""
    def repl(m):
        try:
            return chr(int(m.group(1), 16))
        except Exception:
            return m.group(0)
    return re.sub(r"#U([0-9A-Fa-f]{4})", repl, str(value))


def week_value(folder_name: str) -> str:
    m = re.search(r"\d+", folder_name)
    return f"{int(m.group()):02d}" if m else decode_hash_unicode(folder_name)


def is_placeholder(v: str) -> bool:
    s = str(v or "").strip()
    return not s or s in {"학교명", "연도", "학기", "과목명", "주차", "주차 제목", "도서명", "저자명"} or s.startswith("[")


for p in CONTENT.rglob("lesson.json"):
    try:
        raw = p.read_text(encoding="utf-8-sig").strip()
        if not raw:
            raise ValueError("빈 lesson.json")
        data = json.loads(raw)
    except Exception as e:
        print(f"[skip] {p}: {e}")
        continue

    rel_content = p.relative_to(CONTENT)
    parts = rel_content.parts
    if len(parts) < 6:
        print(f"[skip] 폴더 구조가 올바르지 않음: {p}")
        continue

    folder_school, folder_year, folder_semester, folder_course, week_folder = [decode_hash_unicode(x) for x in parts[:5]]
    m = data.get("metadata", {})
    rel = p.relative_to(ROOT).as_posix()

    entry = {
        "school": folder_school if is_placeholder(m.get("school")) else str(m.get("school")),
        "year": folder_year if is_placeholder(m.get("year")) else str(m.get("year")),
        "semester": folder_semester if is_placeholder(m.get("semester")) else str(m.get("semester")),
        "course": folder_course if is_placeholder(m.get("course")) else str(m.get("course")),
        "week": week_value(week_folder) if is_placeholder(m.get("week")) else str(m.get("week")).zfill(2) if str(m.get("week")).isdigit() else str(m.get("week")),
        "title": str(m.get("title") or f"{folder_course} {week_value(week_folder)}주차"),
        "lessonPath": rel,
    }
    entries.append(entry)


def natural_week(x):
    m = re.search(r"\d+", x.get("week", ""))
    return int(m.group()) if m else 999


entries.sort(key=lambda x: (x["school"], x["year"], x["semester"], x["course"], natural_week(x)))
out = {"generatedBy": "scripts/build_index.py", "indexMode": "folder-path-display-safe", "entries": entries}
(ROOT / "content-index.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"content-index.json 생성 완료: {len(entries)}개 수업")
for e in entries:
    print(f'  - {e["school"]} / {e["year"]} / {e["semester"]} / {e["course"]} / {e["week"]}주차')
