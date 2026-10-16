// Hướng dẫn nhập dữ liệu từ máy khác cho phía nhận

## 📥 Hướng Dẫn Nhập Dữ Liệu Portable

### Phía Gửi (Máy chủ / người có dữ liệu)

1. **Mở ứng dụng DocxAutomator**
2. **Lần load đầu tiên:** Ứng dụng sẽ **tự động xuất** tất cả hồ sơ
3. **Thư mục Downloads:** Bạn sẽ thấy các file:
   ```
   BATCH_1_của_5_2025-12-23.json
   BATCH_2_của_5_2025-12-23.json
   BATCH_3_của_5_2025-12-23.json
   BATCH_4_của_5_2025-12-23.json
   BATCH_5_của_5_2025-12-23.json
   ```
4. **Copy tất cả file này** vào một thư mục tên: `portable_data`
5. **Gửi cho phía nhận** (email, USB, cloud, etc.)

---

### Phía Nhận (Máy khác - muốn import dữ liệu)

#### Cách 1: Copy File (Đơn giản - Khuyến nghị) ✅

1. **Nhận các file BATCH_X từ phía gửi**
   
2. **Tạo thư mục** `portable_data` **cùng cấp với ứng dụng:**
   ```
   Thư mục gốc/
   ├── docxautomator/
   │   ├── src/
   │   ├── package.json
   │   └── ...
   ├── portable_data/          ← Tạo thư mục này
   │   ├── BATCH_1_của_5_2025-12-23.json
   │   ├── BATCH_2_của_5_2025-12-23.json
   │   └── ...
   ```

3. **Copy tất cả file BATCH_X vào thư mục `portable_data`**

4. **Mở ứng dụng lần thứ nhất**
   - Ứng dụng sẽ **tự động quét** thư mục `portable_data`
   - **Tự động import** tất cả hồ sơ
   - **Tự động lưu** vào localStorage

5. **Xác nhận:**
   - Mở tab "Tìm hồ sơ"
   - Nhập `*.*` để xem tất cả
   - Hồ sơ mới sẽ xuất hiện trong danh sách

---

#### Cách 2: Upload từ Giao Diện (Nếu tạo thêm nút)

*Tính năng này chưa được thêm nhưng có thể triển khai sau*

---

## 📊 Cấu Trúc File BATCH

Mỗi file BATCH có định dạng như sau:

```json
{
  "batch_số": 1,
  "tổng_batch": 5,
  "số_hồ_sơ_trong_batch": 60,
  "ngày_xuất": "23/12/2025 14:30:45",
  "hồ_sơ_list": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Khách hàng A",
      "inputData": {
        "kv_lai_suat_muc": "5%",
        "kv_tien_goi": 1000000,
        "danh_sach_so_tiet_kiem": [
          {
            "_id": "item_123456",
            "kv_so_tien": 500000,
            "kv_lai_suat_so_tiet_kiem": "4%",
            "kv_ky_han": "12 tháng"
          }
        ]
      },
      "fields": [ ... ],
      "fieldGroups": [ ... ]
    },
    { ... hồ sơ thứ 2 ... },
    { ... hồ sơ thứ 3 ... }
  ]
}
```

---

## ⚙️ Các Thao Tác Tự Động

### Khi Phía Gửi Mở App Lần Đầu:
✅ Tự động xuất 60 hồ sơ/batch
✅ Lưu vào Downloads
✅ Đánh dấu "đã xuất" để không xuất lại

### Khi Phía Nhận Mở App Lần Đầu:
✅ Tự động quét thư mục `portable_data`
✅ Tự động import tất cả file BATCH
✅ Hợp nhất với dữ liệu hiện tại (nếu có)
✅ Lưu vào localStorage

---

## 🔄 Workflow Đầy Đủ

```
Máy A (Chủ dữ liệu):
  1. Mở app lần đầu
  2. Auto-export 5 batch (300 hồ sơ)
  3. Files lưu ở Downloads
  4. Tạo thư mục portable_data
  5. Copy file vào portable_data
  6. Gửi portable_data folder cho máy B
         ↓
Máy B (Nhận dữ liệu):
  1. Nhận thư mục portable_data
  2. Đặt cùng cấp với app
  3. Mở app lần đầu
  4. Auto-import từ portable_data
  5. Hồ sơ xuất hiện trong app
  6. Có thể chỉnh sửa, xuất lại, etc.
```

---

## 🎯 Ưu Điểm Cách Này

✅ **Hoàn toàn tự động** - Không cần click nút gì
✅ **Không còn localStorage limit** - Dữ liệu backup ở file
✅ **Dễ chia sẻ** - Chỉ copy folder
✅ **Dễ backup** - File JSON có thể giữ lâu dài
✅ **Dễ merge** - 5 batch → 1 lệnh import
✅ **An toàn** - File JSON có thể kiểm tra nội dung trước import
✅ **Portable** - Di chuyển từ máy này sang máy khác dễ dàng

---

## 🚨 Troubleshooting

### Vấn đề: File không tự động import

**Kiểm tra:**
1. Thư mục `portable_data` có cùng cấp với app không?
2. File có tên đúng `BATCH_X_của_Y_` không?
3. File là JSON hợp lệ không? (mở với Notepad xem)

**Cách sửa:**
1. Xóa flag: `localStorage.removeItem('portable_export_done_vX.X.X')`
2. Reload page (F5)
3. Xóa file `portable_export_done` để app tự động import lại

### Vấn đề: Hồ sơ trùng lặp sau import

**Kiểm tra:**
1. ID hồ sơ có trùng không?
2. Nếu trùng → hồ sơ mới sẽ đè hồ sơ cũ (tính năng bảo vệ)

**Cách:**
- Xóa hồ sơ cũ trước khi import
- Hoặc bật developer tools để kiểm tra ID

---

## 📞 Hỗ Trợ

Nếu có vấn đề:
1. Kiểm tra console (F12) có lỗi nào không
2. Copy lỗi từ console gửi cho support
3. Hoặc export file template để xem định dạng
