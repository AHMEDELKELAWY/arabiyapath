## Classroom Tabs لكل وحدة فلاش كاردز

إضافة شريط تبويبات داخل صفحة الوحدة (`/flashcards/unit/:slug`) باسم "In the Classroom" يحتوي على 4 أقسام: **Learning** و **Listening** و **Speaking** و **Test Yourself**. حالياً يُبنى **Speaking** فعلياً (وهو تجربة الـ SRS الحالية)، والباقي placeholders بـ "Coming Soon".

### التغييرات

1. **`src/pages/flashcards/FlashCardUnit.tsx`**
   - إضافة قسم "In the Classroom" أعلى الصفحة باستخدام مكون `Tabs` من shadcn.
   - 4 تبويبات بأيقونات: BookOpen (Learning), Headphones (Listening), Mic (Speaking), GraduationCap (Test Yourself).
   - Learning / Listening / Test Yourself: بطاقة "Coming Soon" أنيقة مع وصف موجز للقسم.
   - Speaking: زر "Start Speaking Practice" يفتح `/flashcards/study/:slug` (نفس التدفق الحالي) + يعرض شريط التقدم الحالي (reviewed/total).

2. **العدّاد**  
   حسب اختيارك "مجموع الإنجاز عبر الأقسام الأربعة": نضيف عمود مستقبلي في حساب التقدم، لكن بما أن 3 أقسام Coming Soon فقط، سنُبقي العدّاد الظاهر على Speaking حالياً ونضع تعليق `TODO` لجمع التقدم من الأقسام الجديدة عند تفعيلها (لا تعديل قاعدة بيانات الآن).

### ملاحظات

- لا تغييرات في قاعدة البيانات أو الـ RLS.
- لا تأثير على صفحات لوحة التحكم أو الإدارة.
- الـ routes كما هي: `/flashcards/study/:slug` يبقى للـ Speaking.
