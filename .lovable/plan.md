Plan to fix the Flash Cards counter:

1. Update the Progress page Flash Cards accordion
   - Change the per-unit row counter and progress bar from `mastered/total` to `reviewed/total`.
   - Change the top Flash Cards card progress from `mastered/total cards` to `reviewed/total cards` so a finished unit shows immediately.
   - Keep the separate “Mastered” stat unchanged, because that means SRS mastery after repeated reviews, not first completion.

2. Update the Dashboard Flash Cards section
   - Change each unit’s progress row from `mastered/total` to `reviewed/total`.
   - Keep the “Mastered” stat unchanged.
   - Keep units completed as `reviewed >= total`, which is already the right rule.

3. Add a safe fallback
   - If older cached/API data has no `reviewed` field, fall back to `mastered` so the UI never breaks.

4. Verify the result
   - Confirm “Market & Food” will show `13/13` after completion, and the product header will show reviewed-card progress while the Mastered stat remains `1` until SRS mastery increases.