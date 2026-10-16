# 📊 Data Flow Visualization

## How Data Flows Through the App

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER INTERACTION                            │
│                   (User enters data in UI)                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────────┐
        │  InputField.jsx / ListField.jsx            │
        │  ➜ handleChange() triggered                │
        │  ✅ LOG: 📝 [INPUT] fieldId = "value"     │
        │  ✅ LOG: 📝 [LIST INPUT] listId[i].field  │
        └────────────────────┬───────────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────────┐
        │  DataInputTab.jsx                          │
        │  ➜ handleFieldChange() / handleListChange()│
        │  ✅ LOG: Field change logged               │
        │  ➜ Calls masterDataHandler(updatedData)    │
        └────────────────────┬───────────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────────┐
        │  formulaEngine.js                          │
        │  ➜ evaluateAllFormulas()                   │
        │  ✅ LOG: 📐 [FORMULA ENGINE] list          │
        │  ➜ Loops through formula fields            │
        │  ➜ calculateField() for each               │
        │  ✅ LOG: ✅ [FORMULA] result → value       │
        │  ➜ Returns evaluatedData (with all formula │
        │     results calculated)                    │
        └────────────────────┬───────────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────────┐
        │  DataInputTab.jsx / App.jsx                │
        │  ➜ setState() with evaluatedData           │
        │  ➜ UI re-renders with new values           │
        │  ➜ localStorage is updated                 │
        └────────────────────┬───────────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────────┐
        │            UI UPDATED                      │
        │  User sees the new value displayed         │
        └────────────────────────────────────────────┘
```

---

## Issue 1: Lãi suất = 0 Flow

```
User enters "4%" in lãi suất list field
       │
       ▼
ListField.jsx → handleInputChange()
       │
       ✅ LOG: 📝 [LIST INPUT] = "4%"
       │
       ▼
onListChange() called with newList containing "4%"
       │
       ▼
DataInputTab.jsx → handleListChange()
       │
       ✅ LOG: 📝 [DataInputTab] List ... length: 1
       │
       ▼
masterDataHandler() processes data
       │
       ▼
evaluateAllFormulas() runs
       │
       ▼
State updated with evaluatedData
       │
       ▼
       ❌ UI SHOWS "0" instead of "4%"
       
ROOT CAUSE POSSIBILITIES:
A) Value converted to 0 during input → Check ListField logs
B) Value stored as 0 in state → Check handleListChange logs
C) Value lost during formula calculation → Check formulaEngine logs
D) Display formatting removes value → Check UI rendering
```

---

## Issue 2: Old Profile Data Persists Flow

```
User clicks "Load Profile_B"
       │
       ▼
ProfileManager.jsx → handleLoadCustomer()
       │
       ✅ LOG: 🔵 [PROFILE LOAD] Profile_B
       ✅ Shows: kv_lai_suat_muc: 2 (correct)
       │
       ▼
setInputData(JSON.parse(newData))
setFields(JSON.parse(newFields))
setFieldGroups(JSON.parse(newFieldGroups))
       │
       ▼
React state updated with Profile_B data
       │
       ▼
Components re-render
       │
       ▼
       ❌ UI SHOWS Profile_A data (old data)
       
ROOT CAUSE POSSIBILITIES:
A) setInputData didn't replace state → Check React state update
B) Components cached old data → Check component useEffect deps
C) Parent component didn't update → Check prop passing
D) Old data in different field → Check field names match
```

---

## Issue 3: Formula Not Calculating Flow

```
User adds list item with số tiền = 1450000
       │
       ▼
masterDataHandler() called
       │
       ▼
evaluateAllFormulas() starts
       │
       ✅ LOG: 📐 [FORMULA ENGINE] 5 formula fields: tong_so_tiet_kiem...
       │
       ▼
processFields() loops through formulas
       │
       ▼
calculateField() for tong_so_tiet_kiem
       │
       ✅ LOG: ✅ [FORMULA] tong_so_tiet_kiem: 0 → 1450000
       │
       ▼
evaluatedData updated with result
       │
       ▼
       ❌ UI DOESN'T SHOW "một triệu bốn trăm..."
       
ROOT CAUSE POSSIBILITIES:
A) Formula not in fields array → Check formulaEngine logs
B) Formula calculation returned undefined → Check LOG output
C) Result not stored in state → Check evaluatedData passed to setState
D) UI field not configured to show formula → Check field config
```

---

## Issue 4: Zeros in Number Ranges Flow

```
User clicks on range field and enters "100000000"
       │
       ▼
InputField.jsx → handleChange()
       │
       ✅ LOG: [fieldId] handleChange: 100000000
       │
       ▼
unformatNumber() converts display format to number
       │
       ▼
parseFloat() converts to number
       │
       ✅ LOG: [fieldId] onChange called with number: 100000000
       │
       ▼
onChange(100000000) called
       │
       ▼
DataInputTab.jsx → handleFieldChange()
       │
       ✅ LOG: 📝 [INPUT] fieldId = "100000000"
       │
       ▼
masterDataHandler() processes
       │
       ▼
State updated
       │
       ▼
       ❌ UI SHOWS "0" instead of "100000000"
       
ROOT CAUSE POSSIBILITIES:
A) Number 100000000 formatted as "0" → Check number formatting
B) Number range validation removes value → Check validation logic
C) UI field has issue rendering 0 → Check InputField render
D) State update issue with large numbers → Check number handling
```

---

## Issue 5: Date Sequence Broken Flow

```
User configures linked field sequence
Start date → +1 day → +1 day → +1 day
       │
       ▼
LinkedFieldsTab.jsx processes sequence config
       │
       ▼
Sequence definition applied to fields
       │
       ▼
User enters start date: 2024-01-01
       │
       ▼
Linked field calculation triggers
       │
       ▼
Each linked field should be: +1 day more than previous
       │
       ▼
       ❌ UI SHOWS WRONG DATES (not sequential)
       
ROOT CAUSE POSSIBILITIES:
A) Sequence definition incorrect → Check LinkedFieldsTab config
B) Date calculation function broken → Check date math
C) Sequence not applied to formula → Check formula implementation
D) Fields not linked properly → Check field relationships
```

---

## Key Checkpoints for Debugging

### When Testing Each Issue:

1️⃣ **Check Console Logs Appear**
   - ✅ Logs show up in color with icons
   - ❌ No logs = logging not working (see TROUBLESHOOTING.md)

2️⃣ **Trace the Data Value**
   - ✅ Follow value from input → processing → output
   - ❌ Value disappears somewhere = that's the bug

3️⃣ **Compare Logs vs UI**
   - ✅ Logs show "4%" but UI shows "0" = display bug
   - ✅ Logs show "0" = input/processing bug

4️⃣ **Identify the Break Point**
   - ✅ Value correct in ListField log = bug is after that
   - ✅ Value wrong in formulaEngine log = bug is in formulas
   - ✅ Value wrong from start = bug in input handling

---

## Log-Based Debugging Strategy

```
For each issue:

STEP 1: Run app with console open
  └─ See which logs appear?

STEP 2: Follow the data value
  └─ Input: 4% → is it still 4% in first log?
  └─ Processing: does it change in formula logs?
  └─ Output: is it wrong in final state?

STEP 3: Find where it changes
  └─ If input log shows 4%, but next log shows 0
  └─ That's between those two functions = bug there

STEP 4: Check that specific function
  └─ Does code have validation that removes value?
  └─ Does state update work correctly?
  └─ Is there a typo in field names?

STEP 5: Report with evidence
  └─ "Logs show X, but UI shows Y, here's the proof"
```

---

## Mapping Logs to Code Location

| Log Output | Code Location | Function | File |
|------------|---------------|----------|------|
| `📝 [INPUT]` | InputField | handleChange() | InputField.jsx |
| `📝 [LIST INPUT]` | ListField | handleInputChange() | ListField.jsx |
| `🔵 [PROFILE LOAD]` | ProfileManager | handleLoadCustomer() | ProfileManager.jsx |
| `📐 [FORMULA ENGINE]` | formulaEngine | evaluateAllFormulas() | formulaEngine.js |
| `✅ [FORMULA]` | formulaEngine | calculateField() | formulaEngine.js |

---

## How This Helps Find Bugs

### Without Logs ❌
```
User: "It shows 0 instead of 4%"
Me: "Hmm, could be anywhere... 10 functions to check"
Time: Days of searching
```

### With Logs ✅
```
User: "Console shows 📝 [LIST INPUT] = 4%, but UI shows 0"
Me: "Bug is between ListField and UI display"
Time: Minutes to find exact location
```

---

## Next Steps

1. **Follow TEST_SCENARIOS.md** for each issue
2. **Screenshot or copy the console logs**
3. **Compare logs with what UI shows**
4. **Report the specific mismatch**
5. **We'll find and fix the root cause**

Good luck! 🚀
