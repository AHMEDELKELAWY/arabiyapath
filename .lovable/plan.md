## المشكلة

في لوحة التحكم (Dashboard)، قسم Flash Cards → "In The Classroom" والروابط الخاصة بكل وحدة تذهب مباشرة إلى `/flashcards/study/:slug` (وهي جلسة SRS / Speaking مباشرة)، فلا تظهر الـ 4 تابات الجديدة.

التابات الـ 4 (Learning / Listening / Speaking / Test Yourself) موجودة فعلاً في صفحة الوحدة `/flashcards/unit/:slug` — لكن الـ Dashboard لا يوجّه إليها.

## الحل

تعديل ملف واحد فقط:

**`src/components/dashboard/FlashcardsDashboardSection.tsx`**
- تغيير كل روابط الوحدات من `/flashcards/study/${u.slug}` إلى `/flashcards/unit/${u.slug}` بحيث يفتح Classroom بالـ 4 تابات بدلاً من بدء جلسة SRS مباشرة.
- الإبقاء على باراميتر `?from=dashboard` كما هو.

## خارج النطاق

- لا تعديل على صفحة `FlashCardUnit.tsx` (التابات تعمل بالفعل).
- لا تعديل على `/flashcards/study/:slug` (تبقى متاحة كاختصار من داخل تاب Speaking).
- لا تغييرات على قاعدة البيانات أو الـ RLS.
