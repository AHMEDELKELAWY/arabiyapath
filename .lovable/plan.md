## السبب الجذري

سعر باقة الفلاش كارد مخزن في مكانين منفصلين في قاعدة البيانات:

- `products.price` — هذا اللي بتعدله من صفحة **Admin → Products** (تم تغييره إلى `$29.99`).
- `flashcard_packs.price_cents` — لا يزال `1999` (= `$19.99`). كل صفحات الموقع (FlashCardsHome، FlashCardsSalesPage، FlashCardPack) تقرأ من هنا، ولذلك السعر لم يتغير.

بالإضافة لذلك، صفحة `Pricing.tsx` فيها سعر **مكتوب يدويًا** `$19.99` في كارت Flash Cards (السطر 402) ولا تقرأ من قاعدة البيانات أصلاً.

## الخطة

### 1) توحيد مصدر السعر
عند حفظ منتج من `AdminProducts.tsx`:
- لو المنتج `scope = 'flashcard_pack'`، نعمل `UPDATE` على `flashcard_packs.price_cents` للباقة المرتبطة (`flashcard_packs.product_id = products.id`) ليساوي `round(price * 100)`.
- نفس المنطق على إنشاء منتج جديد لو تم لاحقًا ربطه بباقة.

### 2) Migration لمزامنة فورية لمرة واحدة
تحديث `flashcard_packs.price_cents` لكل صف مرتبط بمنتج، ليأخذ السعر الحالي من `products.price`. ده هيصلح الحالة الحالية ($29.99 يظهر في الموقع).

### 3) إزالة السعر المكتوب يدوياً في `Pricing.tsx`
- قراءة باقة الفلاش كارد المنشورة من `flashcard_packs` (مثل ما يفعله `FlashCardsHome`).
- استبدال `$19.99` الصريح بـ `${(pack.price_cents/100).toFixed(2)}`.
- استبدال أي نص آخر فيه `$19.99` بالقيمة الديناميكية.

### ملفات سيتم تعديلها
- `src/pages/admin/AdminProducts.tsx` — مزامنة السعر مع `flashcard_packs` بعد update/create.
- `src/pages/Pricing.tsx` — قراءة السعر من قاعدة البيانات بدل الكتابة اليدوية.
- migration بسيطة لمزامنة الأسعار الحالية لمرة واحدة.

### نطاق غير متأثر
لا تغييرات على بنية الفلاش كارد، الصور، الصوت، SRS، المشتريات، أو منطق الـ access. مجرد توحيد عرض السعر.

### قبول
- تغيير سعر "Modern Standard Arabic Flash Cards Pack" من Admin Products يظهر فورًا (بعد refresh) في: `/flashcards`، `/flashcards/pack/...`، `/pricing`، وصفحة sales.
- جميع الصفحات تعرض نفس السعر دائمًا.
