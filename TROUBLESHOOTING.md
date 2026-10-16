# ⚡ Quick Troubleshooting Checklist

## Issue: Console is empty / No logs showing

### ✅ Fix 1: Make sure you're in the right tab
- [ ] Press F12 to open DevTools
- [ ] Click the **Console** tab (not Elements, Network, Sources, etc.)
- [ ] You should see yellow/green colored text with icons like 📝

### ✅ Fix 2: Make sure app is running
- [ ] Close the app completely
- [ ] Open terminal/command prompt in docxautomator folder
- [ ] Run: `npm start` (or `start.bat` on Windows)
- [ ] Wait for "Local: http://localhost:5000" message
- [ ] Then open DevTools

### ✅ Fix 3: Clear console and reload
- [ ] In DevTools Console, click the 🗑️ trash icon
- [ ] Then press Ctrl+R to reload the page
- [ ] You should see initialization logs

---

## Issue: Log shows one value but UI shows another

### ✅ Likely Cause: Different reference to same field
- Field might have multiple names (ID vs display name)
- Check: Is the log for `kv_lai_suat_muc` but UI shows field named "Lãi suất"?
- **These are the same field**, just different labels

### ✅ How to Verify
- Search in console for the **number/value** (e.g., search "4" or "0")
- All logs with that value = same data flow
- Check: Does value change somewhere in logs?

---

## Issue: Too many logs / can't see what I need

### ✅ Solution: Filter logs
1. In Console, find the **filter box** (usually top right, looks like a funnel)
2. Type: **📝** (to see only input logs)
3. Or type: **kv_lai_suat** (to see logs for that field)
4. Or type: **[LIST INPUT]** (to see only list changes)

### ✅ Clear logs between tests
- Click the 🗑️ trash icon in Console
- Do ONE action slowly
- Read the logs that appear

---

## Issue: Can't figure out which field is which

### ✅ Use the Field ID
Every log shows the field ID (internal name):
```
📝 [INPUT] kv_lai_suat_muc = "5%"
           ↑ This is the field ID
```

### ✅ Find ID in UI
1. Open your browser's Inspector (F12)
2. Click the pointer icon (top left of DevTools)
3. Click on the field in the app
4. Look for `data-field-id` or `id=` in the HTML
5. That's the field ID that appears in logs

### ✅ Common Field IDs
- `kv_lai_suat_muc` = Lãi suất (main field)
- `kv_lai_suat_so_tiet_kiem` = Lãi suất in list items
- `danh_sach_so_tiet_kiem` = Sổ tiết kiệm list
- `tong_so_tiet_kiem` = Total sổ tiết kiệm
- `tong_so_tiet_kiem(doc_so)` = Total in words (formula)

---

## Issue: App crashed / won't start

### ✅ Check for errors
1. Look at the terminal where you ran `npm start`
2. Are there red error messages?
3. **If yes**: Screenshot or copy the error message

### ✅ Safe Recovery
- Close the app
- Delete `node_modules` folder (if huge disk space issues)
- Run: `npm install` (reinstall dependencies)
- Run: `npm start` again

---

## Issue: Change a console.log, but it doesn't update

### ✅ You need to reload the page
- Make change to source file (e.g., DataInputTab.jsx)
- Save the file (Ctrl+S)
- The app should auto-reload (Vite does this)
- **Wait 2-3 seconds** for rebuild
- Then refresh DevTools or reload page (Ctrl+R)

### ✅ If still not working
- Close the app entirely: Ctrl+C in terminal
- Run: `npm start` again
- Wait for "Local: ..." message
- Open the app fresh

---

## Issue: I updated the code but logs aren't appearing

### ✅ Check: Is the console.log actually in the file?
- Open the `.jsx` file in VS Code
- Search for the log text (e.g., "LIST INPUT")
- Is it there?

### ✅ Check: Is the file being used?
- Search globally for the file name (e.g., "ListField.jsx")
- Are there multiple copies?
- Make sure you edited the right one

### ✅ Check: Did you save the file?
- Look for white dot next to filename in VS Code
- White dot = unsaved changes
- Press Ctrl+S to save

### ✅ Nuclear option: Restart everything
```bash
# In terminal:
Ctrl+C (to stop npm start)
npm start (to start fresh)
# Then reload app in browser: Ctrl+R
```

---

## Quick Test: Is Logging Working?

### Do This Right Now
1. Open the app with DevTools open (F12)
2. Go to Console tab
3. Change ANY field value in the form
4. **Do you see** `📝 [INPUT] ...` appear?
   - **YES** → Logging is working! ✅
   - **NO** → Follow "Console is empty" fixes above

### If YES, logging works. Now:
1. Close DevTools or move it to side
2. Create a new profile
3. Add an item to list
4. Check console - do you see `📝 [LIST INPUT]`?

---

## Still Stuck?

### Try This Order:
1. ✅ Close everything (app, VS Code, terminal)
2. ✅ Wait 10 seconds
3. ✅ Open VS Code → Open terminal
4. ✅ `npm start`
5. ✅ Wait for "Local: http://localhost:5000"
6. ✅ Open app → Press F12
7. ✅ Click Console tab
8. ✅ Do ONE action in the app
9. ✅ Screenshot the console
10. ✅ Share the screenshot

---

## Reporting Issues

When you report a problem, include:

### ✅ Minimum Info
```
Issue: [Issue number 1-5]
Steps: [What you did]
Console Output: [Screenshot or text]
Expected: [What should happen]
Actual: [What happened instead]
```

### ✅ Example Report
```
Issue: 1 - Lãi suất = 0
Steps:
  1. Create new profile
  2. Add sổ tiết kiệm item
  3. Enter "4%" in lãi suất field
  4. Click outside field

Console Output:
  📝 [LIST INPUT] danh_sach_so_tiet_kiem[0].kv_lai_suat_so_tiet_kiem = "4%"
  Updated list item: { ... kv_lai_suat_so_tiet_kiem: "4%" }

Expected: UI shows "4%"
Actual: UI shows "0%"
```

### ✅ How to get console output
- Select all text in Console (Ctrl+A)
- Copy (Ctrl+C)
- Paste into text file or Discord

---

## Performance Tips

### Logs are slowing down the app?
- Open DevTools **after** app starts
- Or close DevTools, test, open DevTools for logs
- Or disable specific logs by commenting them out

### Logs filling up too fast?
- Use filter: type `📝` or field ID
- Clear with trash icon
- Do slower, one action at a time

### Need to disable all logs?
- Open DevTools → Settings ⚙️
- Enable "Disable Logs" or similar
- Or just ignore the logs, they don't affect functionality

---

## Success Indicators

When logging is working correctly, you should see:

### ✅ After entering any field
```
📝 [INPUT] field_id = "value"
```

### ✅ After adding list item  
```
📝 [LIST INPUT] list_id[0].sub_field = "value"
```

### ✅ After loading profile
```
🔵 [PROFILE LOAD] Profile_Name
```

### ✅ After any formula field updates
```
📐 [FORMULA ENGINE] 3 formula fields: ...
✅ [FORMULA] formula_id: old_value → new_value
```

If you see these colors and icons, **logging is working perfectly**! ✅
