#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json, tempfile, zipfile
from pathlib import Path
from flask import Flask, request, send_file, render_template_string, redirect, url_for, flash
from loan_mailmerge import read_excel, split_and_group, generate, parse_cols

app=Flask(__name__)
app.secret_key='mailmerge-local'
WORK=Path(tempfile.gettempdir())/'agribank_mailmerge'
WORK.mkdir(exist_ok=True)

HTML='''<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Mail Merge khoản vay</title>
<style>body{font-family:Arial,sans-serif;margin:24px;max-width:1100px}label{display:block;margin-top:12px;font-weight:bold}select,input{padding:8px;margin:4px 0;min-width:320px}.cols{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}.box{border:1px solid #ddd;border-radius:8px;padding:16px;margin:16px 0}.err{color:#b00020}.ok{color:#087b2f}button{padding:10px 16px;background:#a00000;color:white;border:0;border-radius:6px}.muted{color:#666}textarea{width:100%;height:90px}</style></head><body>
<h2>Mail Merge khoản vay Agribank</h2>
<p class="muted">1 khách hàng = 1 thư; bảng trong thư tự có đủ các khoản vay.</p>
{% with messages=get_flashed_messages() %}{% if messages %}<div class="box err">{% for m in messages %}<div>{{m}}</div>{% endfor %}</div>{% endif %}{% endwith %}
{% if not columns %}
<form method="post" enctype="multipart/form-data" action="/upload" class="box">
<label>File Excel (.xlsx)</label><input type="file" name="excel" accept=".xlsx" required>
<br><button>Tải lên</button>
</form>
{% else %}
<div class="box ok">Đã đọc {{rows}} dòng. File: {{file_id}}</div>
<form method="post" action="/run" class="box">
<input type="hidden" name="file_id" value="{{file_id}}">
<label>Cột nhóm khách hàng</label><select name="group_col">{% for c in columns %}<option>{{c}}</option>{% endfor %}</select>
<div class="cols">
<div><label>Thông tin chung khách hàng</label>{% for c in columns %}<div><input type="checkbox" name="common_cols" value="{{c}}"> {{c}}</div>{% endfor %}</div>
<div><label>Thông tin lặp theo khoản vay</label>{% for c in columns %}<div><input type="checkbox" name="repeat_cols" value="{{c}}"> {{c}}</div>{% endfor %}</div>
<div><label>Tùy chọn</label><div><input type="checkbox" name="separate" value="1"> Xuất riêng từng khách</div><label>Tiêu đề thư</label><input name="title" value="THƯ XÁC NHẬN SỐ DƯ TÀI KHOẢN"></div>
</div>
<br><button name="mode" value="preview">Xem trước</button> <button name="mode" value="export">Xuất file Word</button>
</form>
{% endif %}
{% if summary %}<div class="box"><h3>Kết quả xem trước</h3><p>Thư sẽ tạo: <b>{{summary.letters}}</b></p><p>Dòng lỗi bị loại: <b>{{summary.error_rows}}</b></p><p>Tổng dòng dữ liệu: {{summary.input_rows}}</p><textarea readonly>{{summary_json}}</textarea></div>{% endif %}
{% if download %}<div class="box ok"><h3>Đã xuất xong</h3><p><a href="{{download}}">Tải kết quả</a></p><p><a href="{{errors}}">Tải danh sách dòng lỗi</a></p></div>{% endif %}
</body></html>'''

@app.get('/')
def index(): return render_template_string(HTML, columns=None)

@app.post('/upload')
def upload():
    f=request.files.get('excel')
    if not f or not f.filename.endswith('.xlsx'):
        flash('Chỉ nhận file .xlsx'); return redirect('/')
    file_id=next(tempfile._get_candidate_names())+'.xlsx'
    path=WORK/file_id; f.save(path)
    try: cols, rows=read_excel(path)
    except Exception as e:
        flash(str(e)); return redirect('/')
    return render_template_string(HTML, columns=cols, rows=len(rows), file_id=file_id)

@app.post('/run')
def run():
    file_id=request.form['file_id']; path=WORK/file_id
    common=request.form.getlist('common_cols'); repeat=request.form.getlist('repeat_cols')
    group=request.form.get('group_col'); title=request.form.get('title') or 'THƯ XÁC NHẬN SỐ DƯ TÀI KHOẢN'
    try:
        cols, rows=read_excel(path)
        groups, errors=split_and_group(rows, group, common, repeat)
        summary={'input_rows':len(rows),'letters':len(groups),'error_rows':len(errors),'groups':[{'key':g['key'],'loan_count':len(g['loans']),'excel_rows':g['rows']} for g in groups]}
        if request.form.get('mode')=='preview':
            return render_template_string(HTML, columns=cols, rows=len(rows), file_id=file_id, summary=type('S',(),summary), summary_json=json.dumps(summary,ensure_ascii=False,indent=2))
        out=WORK/(file_id+'.docx'); err=WORK/(file_id+'_errors.xlsx')
        sep_dir=None
        if request.form.get('separate'):
            sep_dir=WORK/(file_id+'_docs')
        generate(path,out,group,common,repeat,title=title,separate_dir=sep_dir,errors_xlsx=err)
        if sep_dir:
            z=WORK/(file_id+'.zip')
            with zipfile.ZipFile(z,'w') as zz:
                for p in sep_dir.glob('*.docx'): zz.write(p,p.name)
            out=z
        return render_template_string(HTML, columns=cols, rows=len(rows), file_id=file_id, summary=type('S',(),summary), summary_json=json.dumps(summary,ensure_ascii=False,indent=2), download='/download/'+out.name, errors='/download/'+err.name)
    except Exception as e:
        flash(str(e)); return redirect('/')

@app.get('/download/<name>')
def download(name): return send_file(WORK/name, as_attachment=True)

if __name__=='__main__': app.run(host='127.0.0.1', port=8765, debug=False)
