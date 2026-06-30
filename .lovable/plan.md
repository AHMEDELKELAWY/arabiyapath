# Affiliate Flow Improvements

## Your questions answered first

**س: هل المستخدم يقدر يسجل كافيليت بنفس الإيميل اللي مسجل دخول بيه؟**
نعم، ومفيش أي تضارب. النظام الحالي بالفعل بيستخدم الـ `user_id` الخاص بالمستخدم المسجل دخوله. كل مستخدم يقدر يقدّم طلب أفيليت واحد فقط (في `unique constraint` على `user_id` في جدول `affiliate_applications` و `affiliates`). يعني نفس الحساب = نفس الإيميل، بدون أي ازدواج.

**س: لما الطالب يسجل عن طريق رابط الأفيليت، تظهر بياناته ونسبة الخصم اللي خدها؟**
ده اللي هنضيفه في الجزء الثالث.

---

## What I'll build

### 1) Admin notification on new affiliate application

- **Email للأدمن**: عند تقديم أي طلب أفيليت جديد، يتبعت إيميل لـ `admin@arabiyapath.com` فيه: الاسم، الإيميل، التليفون، طريقة الترويج، ورابط مباشر لصفحة الطلبات في الأدمن.
- **شارة (badge) داخل الأدمن**: يظهر عدّاد بعدد الطلبات "pending" جنب لينك "Affiliate Applications" في الـ AdminLayout sidebar، عشان تشوف فوراً لما يجي طلب جديد.

### 2) Auto-create or link a coupon on approval

في صفحة `AdminAffiliateApplications` لما تضغط Approve، الـ dialog هيتعدّل عشان يخليك تختار:
- **Create new coupon**: تدخل code (افتراضي = نفس الـ affiliate_code)، نسبة الخصم (افتراضي 10%)، ومدة الصلاحية اختيارية. هيتعمل insert في `coupons` مع ربط `affiliate_id`.
- **Link existing coupon**: dropdown بكل الكوبونات اللي مش مربوطة بأفيليت، تختار واحد وهيتعمل update لـ `coupons.affiliate_id`.
- **Skip**: لو مش عايز كوبون دلوقتي.

كل ده يتم في نفس الـ mutation اللي بيوافق على الطلب (داخل `useApproveAffiliateApplication`)، فيتم الموافقة + إنشاء/ربط الكوبون + إرسال إيميل الترحيب (موجود فعلاً) في خطوة واحدة. إيميل الترحيب هيتعدّل ليحتوي على كود الخصم لو موجود.

### 3) Referral details on the affiliate dashboard

صفحة `AffiliateReferrals.tsx` حالياً بتعرض اسم المنتج والمبلغ بس. هنوسّعها لتعرض جدول بالأعمدة:
- اسم الطالب (من `profiles.first_name + last_name`)
- إيميل الطالب (من `profiles.email`)
- المنتج
- المبلغ الأصلي
- كود الخصم المستخدم (من `purchases.coupon_id → coupons.code`)
- نسبة الخصم (`coupons.percent_off`)
- المبلغ بعد الخصم (المدفوع فعلاً)
- العمولة (من `affiliate_commissions.commission_amount`)
- التاريخ

التعديلات في `useAffiliateReferrals` hook: يضم join مع `profiles` و `coupons` و `affiliate_commissions`.

**ملاحظة خصوصية**: عرض إيميل الطالب الكامل قد يكون مبالغ فيه. لو حابب نخفي الإيميل (مثلاً `j***@gmail.com`) قولي.

---

## Technical details

**Files to edit:**
- `src/hooks/useAffiliateApplications.ts` — extend `useSubmitAffiliateApplication` to invoke a new edge function for admin notification; extend `useApproveAffiliateApplication` to accept coupon options and create/link the coupon.
- `src/pages/admin/AdminAffiliateApplications.tsx` — add coupon section in the approval dialog (create new / link existing / skip).
- `src/components/admin/AdminLayout.tsx` — show pending applications count badge on the sidebar link.
- `src/hooks/useAffiliateData.ts` — extend `useAffiliateReferrals` to join profiles, coupons, and commissions.
- `src/pages/affiliate/AffiliateReferrals.tsx` — render the new columns.
- `supabase/functions/send-affiliate-welcome-email/index.ts` — include coupon code in welcome email if provided.

**New files:**
- `supabase/functions/notify-admin-affiliate-application/index.ts` — sends email to `admin@arabiyapath.com` via Zoho SMTP (already configured) when a new application is submitted.
- `supabase/config.toml` entry with `verify_jwt = false` for the new function (called right after applicant signs in, but doesn't need full auth verification).

**Migration:**
- Add RPC `admin_pending_applications_count()` (SECURITY DEFINER, admin-only) to feed the sidebar badge without exposing the table to non-admins.
- Add SELECT policy on `profiles` and `coupons` filtered through affiliate ownership? Actually, simpler: create a SECURITY DEFINER function `affiliate_referrals(_user uuid)` that returns the enriched rows for the calling affiliate only. This avoids opening RLS on `profiles` to affiliates.

**No changes to:** payments, RLS for non-affiliate tables, existing pricing, or the public coupon API.

---

## Out of scope (tell me if you want them)

- Push/in-app notifications (we're doing email + sidebar badge only).
- Auto-creating a unique coupon at signup time (we only create on approval).
- Hiding the student's email behind a mask.
