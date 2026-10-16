# Mail Merge khoản vay Agribank

CLI đọc Excel `.xlsx`, cho chọn cột nhóm/cột chung/cột lặp, gộp nhiều khoản vay thành 1 thư/khách hàng, xuất `.docx`, tách dòng lỗi ra `.xlsx`.

## Dùng
```bash
python3 mailmerge_tool/loan_mailmerge.py data.xlsx --list-columns
python3 mailmerge_tool/loan_mailmerge.py data.xlsx \
  --group-col brcd \
  --common-cols brcd,custnm,addr1 \
  --repeat-cols apprseq,Sum \
  --out thu_xac_nhan.docx \
  --errors-out dong_loi.xlsx
```

Xem trước không xuất file:
```bash
python3 mailmerge_tool/loan_mailmerge.py data.xlsx --group-col brcd --common-cols brcd,custnm,addr1 --repeat-cols apprseq,Sum --preview
```

Xuất riêng từng khách:
```bash
python3 mailmerge_tool/loan_mailmerge.py data.xlsx --group-col brcd --common-cols brcd,custnm,addr1 --repeat-cols apprseq,Sum --separate-dir out_docs
```
