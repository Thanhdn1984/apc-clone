# 🔍 Log Patterns Reference

## What You'll See in Console

### When Everything is Working ✅

#### Pattern 1: Simple Input
```
User changes a basic field (like lãi suất):

📝 [INPUT] kv_lai_suat_muc = "5%"
```

#### Pattern 2: List Item Input
```
User enters value in list item:

📝 [LIST INPUT] danh_sach_so_tiet_kiem[0].kv_lai_suat_so_tiet_kiem = "4%" (type: string)
   Updated list item: { kv_lai_suat_so_tiet_kiem: "4%", _id: "item_123..." }
📝 [DataInputTab] List danh_sach_so_tiet_kiem, length: 1
```

#### Pattern 3: Profile Loading
```
User loads a saved profile:

🔵 [PROFILE LOAD] My_Profile_Name
   kv_lai_suat_muc: 5
   danh_sach_so_tiet_kiem count: 1
   first item lãi suất: 3
✅ Setting inputData (will replace all old data)
✅ Loading fields: [object Object]
✅ Loading fieldGroups: [object Object]
```

#### Pattern 4: Formula Calculation
```
When formulas are triggered:

📐 [FORMULA ENGINE] 5 formula fields: tong_so_tiet_kiem(doc_so), tong_gia_tri, tong_lai_suat, ...
   ✅ tong_so_tiet_kiem(doc_so): 1450000 → "một triệu bốn trăm năm mươi ngàn"
   ✅ tong_gia_tri: 0 → 1450000
   ✅ tong_lai_suat: 0 → 145000
```

---

## Issue 1: Lãi suất = 0 - Expected Logs

### Correct Behavior
```
WHEN USER ENTERS "4%":
📝 [LIST INPUT] danh_sach_so_tiet_kiem[0].kv_lai_suat_so_tiet_kiem = "4%" (type: string)
   Updated list item: { ... kv_lai_suat_so_tiet_kiem: "4%" ... }
📝 [DataInputTab] List danh_sach_so_tiet_kiem, length: 1

WHEN UI UPDATES:
Should show: "4%"
```

### If There's a Problem
```
CASE A: Log shows "4%" but UI shows "0"
→ Value is correct in code, but display is wrong
→ Bug is in: UI rendering, number formatting, or state sync

CASE B: Log shows "0" from the start
→ Value is converted to 0 on input
→ Bug is in: ListField handleInputChange, validation, or type conversion

CASE C: No logs appear at all
→ Function not being called
→ Bug is in: Event handler not triggered, onClick not wired
```

---

## Issue 2: Old Profile Data - Expected Logs

### Correct Behavior
```
SAVE Profile A:
📝 [DataInputTab] List danh_sach_so_tiet_kiem, length: 1
(profile saved with 1 list item, lãi suất = 3%)

SAVE Profile B:
📝 [DataInputTab] List danh_sach_so_tiet_kiem, length: 0
(profile saved with 0 list items)

LOAD Profile B:
🔵 [PROFILE LOAD] Profile_B
   kv_lai_suat_muc: 2        ← Different from Profile A
   danh_sach_so_tiet_kiem count: 0  ← Empty, not 1 item
✅ Setting inputData (will replace all old data)

THEN UI SHOWS:
Profile B data (not Profile A)
```

### If There's a Problem
```
CASE A: Logs show Profile B correctly, but UI shows Profile A
→ Data loaded correctly, but React not updating
→ Bug is in: setState not triggering, component props not updating

CASE B: Logs show Profile A (old) instead of Profile B
→ Data not loaded from correct profile
→ Bug is in: handleLoadCustomer receiving wrong data

CASE C: Logs show correct, UI shows correct, but old data still in background
→ Component caching old data
→ Bug is in: useEffect dependencies, stale closure
```

---

## Issue 3: Formula Not Calculating - Expected Logs

### Correct Behavior
```
WHEN LIST ITEM ADDED:
📝 [LIST INPUT] danh_sach_so_tiet_kiem[0].kv_so_tien = "1450000"
📝 [DataInputTab] List danh_sach_so_tiet_kiem, length: 1

IMMEDIATELY AFTER:
📐 [FORMULA ENGINE] 5 formula fields: tong_so_tiet_kiem(doc_so), tong_gia_tri, ...
   ✅ tong_so_tiet_kiem(doc_so): 0 → "một triệu bốn trăm năm mươi ngàn"

THEN UI SHOWS:
Formula result displayed
```

### If There's a Problem
```
CASE A: No 📐 [FORMULA ENGINE] logs at all
→ Formulas not being identified/calculated
→ Bug is in: evaluateAllFormulas not called, or fields array missing formulas

CASE B: 📐 logs appear but no ✅ [FORMULA] lines
→ Formulas identified but not executing
→ Bug is in: calculateField() returning undefined

CASE C: ✅ logs show calculation, but UI empty
→ Formula calculated but not displayed
→ Bug is in: field configuration, display component, or state not passed
```

---

## Issue 4: Zeros in Ranges - Expected Logs

### Correct Behavior
```
USER ENTERS "100000000":
📝 [INPUT] so_tien_tuy_chon_1 = "100000000"
(Data stored correctly in state)

UI SHOWS:
"100.000.000" or "100000000" formatted nicely
```

### If There's a Problem
```
CASE A: Log shows correct value, UI shows "0"
→ Value in state is right, display is wrong
→ Bug is in: number formatting, field component, conditional rendering

CASE B: Log shows "0" from start
→ Value converted/reset to 0 on input
→ Bug is in: validation rejecting number, type conversion, reset logic

CASE C: Log shows number but UI shows nothing (blank)
→ Field not displaying at all
→ Bug is in: field visibility, component render condition, className
```

---

## Issue 5: Date Sequences - Expected Logs

### Correct Behavior
```
USER CREATES SEQUENCE:
Start date: 2024-01-01
Linked fields: [2024-01-02, 2024-01-03, 2024-01-04]

UI SHOWS:
Each field incremented correctly
```

### If There's a Problem
```
CASE A: Dates don't increment at all
→ Sequence not being applied
→ Bug is in: LinkedFieldsTab configuration, sequence logic

CASE B: Dates increment wrong (e.g., +2 days instead of +1)
→ Interval calculation wrong
→ Bug is in: date arithmetic in sequence processor

CASE C: Only some dates correct
→ Partial application of sequence
→ Bug is in: loop not covering all fields, state update incomplete
```

---

## Log Timing & Order

### Normal Flow Order
```
1. 📝 [INPUT] or 📝 [LIST INPUT]     ← User action
2. 📐 [FORMULA ENGINE]                ← Formula identification (if any)
3. ✅ [FORMULA] ...                   ← Formula results (if any)
4. 🔵 [PROFILE LOAD]                  ← Loading profile (when happens)
```

### If Order is Wrong
```
Example: Profile load logs appear AFTER other logs
→ Timing issue, might indicate async problem
→ Check: useEffect dependencies, async operations
```

---

## Common Log Mismatches

### 1. Field ID in Log ≠ Field Name in UI
```
Log shows: kv_lai_suat_muc
UI shows: "Lãi suất"
= NORMAL - same field, different names
```

### 2. Log shows string "4" but is actually number
```
Log shows: 📝 [INPUT] ... = "4%"
Type is: string
= NORMAL - number inputs shown as strings initially
```

### 3. List index weird format
```
Log shows: danh_sach_so_tiet_kiem[0]
= NORMAL - [0] means first item, [1] means second item
```

### 4. Formula output looks cut off
```
Log shows: "một triệu bốn trăm..."
= NORMAL - long strings truncated to 50 chars for readability
```

---

## Error Logs (What NOT to See)

### ❌ You Should NOT See These

```
❌ [FORMULA ENGINE] Error calculating field xyz
❌ TypeError: Cannot read property of undefined
❌ Uncaught Error: ...
🚨 [Error] ...
```

If you see these:
- Screenshot the error
- Share the full error message
- That's the actual bug to fix

---

## Debug Commands

### In Browser Console, You Can Type:

```javascript
// Check current app state
console.log(document.__REACT_DEVTOOLS_GLOBAL_HOOK__)

// Find a field value
// (This depends on your app structure, but example:)
// localStorage.getItem('docuGenAppState_v2.2.0')

// Filter logs to see only list inputs
// Use console filter: type "📝 [LIST INPUT]"
```

---

## Quick Pattern Matching

### When Debugging, Look For:

#### ✅ GREEN Logs = Input working
- 🟢 Green = 📝 [INPUT] 
- Means user action captured correctly

#### ✅ PURPLE Logs = List items working  
- 🟣 Purple = 📝 [LIST INPUT]
- Means list items being modified correctly

#### ✅ BLUE Logs = Profile working
- 🔵 Blue = 🔵 [PROFILE LOAD]
- Means profile loaded with correct data

#### ✅ ORANGE Logs = Formula working
- 🟠 Orange = 📐 [FORMULA ENGINE] and ✅ [FORMULA]
- Means formulas identified and calculated

---

## Comparison Table

| Issue | Key Logs to Check | Good Sign | Bad Sign |
|-------|-------------------|-----------|----------|
| 1 | `📝 [LIST INPUT]` | Shows "4%" | Shows "0" |
| 2 | `🔵 [PROFILE LOAD]` | Shows Profile B data | Shows Profile A data |
| 3 | `📐 [FORMULA ENGINE]` | Shows formulas found | No logs appear |
| 4 | `📝 [INPUT]` | Shows 100000000 | Shows 0 |
| 5 | Linked field logs | Dates increment | Dates stay same |

---

## How to Save & Share Logs

### Method 1: Screenshot
1. Open DevTools (F12)
2. Console tab
3. Do the action that causes issue
4. Screenshot appears
5. Share screenshot

### Method 2: Copy Text
1. In Console: Ctrl+A to select all
2. Ctrl+C to copy
3. Paste into document/Discord
4. Share text

### Method 3: Export
1. Right-click in Console
2. "Save as..." 
3. Choose format
4. Share file

---

## Validation Checklist

When you share logs, verify:

- ✅ Logs show colors and icons (📝, 🔵, 📐, ✅)
- ✅ Logs show exact values (not truncated)
- ✅ Logs show field IDs and types
- ✅ Logs show list indices if applicable
- ✅ UI display clearly visible (screenshot or stated)
- ✅ Expected vs actual result stated

---

**You now have a complete reference for log patterns!**

Use this when debugging to:
1. Know what logs to expect
2. Identify when something is wrong
3. Find which component has the bug
4. Communicate issues clearly

Good luck! 🚀
