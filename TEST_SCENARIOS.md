# 🧪 Test Scenarios - Follow These Steps Exactly

## Preparation
1. Start the app: `npm start` or `start.bat` (Windows)
2. Open DevTools: Press `F12`
3. Click **Console** tab
4. Keep DevTools visible while testing

---

## Test 1: Lãi suất = 0 (Issue 1)

### Setup
1. Create a new blank profile
2. Go to "Data Input" tab
3. Scroll to list field: "Danh sách Sổ tiết kiệm"

### Test Steps
1. Click **"+ Thêm Sổ"** button to add an item
2. Find the **"Lãi suất"** field in the new item
3. Enter: **4%**
4. Click outside the field (blur)

### Check Console For
- ✅ `📝 [LIST INPUT] danh_sach_so_tiet_kiem[0].kv_lai_suat_so_tiet_kiem = "4%"`
- ✅ `Updated list item: { ... kv_lai_suat_so_tiet_kiem: "4%" ... }`
- ✅ `📝 [DataInputTab] List danh_sach_so_tiet_kiem, length: 1`

### Check UI For
- ❓ Does the field show "4%" or "0"?
- ❓ If you scroll away and back, does it still show "4%"?

### If Issue: 
Take screenshot of:
- Console output
- UI showing the wrong value
- Note: Does it always show 0, or sometimes correct?

---

## Test 2: Old profile data persists (Issue 2)

### Setup
1. **Profile A Setup**
   - New profile, name: "Profile_A_Test"
   - Lãi suất basic: **5%**
   - Add list item with lãi suất: **3%**
   - Save profile

2. **Profile B Setup**
   - New profile, name: "Profile_B_Test"  
   - Lãi suất basic: **2%**
   - Leave list field EMPTY (no items)
   - Save profile

### Test Steps
1. Open DevTools → Console (clear if needed)
2. Click "Load" next to "Profile_B_Test"
3. **Wait 1 second**, then check console

### Check Console For
```
🔵 [PROFILE LOAD] Profile_B_Test
   kv_lai_suat_muc: 2       ← Should be 2%, not 5%
   danh_sach_so_tiet_kiem count: 0   ← Should be 0, not 1
```

### Check UI For
- ❓ Does "Lãi suất" field show **2%** (correct) or **5%** (old)?
- ❓ Does list show **empty** or show old item with 3%?

### If Issue:
Take screenshot showing console says "count: 0" but UI shows old data

---

## Test 3: Formula not calculating (Issue 3)

### Setup
1. New blank profile
2. Go to "Data Input" tab
3. Find list field: "Danh sách Sổ tiết kiệm"

### Test Steps
1. Click **"+ Thêm Sổ"** to add item
2. Enter in the new list item:
   - **Số tiền**: 1450000
   - **Lãi suất**: 4%
   - **Kỳ hạn**: 12
3. Press Tab/Enter to move out of field

### Check Console For
- ✅ `📐 [FORMULA ENGINE] X formula fields: ...`
- ✅ `✅ [FORMULA] tong_so_tiet_kiem(doc_so): 1450000 → "một triệu..."`

### Check UI For
- ❓ Do formula results appear below the list?
- ❓ Example: "Số tiền chữ" should show "một triệu bốn trăm năm mươi ngàn"

### If Issue:
Copy console logs that show formulas (or lack thereof)

---

## Test 4: Zeros in number ranges (Issue 4)

### Setup
1. New blank profile
2. Find field: "Số tiền tùy chọn" (likely in ranges section)

### Test Steps
1. Click on the field labeled **"100.000.000"** or **"100"**
2. Try to enter a custom value
3. Check what gets saved

### Check Console For
- ✅ `📝 [INPUT] so_tien_tuy_chon_1 = "100000000"`
- ✅ Shows the actual number you entered

### Check UI For
- ❓ Does field keep the value or show 0?
- ❓ Can you edit and save properly?

### If Issue:
Show: "I entered 100000000 but it shows 0"

---

## Test 5: Date sequence broken (Issue 5)

### Setup
1. Go to **"Config"** tab (if available)
2. Go to **"Linked Fields"** configuration
3. Find a date field sequence

### Test Steps
1. Set up a date field sequence (e.g., dates 1 day apart)
2. Enter a start date
3. Check if subsequent dates auto-fill

### Check Console For
- Look for linked field sequence processing logs
- Note: May not have logs yet if feature not fully implemented

### Check UI For
- ❓ Do dates auto-increment?
- ❓ Is each date correct relative to first?

### If Issue:
Show: "Start date is [date], but next date is [wrong date]"

---

## How to Share Results

After each test, **copy the console output**:

1. **Select all console text:**
   - Right-click in console
   - Click "Select All"
   - Ctrl+C to copy

2. **Paste into:**
   - A text file
   - Discord message
   - GitHub issue

3. **Include with every report:**
   - Console output
   - Screenshot of UI showing the issue
   - Step-by-step what you did
   - What you expected vs what happened

---

## Quick Reference

| Issue | Test | Look For | Symptom |
|-------|------|----------|---------|
| 1 | List field lãi suất | `📝 [LIST INPUT]` | Shows 0 instead of 4% |
| 2 | Load old profile | `🔵 [PROFILE LOAD]` | Old data persists |
| 3 | Formula calc | `📐 [FORMULA ENGINE]` | No formula results shown |
| 4 | Number ranges | `📝 [INPUT]` | Zero appears in field |
| 5 | Date sequence | Linked fields logs | Dates don't increment |

---

## Troubleshooting

**Console is empty?**
- Make sure you're on the Console tab (not Elements, Network, etc)
- Reload page: Ctrl+R or Cmd+R

**Logs are too fast/too many?**
- Clear console with trash icon
- Do ONE action slowly
- Watch console fill up

**Can't see a specific log?**
- Type the log prefix in console search (e.g., "📝")
- Or search for field ID (e.g., "kv_lai_suat")

**Need to reset everything?**
- Click "New Profile" 
- Click "Xác nhận" button
- This clears all data
