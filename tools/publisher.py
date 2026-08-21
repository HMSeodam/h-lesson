#!/usr/bin/env python3
"""Hmseodam Learning Lab Publisher
로컬 lesson.json을 content/ 구조에 등록하고 content-index.json을 재생성한 뒤
선택적으로 기존 Git 인증을 이용해 GitHub로 push합니다.
"""
from __future__ import annotations
import json, shutil, subprocess, sys
from pathlib import Path
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

APP_DIR=Path(__file__).resolve().parents[1]

def run(cmd, cwd=APP_DIR):
    return subprocess.run(cmd,cwd=cwd,text=True,capture_output=True,check=False)

def slug_week(v:str)->str:
    digits=''.join(ch for ch in v if ch.isdigit())
    return f"week{int(digits or 1):02d}"

class Publisher(tk.Tk):
    def __init__(self):
        super().__init__(); self.title('Hmseodam Learning Lab Publisher'); self.geometry('720x660'); self.minsize(680,620)
        self.vars={k:tk.StringVar() for k in ['school','year','semester','course','week','lesson','assets','remote']}
        self.vars['school'].set('샘플대학교');self.vars['year'].set('2026');self.vars['semester'].set('2학기');self.vars['course'].set('선과 유식');self.vars['week'].set('01')
        self.make_ui()
    def make_ui(self):
        pad={'padx':16,'pady':7}
        ttk.Label(self,text='강의자료 등록 · GitHub 배포',font=('',18,'bold')).pack(anchor='w',padx=18,pady=(18,4))
        ttk.Label(self,text='lesson.json을 선택하고 학교/학기/과목/주차를 입력하세요. Git 비밀번호나 토큰은 이 프로그램에 저장하지 않습니다.').pack(anchor='w',padx=18,pady=(0,12))
        f=ttk.Frame(self);f.pack(fill='both',expand=True,padx=10)
        fields=[('학교명','school'),('연도','year'),('학기','semester'),('과목명','course'),('주차','week')]
        for r,(label,key) in enumerate(fields):
            ttk.Label(f,text=label).grid(row=r,column=0,sticky='w',**pad);ttk.Entry(f,textvariable=self.vars[key]).grid(row=r,column=1,columnspan=2,sticky='ew',**pad)
        r=len(fields)
        ttk.Label(f,text='lesson.json').grid(row=r,column=0,sticky='w',**pad);ttk.Entry(f,textvariable=self.vars['lesson']).grid(row=r,column=1,sticky='ew',**pad);ttk.Button(f,text='선택',command=self.pick_lesson).grid(row=r,column=2,**pad)
        r+=1;ttk.Label(f,text='이미지/자료 폴더(선택)').grid(row=r,column=0,sticky='w',**pad);ttk.Entry(f,textvariable=self.vars['assets']).grid(row=r,column=1,sticky='ew',**pad);ttk.Button(f,text='선택',command=self.pick_assets).grid(row=r,column=2,**pad)
        r+=1;ttk.Label(f,text='GitHub 저장소 URL(선택)').grid(row=r,column=0,sticky='w',**pad);ttk.Entry(f,textvariable=self.vars['remote']).grid(row=r,column=1,columnspan=2,sticky='ew',**pad)
        r+=1;ttk.Separator(f).grid(row=r,column=0,columnspan=3,sticky='ew',padx=16,pady=12)
        r+=1;ttk.Button(f,text='① 로컬에 자료 등록',command=lambda:self.publish(False)).grid(row=r,column=0,columnspan=3,sticky='ew',padx=16,pady=6)
        r+=1;ttk.Button(f,text='② 등록 + GitHub에 push',command=lambda:self.publish(True)).grid(row=r,column=0,columnspan=3,sticky='ew',padx=16,pady=6)
        r+=1;ttk.Button(f,text='브라우저에서 로컬 미리보기 실행',command=self.preview).grid(row=r,column=0,columnspan=3,sticky='ew',padx=16,pady=6)
        r+=1;self.log=tk.Text(f,height=10,wrap='word');self.log.grid(row=r,column=0,columnspan=3,sticky='nsew',padx=16,pady=12)
        f.columnconfigure(1,weight=1);f.rowconfigure(r,weight=1)
    def pick_lesson(self):
        p=filedialog.askopenfilename(filetypes=[('JSON','*.json')]);
        if p:self.vars['lesson'].set(p)
    def pick_assets(self):
        p=filedialog.askdirectory();
        if p:self.vars['assets'].set(p)
    def write(self,msg):
        self.log.insert('end',msg+'\n');self.log.see('end');self.update_idletasks()
    def validate_json(self,p:Path):
        data=json.loads(p.read_text(encoding='utf-8'))
        if 'metadata' not in data or 'blocks' not in data: raise ValueError('lesson.json에는 metadata와 blocks가 필요합니다.')
        return data
    def publish(self,push:bool):
        try:
            src=Path(self.vars['lesson'].get()).expanduser();
            if not src.is_file(): raise ValueError('lesson.json 파일을 선택하세요.')
            data=self.validate_json(src)
            school=self.vars['school'].get().strip();year=self.vars['year'].get().strip();semester=self.vars['semester'].get().strip();course=self.vars['course'].get().strip();week=self.vars['week'].get().strip()
            if not all([school,year,semester,course,week]): raise ValueError('학교/연도/학기/과목/주차를 모두 입력하세요.')
            data['metadata'].update({'school':school,'year':year,'semester':semester,'course':course,'week':week.zfill(2) if week.isdigit() else week})
            dest=APP_DIR/'content'/school/year/semester/course/slug_week(week);dest.mkdir(parents=True,exist_ok=True)
            (dest/'lesson.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
            self.write(f'✓ 등록: {dest.relative_to(APP_DIR)}')
            assets=self.vars['assets'].get().strip()
            if assets:
                a=Path(assets); target=dest/'assets'
                if target.exists(): shutil.rmtree(target)
                shutil.copytree(a,target);self.write('✓ assets 폴더 복사')
            b=run([sys.executable,str(APP_DIR/'scripts'/'build_index.py')]);self.write(b.stdout.strip() or b.stderr.strip())
            if push:self.git_push(school,course,week)
            else:messagebox.showinfo('완료','로컬 등록이 끝났습니다. 미리보기 버튼으로 확인할 수 있습니다.')
        except Exception as e:
            self.write(f'오류: {e}');messagebox.showerror('오류',str(e))
    def git_push(self,school,course,week):
        if shutil.which('git') is None: raise RuntimeError('Git이 설치되어 있지 않습니다.')
        if not (APP_DIR/'.git').exists():
            r=run(['git','init']);self.write(r.stdout.strip() or r.stderr.strip());run(['git','branch','-M','main'])
        remote=self.vars['remote'].get().strip()
        if remote:
            cur=run(['git','remote','get-url','origin'])
            if cur.returncode==0: run(['git','remote','set-url','origin',remote])
            else: run(['git','remote','add','origin',remote])
            self.write(f'✓ origin: {remote}')
        run(['git','add','.'])
        msg=f'Add {school} {course} week {week}'
        c=run(['git','commit','-m',msg]);self.write(c.stdout.strip() or c.stderr.strip())
        p=run(['git','push','-u','origin','main']);self.write(p.stdout.strip() or p.stderr.strip())
        if p.returncode!=0:
            raise RuntimeError('Git push에 실패했습니다. GitHub 로그인/Git Credential Manager 또는 SSH 설정과 origin URL을 확인하세요.\n'+p.stderr[-800:])
        messagebox.showinfo('완료','GitHub push가 끝났습니다. GitHub Pages Action이 자동 배포합니다.')
    def preview(self):
        import webbrowser, threading, http.server, socketserver, os
        os.chdir(APP_DIR)
        def serve():
            class Handler(http.server.SimpleHTTPRequestHandler): pass
            with socketserver.TCPServer(('127.0.0.1',8000),Handler) as httpd:httpd.serve_forever()
        threading.Thread(target=serve,daemon=True).start();webbrowser.open('http://127.0.0.1:8000')
        self.write('✓ http://127.0.0.1:8000 미리보기 실행')

if __name__=='__main__': Publisher().mainloop()
