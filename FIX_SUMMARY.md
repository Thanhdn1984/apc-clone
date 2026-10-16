# FIX SUMMARY - NGUYÊN NHÂN GỐC

## VẤN ĐỀ 1: Dữ liệu mất khi chuyển tab ✅ ĐÃ GIẢI QUYẾT
- **Nguyên nhân:** InputField + ListField chỉ lưu khi blur
- **Giải pháp:** Lưu ngay khi user type (onChange mỗi keystroke)
- **Status:** HOẠT ĐỘNG ĐÚNG (log cho thấy data giữ lại)

## VẤN ĐỀ 2: Formula đọc số SAI ❌ NGUYÊN NHÂN GỐC
### Phân tích:
```
Input: kv_so_tien_vay = 1450000000 (1.45 tỷ)
Output: docso(kv_so_tien_vay) = "Một trăm bốn mươi lăm triệu đồng" (145 triệu)
```

### Nguyên nhân THẬT SỰ:
1. `evaluateAllFormulas(rawData)` → return `evaluatedData` với formula ĐÚNG
2. `masterDataHandler` so sánh: `JSON.stringify(evaluatedData) !== JSON.stringify(rawData)`
3. `evaluatedData` có formula fields, `rawData` KHÔNG có → LUÔN khác nhau
4. NHƯNG khi check với `inputData` (từ parent state):
   - `inputData` ĐÃ có formula field CŨ: `"docso(kv_so_tien_vay)": "145 triệu"`
   - `evaluatedData` có formula field MỚI: `"docso(kv_so_tien_vay)": "145 triệu"` (VẪN CŨ!)
   - So sánh → BẰNG NHAU → SKIP UPDATE!

### Tại sao formula field vẫn CŨ?
- `evaluateAllFormulas()` đọc từ `dataContext[sourceFieldId]`
- `sourceFieldId = "kv_so_tien_vay"` → Đọc từ `rawData.kv_so_tien_vay` = 1450000000 ✅
- Nhưng khi gọi `DocSo(1450000000)` → Trả về "Một trăm bốn mươi lăm triệu đồng" ❌

**==> Vấn đề ở hàm `DocSo()` trong utils.js!**

## GIẢI PHÁP GỐC:
1. Kiểm tra hàm `DocSo()` xem có cache không
2. Hoặc fix `masterDataHandler` để LUÔN gọi `onDataChange()` (bỏ check hasChanges)
3. Xóa TẤT CẢ debug log không cần thiết

## FILES CẦN SỬA:
1. `src/lib/utils.js` - Kiểm tra hàm `DocSo()`
2. `src/tabs/DataInputTab.jsx` - Fix masterDataHandler
3. `src/App.jsx` - Xóa log
4. `src/components/data-input/InputField.jsx` - Xóa log
5. `src/components/data-input/ListField.jsx` - Xóa log
6. `src/components/data-input/ProfileManager.jsx` - Xóa log

## CHỜ XÁC NHẬN TỪ USER TRƯỚC KHI COMMIT!
