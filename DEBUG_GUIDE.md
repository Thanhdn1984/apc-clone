# 🐛 Debug Guide for v2.2.0+ Issues

## 5 Problems to Solve

### Issue 1: Lãi suất sổ tiết kiệm = 0 (khi nhập 4% vẫn nhận 0)
**Files to Monitor:**
- [ListField.jsx](src/components/data-input/ListField.jsx#L14) - handleInputChange: Shows when value entered
- [DataInputTab.jsx](src/tabs/DataInputTab.jsx#L126) - handleListChange: Shows list update
- Browser Console: Look for `📝 [LIST INPUT]` logs

**Expected Flow:**
```
📝 [LIST INPUT] danh_sach_so_tiet_kiem[0].kv_lai_suat_so_tiet_kiem = "4%" (type: string)
📝 [DataInputTab] List danh_sach_so_tiet_kiem, length: 1
Updated list item: { kv_lai_suat_so_tiet_kiem: "4%", ... }
```

**Debug Steps:**
1. Open DevTools (F12)
2. Go to Console tab
3. Load a profile
4. Click on a list item (sổ tiết kiệm)
5. Enter "4%" in the lãi suất field
6. Check console - what value was stored?

---

### Issue 2: Old profile data persists when loading new profile
**Files to Monitor:**
- [ProfileManager.jsx](src/components/data-input/ProfileManager.jsx#L106) - handleLoadCustomer: Shows what data loaded
- Browser Console: Look for `🔵 [PROFILE LOAD]` logs

**Expected Flow:**
```
🔵 [PROFILE LOAD] My New Profile
   kv_lai_suat_muc: 5
   danh_sach_so_tiet_kiem count: 0  (empty or different from old profile)
   first item lãi suất: undefined
✅ Setting inputData (will replace all old data)
```

**Debug Steps:**
1. Create Profile A with lãi suất = 4%
2. Create Profile B with NO list items
3. Open DevTools → Console
4. Click "Load Profile B"
5. Check: Does console show Profile B's data?
6. Check: Does UI show old profile's data (Issue 2)?

---

### Issue 3: Formula calculation not working (sổ tiết kiệm)
**Files to Monitor:**
- [formulaEngine.js](src/lib/formulaEngine.js#L123) - Shows all formula fields
- [DataInputTab.jsx](src/tabs/DataInputTab.jsx#L73) - Shows which formulas calculated
- Browser Console: Look for `📐 [FORMULA ENGINE]` and `✅ [FORMULA]` logs

**Expected Flow:**
```
📐 [FORMULA ENGINE] 3 formula fields: tong_so_tiet_kiem(doc_so), tong_gia_tri, ...
✅ [FORMULA] tong_so_tiet_kiem(doc_so): 1450000 → "một triệu bốn trăm năm mươi ngàn"
✅ [FORMULA] tong_gia_tri: 0 → 1450000
```

**Debug Steps:**
1. Open DevTools → Console
2. Go to Data Input → List Fields → Sổ tiết kiệm
3. Enter: Number = 1450000, Lãi suất = 4%
4. Check console for formula calculation logs
5. Do formulas appear?

---

### Issue 4: Zero values in number ranges (100.000.000 hoặc 100)
**Files to Monitor:**
- [InputField.jsx](src/components/data-input/InputField.jsx#L12) - Has DEBUG mode
- [DataInputTab.jsx](src/tabs/DataInputTab.jsx#L111) - handleFieldChange
- Browser Console: Look for `📝 [INPUT]` logs

**How to Enable InputField Debug:**
```javascript
// In browser console:
// Change line 13 in InputField.jsx from:
const DEBUG = false;
// to:
const DEBUG = true;
```

**Expected Flow:**
```
📝 [INPUT] so_tien_tuy_chon_1 = "100000000" (type: string)
[so_tien_tuy_chon_1] handleChange: 100000000
[so_tien_tuy_chon_1] ✅ onChange called with number: 100000000
```

**Debug Steps:**
1. Edit a number range field
2. Enter "100" or "100.000.000"
3. Check console - what gets stored?

---

### Issue 5: Date field sequence broken in linked fields
**Files to Monitor:**
- [LinkedFieldsTab.jsx](src/components/data-input/linking/LinkedFieldsTab.jsx) - Linked field configuration
- Browser Console: Look for linked field logs
- Check: Are consecutive dates appearing?

**Debug Steps:**
1. Go to Linked Fields tab
2. Create a date sequence (e.g., dates 1 day apart)
3. Check console for sequence processing
4. Verify dates increment correctly

---

## Console Log Format

Each log uses color-coded prefixes:
- `📝 [INPUT]` - Green - Basic field input
- `📝 [LIST INPUT]` - Purple - List item input
- `🔵 [PROFILE LOAD]` - Blue - Profile loading
- `📐 [FORMULA ENGINE]` - Orange - Formula identification
- `✅ [FORMULA]` - Orange - Formula calculation result
- `🔧 [masterDataHandler]` - Cyan - Data processing

## How to Check

1. **Open DevTools:** Press `F12` or right-click → Inspect
2. **Go to Console Tab** - Shows all console.log outputs
3. **Filter by Prefix:** Type `📝` or `📐` in console to filter logs
4. **Copy Full Output:** Select all, Ctrl+C, share with support

## When Testing

- Open **both** the app and DevTools at the same time
- Do ONE action at a time
- Wait 1 second between actions to read logs
- Screenshot or copy logs showing the issue

## Share Debug Output

When reporting issues, include:
1. What you did (step by step)
2. Browser console output (screenshot or text)
3. Expected vs actual result
4. Affected profile name (if applicable)
