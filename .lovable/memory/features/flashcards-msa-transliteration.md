---
name: Flash Cards transliteration policy
description: Transliteration is stored internally but never displayed in the MSA Flash Cards learner UI
type: constraint
---
Transliteration field on `flashcards` may remain in DB and admin for internal use, but MUST NOT be rendered in the learner-facing Flash Cards interface. Learner back side = vowelized Arabic + English + audio replay only. **Why:** product decision to keep MSA learners reading Arabic script with tashkeel, not crutches.
