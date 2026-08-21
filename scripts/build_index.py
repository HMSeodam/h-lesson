#!/usr/bin/env python3
from pathlib import Path
import json, re

ROOT=Path(__file__).resolve().parents[1]
CONTENT=ROOT/'content'
entries=[]
for p in CONTENT.rglob('lesson.json'):
    try:
        data=json.loads(p.read_text(encoding='utf-8'))
    except Exception as e:
        print(f'[skip] {p}: {e}')
        continue
    m=data.get('metadata',{})
    rel=p.relative_to(ROOT).as_posix()
    entries.append({
        'school':str(m.get('school','')),
        'year':str(m.get('year','')),
        'semester':str(m.get('semester','')),
        'course':str(m.get('course','')),
        'week':str(m.get('week','')),
        'title':str(m.get('title','')),
        'lessonPath':rel
    })

def natural_week(x):
    m=re.search(r'\d+',x.get('week',''))
    return int(m.group()) if m else 999
entries.sort(key=lambda x:(x['school'],x['year'],x['semester'],x['course'],natural_week(x)))
out={'generatedBy':'scripts/build_index.py','entries':entries}
(ROOT/'content-index.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'content-index.json 생성 완료: {len(entries)}개 수업')
