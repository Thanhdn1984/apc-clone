# 🎯 v2.2.0+ Debug Logging - Complete Setup

## ✅ What's Done

### Code Changes (4 files updated)
1. ✅ **ListField.jsx** - Logs when list items are edited
2. ✅ **ProfileManager.jsx** - Logs when profiles load
3. ✅ **DataInputTab.jsx** - Logs when any field changes  
4. ✅ **formulaEngine.js** - Logs which formulas calculate

### Documentation Created
1. ✅ **DEBUG_GUIDE.md** - What to look for in logs
2. ✅ **TEST_SCENARIOS.md** - Step-by-step test procedures
3. ✅ **TROUBLESHOOTING.md** - Common problems and fixes
4. ✅ **LOGGING_READY.md** - Summary of changes
5. ✅ **debugLogs.js** - Helper utility

---

## 🚀 How to Start Testing

### Step 1: Start the App
```bash
npm start
# OR on Windows: double-click start.bat
```

### Step 2: Open DevTools
Press `F12` or right-click → "Inspect"

### Step 3: Go to Console
Click the **Console** tab (not Elements, Network, etc.)

### Step 4: Test ONE Issue at a Time
Follow the procedures in **TEST_SCENARIOS.md** for each:
1. Issue 1: Lãi suất = 0 (instead of 4%)
2. Issue 2: Old profile data persists
3. Issue 3: Formula not calculating
4. Issue 4: Zeros in number ranges
5. Issue 5: Date sequence broken

---

## 📊 Expected Log Output

When everything works, you'll see colored logs like:

```
📝 [INPUT] kv_lai_suat_muc = "5%"
📝 [LIST INPUT] danh_sach_so_tiet_kiem[0].kv_lai_suat_so_tiet_kiem = "4%"
🔵 [PROFILE LOAD] My_Profile
   kv_lai_suat_muc: 5
   danh_sach_so_tiet_kiem count: 1
📐 [FORMULA ENGINE] 5 formula fields: tong_gia_tri, tong_so_tiet_kiem(doc_so), ...
✅ [FORMULA] tong_gia_tri: 0 → 1450000
```

---

## 🔍 Debugging Each Issue

### Issue 1: List field shows 0 instead of 4%
**What to do:**
1. Add list item to sổ tiết kiệm
2. Enter "4%" in lãi suất field
3. Check console for `📝 [LIST INPUT]` showing "4%"
4. Check UI - does it show "4%" or "0"?

**What logs tell you:**
- If console shows "4%" but UI shows "0" → Value is storing correctly but displaying wrong
- If console shows "0" → Value is being converted to 0 on input

---

### Issue 2: Old profile data when loading new profile
**What to do:**
1. Save Profile A with lãi suất = 5% and a list item
2. Save Profile B with lãi suất = 2% with NO list items
3. Load Profile B
4. Check console for `🔵 [PROFILE LOAD]` showing Profile B data
5. Check UI - does it show Profile B's data or Profile A's?

**What logs tell you:**
- If console shows correct Profile B data but UI shows Profile A data → Data loaded wrong into React
- If console shows Profile A data → Old data wasn't replaced on load

---

### Issue 3: Formula not calculating  
**What to do:**
1. Add list item with số tiền = 1450000
2. Check console for `📐 [FORMULA ENGINE]` list
3. Check for `✅ [FORMULA]` lines showing calculations
4. Check UI - do you see formula results?

**What logs tell you:**
- If you see `📐 [FORMULA ENGINE]` but no `✅ [FORMULA]` lines → Formulas aren't running
- If logs show formula ran but UI is empty → Formula result not displaying

---

### Issue 4: Zeros in number ranges
**What to do:**
1. Click on a number range field
2. Try to enter a value
3. Check console for `📝 [INPUT]` showing your value
4. Check UI - does it keep the value or show 0?

**What logs tell you:**
- If console shows correct value but UI shows 0 → Display issue
- If console shows 0 → Value converted to 0 on input

---

### Issue 5: Date sequences in linked fields
**What to do:**
1. Create a linked date field sequence
2. Enter a start date
3. Check if other dates auto-fill
4. Verify each date is 1 day (or correct interval) apart

**What logs tell you:**
- May not have specific logs yet
- Manual verification: Do dates increment correctly?

---

## 📝 How to Report Issues

When you find a problem:

### ✅ Required Info
1. **Issue number** (1-5)
2. **Steps you took** (exactly)
3. **Console output** (screenshot or copy/paste)
4. **What you expected** (vs what happened)

### ✅ How to Copy Console
1. In Console tab, select all (Ctrl+A)
2. Copy (Ctrl+C)
3. Paste into text/Discord

### ✅ Example Report Format
```
Issue: #2 - Old profile data persists
Profile: Profile_B_Test

Steps:
1. Create Profile_A with lãi suất=5%
2. Create Profile_B with lãi suất=2%
3. Load Profile_B
4. Check console and UI

Console shows:
🔵 [PROFILE LOAD] Profile_B_Test
   kv_lai_suat_muc: 2

But UI shows: lãi suất = 5% (old value)

Expected: UI should show 2%
```

---

## 🛠️ Troubleshooting

### Logs not appearing?
1. Check you're on **Console tab** (not Elements/Network)
2. Close app completely, run `npm start` again
3. Reload page with Ctrl+R
4. See **TROUBLESHOOTING.md** for more help

### Too many logs?
1. Clear with 🗑️ trash icon
2. Filter: search for `📝` or field ID
3. Do ONE action slowly

### Changed code but logs still old?
1. Save file (Ctrl+S)
2. App should auto-reload (wait 2-3 seconds)
3. Refresh page (Ctrl+R) if needed
4. If still old: Close app (Ctrl+C), run `npm start` again

---

## 📅 Timeline

- **Today**: You test and collect logs
- **Tomorrow**: I analyze logs, identify root causes
- **Tomorrow PM**: Fixes implemented
- **Next day**: v2.2.1 released with all fixes

---

## 📚 Files to Read

| File | Purpose |
|------|---------|
| **TEST_SCENARIOS.md** | Exact steps to test each issue |
| **DEBUG_GUIDE.md** | What logs to expect for each issue |
| **TROUBLESHOOTING.md** | Problems and how to fix them |
| **LOGGING_READY.md** | Summary of what changed |

---

## ✨ You're All Set!

Everything is in place for systematic debugging:
- ✅ Code has detailed logging
- ✅ Documentation is comprehensive
- ✅ Test procedures are step-by-step
- ✅ Troubleshooting guide is ready

**Next step:** Follow **TEST_SCENARIOS.md** and start testing!

When ready to report, share:
1. Console output (screenshot or text)
2. Steps you followed
3. Expected vs actual result
4. Which issue (#1-5)

Good luck! 🚀
