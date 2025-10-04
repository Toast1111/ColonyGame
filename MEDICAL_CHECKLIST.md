# Medical System Implementation Checklist

## Pre-Implementation ✅

- [x] Read MEDICAL_FINAL_SUMMARY.md
- [x] Understand the system design
- [x] Project builds successfully
- [x] Medicine resources added (5 medicine, 3 herbal)
- [x] Medical system foundation complete

## Implementation Phase

### File 1: Medical Job Check (~5 min)
- [ ] Open `src/game/colonist_systems/colonistFSM.ts`
- [ ] Find `evaluateIntent()` function (line ~445)
- [ ] Find the danger check: `if (!c.inside && danger)`
- [ ] Add medical job check code AFTER danger check
- [ ] Verify code imports `medicalSystem`
- [ ] Save file

**Code Location:** MEDICAL_VISUAL_GUIDE.md → File 1

### File 2: Medical State Handler (~10 min)
- [ ] Stay in `src/game/colonist_systems/colonistFSM.ts`
- [ ] Find `case 'medical':` (line ~590)
- [ ] REPLACE entire case block with new handler
- [ ] Verify `medicalSystem.getColonistId` is used
- [ ] Save file

**Code Location:** MEDICAL_VISUAL_GUIDE.md → File 2

### File 3: Downed State Handler (~5 min)
- [ ] Stay in `src/game/colonist_systems/colonistFSM.ts`
- [ ] Find end of switch statement (line ~800)
- [ ] ADD new `case 'downed':` block
- [ ] Verify speed is set to 0
- [ ] Save file

**Code Location:** MEDICAL_VISUAL_GUIDE.md → File 3

### File 4: Context Menu Actions (~5 min)
- [ ] Open `src/game/Game.ts`
- [ ] Find `handleContextMenuAction()` method (line ~2329)
- [ ] Find medical action cases (line ~2387)
- [ ] REPLACE all 5 medical case blocks
- [ ] Verify `this.RES.medicine` checks exist
- [ ] Save file

**Code Location:** MEDICAL_VISUAL_GUIDE.md → File 4

### File 5: Auto-Downed Check (~3 min)
- [ ] Stay in `src/game/Game.ts`
- [ ] Find main update loop (line ~1100)
- [ ] Find colonist update section
- [ ] ADD downed state check code
- [ ] Verify checks consciousness, pain, bloodLevel
- [ ] Save file

**Code Location:** MEDICAL_VISUAL_GUIDE.md → File 5

## Build & Test

### Build Check
- [ ] Run `npm run build`
- [ ] No TypeScript errors
- [ ] Build completes successfully
- [ ] Run `npm run preview` or `npm run dev`
- [ ] Game loads without errors
- [ ] Check browser console for errors

### Test 1: Auto-Treatment (CRITICAL)
- [ ] Start game
- [ ] Let enemy attack a colonist
- [ ] **EXPECTED:** Another colonist moves to injured one
- [ ] **EXPECTED:** Message "X successfully treated Y"
- [ ] **EXPECTED:** Injury severity reduces
- [ ] **EXPECTED:** No console errors

**If this fails:** Check Files 1 & 2 were added correctly

### Test 2: Context Menu (IMPORTANT)
- [ ] Right-click injured colonist
- [ ] Click "Medical" submenu appears
- [ ] Click "Bandage Wounds"
- [ ] **EXPECTED:** Message "Bandaged X wound(s)"
- [ ] **EXPECTED:** Bleeding reduces
- [ ] Try "Treat Infection" (if infected)
- [ ] **EXPECTED:** Medicine count decreases
- [ ] **EXPECTED:** Infection cleared

**If this fails:** Check File 4 was added correctly

### Test 3: Downed State (IMPORTANT)
- [ ] Severely injure colonist (multiple attacks)
- [ ] **EXPECTED:** Message "X has collapsed!"
- [ ] **EXPECTED:** Colonist can't move (speed = 0)
- [ ] Right-click downed colonist
- [ ] **EXPECTED:** "Rescue to Bed" option appears
- [ ] Click rescue option
- [ ] **EXPECTED:** Colonist teleported to bed
- [ ] **EXPECTED:** Colonist enters "resting" state

**If this fails:** Check Files 3 & 5 were added correctly

### Test 4: Medicine Consumption (VERIFY)
- [ ] Note starting medicine count (should be 5)
- [ ] Perform surgery via context menu
- [ ] **EXPECTED:** Medicine count = 4
- [ ] Treat infection via context menu
- [ ] **EXPECTED:** Medicine count = 3
- [ ] Try treatment when medicine = 0
- [ ] **EXPECTED:** Message "No medicine available"

### Test 5: Treatment Quality (ADVANCED)
- [ ] Select colonist with high medicine skill
- [ ] Let them treat injured colonist WITH medicine
- [ ] **EXPECTED:** Quality ~70-90% in message
- [ ] Select colonist with low medicine skill
- [ ] Let them treat injured colonist WITHOUT medicine
- [ ] **EXPECTED:** Quality ~30-40% in message
- [ ] Compare healing rates
- [ ] **EXPECTED:** High quality heals faster

## Verification

### Code Quality
- [ ] No console errors during gameplay
- [ ] No TypeScript compilation errors
- [ ] Game performance is smooth
- [ ] Medical system doesn't interfere with other systems

### Gameplay Quality
- [ ] Medical work feels automated
- [ ] Colonists prioritize critical injuries
- [ ] Context menu is intuitive
- [ ] Medicine feels valuable but not required
- [ ] Downed state creates tension

### Documentation
- [ ] Read all error messages
- [ ] Understand what each file does
- [ ] Can explain system to someone else
- [ ] Know where to look for issues

## Troubleshooting

### Issue: Colonists ignore injured allies
**Solution:**
- [ ] Check File 1 was added (medical job check)
- [ ] Verify `medicalSystem` is imported
- [ ] Check console for errors
- [ ] Verify injured colonist has `health.injuries` array

### Issue: Medical state crashes game
**Solution:**
- [ ] Check File 2 was added (medical state handler)
- [ ] Verify `medicalSystem.getColonistId` exists
- [ ] Check FSM state transitions
- [ ] Look for syntax errors

### Issue: Context menu does nothing
**Solution:**
- [ ] Check File 4 was added (context menu actions)
- [ ] Verify `this.RES.medicine` exists
- [ ] Check colonist has `health` property
- [ ] Look for typos in case statements

### Issue: Colonists never go downed
**Solution:**
- [ ] Check File 5 was added (auto-downed check)
- [ ] Verify health thresholds are correct
- [ ] Check `c.health.consciousness` is updating
- [ ] Try more severe injuries

### Issue: Medicine not consumed
**Solution:**
- [ ] Verify `this.RES.medicine` initialized
- [ ] Check context menu decrements count
- [ ] Look for `this.RES.medicine -= 1` in code
- [ ] Check console for errors

## Post-Implementation

### Optional Enhancements (Future)
- [ ] Add medicine display to UI
- [ ] Show treatment quality in UI
- [ ] Add medical room bonuses
- [ ] Implement proper rescue carrying
- [ ] Add treatment progress bar
- [ ] Show active medical jobs list

### Documentation
- [ ] Star this repo (if helpful!)
- [ ] Document any issues encountered
- [ ] Note any improvements made
- [ ] Share with other developers

## Success Metrics

**Minimum Success (Phase 1):**
- ✅ Colonists automatically treat injuries
- ✅ Treatment messages appear
- ✅ Context menu works

**Full Success (Phase 2):**
- ✅ All above
- ✅ Downed state works
- ✅ Rescue option works
- ✅ Medicine consumed properly

**Excellent Success (Phase 3):**
- ✅ All above
- ✅ Quality affects outcomes noticeably
- ✅ Skill progression visible
- ✅ System feels automated and balanced

## Final Verification

- [ ] All 5 files modified correctly
- [ ] All tests pass
- [ ] No errors in console
- [ ] Game feels better than before
- [ ] Medical emergencies create gameplay moments
- [ ] Ready to play and enjoy!

---

## Time Tracking

- Pre-reading: _____ minutes
- File 1 implementation: _____ minutes
- File 2 implementation: _____ minutes
- File 3 implementation: _____ minutes
- File 4 implementation: _____ minutes
- File 5 implementation: _____ minutes
- Testing: _____ minutes
- Troubleshooting: _____ minutes
- **Total: _____ minutes**

**Target: 30-40 minutes**

---

## Notes & Observations

```
Add your notes here:
- What worked well?
- What was confusing?
- What would you improve?
- Any bugs found?
```

---

**Status:** □ Not Started | □ In Progress | □ Complete | □ Tested | □ Production Ready

**Completed on:** _______________

**Implemented by:** _______________

---

**Ready to start? Open MEDICAL_VISUAL_GUIDE.md and begin!** 🚀
