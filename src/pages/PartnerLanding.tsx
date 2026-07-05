import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SEOHead } from "@/components/seo/SEOHead";
import { Skeleton } from "@/components/ui/skeleton";
import { setPartnerCoupon } from "@/lib/partnerCoupon";
import { buildPartnerConfig, formatPrice } from "@/lib/partnerConfig";
import logoImage from "@/assets/logo.png";

const PACK_SLUG = "msa-flashcards-pack";
const YT_VIDEO_ID = "F6v6FMmXcfE";
const YT_EMBED = `https://www.youtube.com/embed/${YT_VIDEO_ID}?autoplay=1&mute=1&controls=1&loop=1&playlist=${YT_VIDEO_ID}&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3`;

interface PartnerRow {
  id: string;
  slug: string;
  display_name: string;
  campaign_title: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  cta_text: string | null;
  price_override: number | null;
  old_price: number | null;
  landing_enabled: boolean;
  coupons: { code: string; percent_off: number } | null;
}

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;1,700;1,800&display=swap');
.ph-scope{font-family:'Work Sans','Inter',system-ui,sans-serif;background:#FBF8F1;color:#142A20;line-height:1.65;font-feature-settings:"ss01","cv11";-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;overflow-x:hidden;}
.ph-scope *{box-sizing:border-box;}
.ph-scope img{max-width:100%;display:block;}
.ph-scope .display{font-family:'Fraunces',Georgia,serif;font-optical-sizing:auto;}
.ph-scope .arabic{font-family:'Reem Kufi',sans-serif;}
.ph-scope a{color:inherit;text-decoration:none;}
.ph-scope ul{list-style:none;margin:0;padding:0;}
.ph-scope .wrap{max-width:1180px;margin:0 auto;padding:0 24px;}
.ph-scope :focus-visible{outline:3px solid #E8A33D;outline-offset:3px;}
.ph-scope p{font-weight:400;}
.ph-scope h1,.ph-scope h2,.ph-scope h3{font-family:'Fraunces',Georgia,serif;font-optical-sizing:auto;letter-spacing:-0.015em;}
@media (prefers-reduced-motion:reduce){.ph-scope *{animation-duration:0.01ms !important;animation-iteration-count:1 !important;transition-duration:0.01ms !important;}}

.ph-header{position:sticky;top:0;z-index:50;background:rgba(251,248,241,0.92);backdrop-filter:blur(10px);border-bottom:1px solid #E4DDCB;}
.ph-header-inner{display:flex;align-items:center;justify-content:space-between;padding:14px 0;}
.ph-brand{display:flex;align-items:center;gap:10px;}
.ph-brand img{width:36px;height:36px;border-radius:8px;}
.ph-brand span{font-family:'Fraunces';font-weight:600;font-size:1.25rem;color:#0E4D38;}
.ph-invite-badge{display:flex;align-items:center;gap:6px;font-size:0.78rem;color:#125C43;font-weight:700;background:#fff;border:1px solid #E4DDCB;padding:7px 14px;border-radius:999px;}
.ph-invite-badge .dot{width:7px;height:7px;border-radius:50%;background:#E8A33D;flex:none;}

.ph-urgency{background:#C8102E;color:#fff;text-align:center;font-size:0.85rem;font-weight:700;padding:9px 16px;letter-spacing:0.2px;}
.ph-urgency b{font-weight:800;margin-left:4px;}

.ph-hero{background:radial-gradient(ellipse at 75% 15%,#125C43,#0E4D38 45%,#082E22 100%);color:#fff;padding:56px 0 90px;position:relative;overflow:hidden;}
.ph-hero::before{content:"";position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,0.18) 1px,transparent 1.4px);background-size:26px 26px;opacity:0.25;pointer-events:none;}
.ph-hero-grid{display:grid;grid-template-columns:1.1fr 0.9fr;gap:48px;align-items:center;position:relative;z-index:1;}
.ph-eyebrow-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(232,163,61,0.15);border:1px solid rgba(232,163,61,0.5);color:#F6CD89;font-weight:700;font-size:0.85rem;padding:8px 16px;border-radius:999px;margin-bottom:22px;}
.ph-hero h1{font-family:'Playfair Display','Fraunces',Georgia,serif;font-weight:800;font-size:clamp(3rem,6.2vw,5.25rem);line-height:0.98;margin:0 0 18px;letter-spacing:-0.028em;font-kerning:normal;font-feature-settings:"kern","liga","dlig";text-wrap:balance;}
.ph-hero h1 .headline-main{font-family:'Playfair Display','Fraunces',Georgia,serif;font-weight:800;letter-spacing:-0.032em;}
.ph-hero h1 .accent{font-family:'Playfair Display','Fraunces',Georgia,serif;color:#E8A33D;font-style:italic;font-weight:800;letter-spacing:-0.018em;}
.ph-lead{font-size:1.08rem;color:#D9E8E0;max-width:520px;margin:0 0 30px;}
.ph-price-block{display:flex;align-items:flex-end;gap:16px;margin-bottom:26px;flex-wrap:wrap;}
.ph-price-old{font-size:1.15rem;color:#B9CDC3;text-decoration:line-through;margin-bottom:6px;}
.ph-price-new-wrap{display:flex;flex-direction:column;}
.ph-price-new-label{font-size:0.78rem;color:#F6CD89;font-weight:700;margin-bottom:2px;letter-spacing:0.3px;}
.ph-price-new{font-family:'Fraunces';font-weight:600;font-size:2.6rem;color:#fff;line-height:1;}

.ph-cta-btn{display:inline-flex;align-items:center;gap:10px;background:linear-gradient(135deg,#F6CD89,#E8A33D);color:#082E22;font-weight:800;font-size:1.05rem;padding:17px 32px;border-radius:14px;border:none;cursor:pointer;box-shadow:0 14px 30px -8px rgba(232,163,61,0.55);transition:transform .18s ease,box-shadow .18s ease;}
.ph-cta-btn:hover{transform:translateY(-2px);box-shadow:0 18px 38px -8px rgba(232,163,61,0.7);}
.ph-cta-sub{font-size:0.8rem;color:#B9CDC3;margin-top:10px;}

.ph-trust-row{display:flex;flex-wrap:wrap;gap:18px 26px;margin-top:34px;}
.ph-trust-row .item{display:flex;align-items:center;gap:8px;font-size:0.82rem;color:#D9E8E0;}
.ph-trust-row svg{width:18px;height:18px;color:#F6CD89;flex:none;}

.ph-video-stage{position:relative;display:flex;align-items:center;justify-content:center;}
.ph-video-frame{position:relative;width:100%;max-width:330px;aspect-ratio:9/16;border-radius:24px;overflow:hidden;background:#000;box-shadow:0 30px 70px -20px rgba(232,163,61,0.45),0 20px 50px -20px rgba(8,46,34,0.6);border:2px solid rgba(246,205,137,0.35);}
.ph-video-frame::before{content:"";position:absolute;inset:-20px;border-radius:32px;background:radial-gradient(ellipse at center,rgba(232,163,61,0.35),transparent 60%);z-index:-1;filter:blur(20px);}
.ph-video-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0;}

@media (max-width:980px){.ph-hero-grid{grid-template-columns:1fr;}.ph-video-stage{margin-top:10px;}}

.ph-stats-bar{background:#fff;border-bottom:1px solid #E4DDCB;padding:26px 0;}
.ph-stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;text-align:center;}
.ph-stats-grid .num{font-family:'Fraunces';font-weight:600;font-size:1.7rem;color:#0E4D38;}
.ph-stats-grid .lbl{font-size:0.78rem;color:#3F5046;margin-top:2px;}
@media (max-width:700px){.ph-stats-grid{grid-template-columns:repeat(2,1fr);}}

.ph-section{padding:84px 0;}
.ph-sec-head{text-align:center;max-width:640px;margin:0 auto 50px;}
.ph-eyebrow{font-size:0.78rem;font-weight:800;letter-spacing:0.5px;color:#E8A33D;text-transform:uppercase;margin-bottom:10px;}
.ph-sec-head h2{font-family:'Fraunces';font-weight:600;font-size:clamp(1.6rem,3vw,2.3rem);color:#082E22;line-height:1.3;margin:0;}
.ph-sec-head p{color:#3F5046;margin:12px 0 0;font-size:1rem;}

.ph-modes-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;}
.ph-mode-card{background:#fff;border:1px solid #E4DDCB;border-radius:18px;padding:26px 20px;transition:transform .2s ease,box-shadow .2s ease;}
.ph-mode-card:hover{transform:translateY(-5px);box-shadow:0 20px 50px -20px rgba(8,46,34,0.35);}
.ph-mode-icon{width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:22px;}
.ph-m1{background:#E4F1E8;color:#0E4D38;}
.ph-m2{background:#FBEADB;color:#C97A2B;}
.ph-m3{background:#EFE7F8;color:#7B4FC9;}
.ph-m4{background:#E1EEFB;color:#2D6FBF;}
.ph-mode-card h3{font-family:'Fraunces';font-weight:600;font-size:1.1rem;margin:0 0 6px;color:#142A20;}
.ph-mode-card p{font-size:0.85rem;color:#3F5046;margin:0;}
@media (max-width:900px){.ph-modes-grid{grid-template-columns:repeat(2,1fr);}}
@media (max-width:480px){.ph-modes-grid{grid-template-columns:1fr;}}

.ph-return-section{background:#082E22;color:#fff;}
.ph-return-section .ph-sec-head h2{color:#fff;}
.ph-return-section .ph-sec-head p{color:#CBE0D5;}
.ph-return-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
.ph-return-card{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:24px;}
.ph-return-card .num-tag{font-family:'Fraunces';font-weight:600;font-size:1.7rem;color:#F6CD89;margin-bottom:10px;display:block;}
.ph-return-card h3{font-family:'Fraunces';font-weight:600;font-size:1.05rem;margin:0 0 8px;}
.ph-return-card p{font-size:0.85rem;color:#CBE0D5;margin:0;}
@media (max-width:800px){.ph-return-grid{grid-template-columns:1fr;}}

.ph-testi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
.ph-testi-card{background:#fff;border:1px solid #E4DDCB;border-radius:18px;padding:26px;}
.ph-stars{color:#E8A33D;font-size:0.95rem;margin-bottom:12px;letter-spacing:2px;}
.ph-testi-card p{font-size:0.92rem;color:#142A20;margin:0 0 18px;}
.ph-testi-who{display:flex;align-items:center;gap:10px;}
.ph-avatar{width:38px;height:38px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-family:'Fraunces';font-weight:600;color:#fff;font-size:0.9rem;}
.ph-a1{background:#C9756F;}.ph-a2{background:#5B8B6F;}.ph-a3{background:#C9A04A;}
.ph-testi-who .name{font-weight:700;font-size:0.88rem;}
.ph-testi-who .place{font-size:0.75rem;color:#3F5046;}
@media (max-width:900px){.ph-testi-grid{grid-template-columns:1fr;}}

.ph-offer-section{padding:0 0 84px;}
.ph-offer-box{background:linear-gradient(135deg,#0E4D38,#082E22);border-radius:28px;color:#fff;padding:48px;display:grid;grid-template-columns:1.3fr auto 1fr;gap:32px;align-items:center;position:relative;overflow:hidden;}
.ph-offer-box::after{content:"";position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,0.12) 1px,transparent 1.4px);background-size:24px 24px;opacity:0.3;pointer-events:none;}
.ph-offer-left{position:relative;z-index:1;}
.ph-offer-left .tag{color:#F6CD89;font-weight:800;font-size:0.78rem;text-transform:uppercase;margin-bottom:10px;display:block;letter-spacing:0.3px;}
.ph-offer-left h3{font-family:'Fraunces';font-weight:600;font-size:1.8rem;margin:0 0 14px;}
.ph-offer-left ul li{display:flex;align-items:center;gap:9px;font-size:0.88rem;color:#D9E8E0;margin-bottom:8px;}
.ph-offer-left ul li::before{content:"✓";color:#F6CD89;font-weight:bold;}
.ph-offer-mid{text-align:center;position:relative;z-index:1;}
.ph-offer-mid .old{font-size:0.95rem;color:#B9CDC3;text-decoration:line-through;}
.ph-offer-mid .new{font-family:'Fraunces';font-weight:600;font-size:2.8rem;color:#fff;}
.ph-offer-right{text-align:center;position:relative;z-index:1;}
.ph-seal{width:120px;height:120px;border-radius:50%;border:3px dashed #F6CD89;display:flex;align-items:center;justify-content:center;flex-direction:column;margin:0 auto 16px;color:#F6CD89;font-family:'Fraunces';font-weight:600;font-size:0.95rem;line-height:1.3;text-align:center;padding:8px;}
@media (max-width:900px){.ph-offer-box{grid-template-columns:1fr;text-align:center;}.ph-offer-left ul li{justify-content:center;}}

.ph-faq-list{max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:12px;}
.ph-faq-item{background:#fff;border:1px solid #E4DDCB;border-radius:14px;overflow:hidden;}
.ph-faq-q{width:100%;text-align:left;background:none;border:none;cursor:pointer;padding:18px 22px;font-family:'Work Sans';font-weight:700;font-size:0.95rem;color:#142A20;display:flex;align-items:center;justify-content:space-between;gap:12px;}
.ph-faq-q .ico{font-size:1.2rem;color:#0E4D38;flex:none;transition:transform .25s ease;display:inline-block;}
.ph-faq-item.open .ph-faq-q .ico{transform:rotate(45deg);}
.ph-faq-a{max-height:0;overflow:hidden;transition:max-height .3s ease;}
.ph-faq-item.open .ph-faq-a{max-height:400px;}
.ph-faq-a p{padding:0 22px 18px;font-size:0.88rem;color:#3F5046;margin:0;}

.ph-final-cta{background:#E8A33D;text-align:center;padding:60px 24px;border-radius:28px;margin:0 24px;}
.ph-final-cta h2{font-family:'Fraunces';font-weight:600;font-size:clamp(1.5rem,3vw,2.1rem);color:#082E22;margin:0 0 14px;}
.ph-final-cta p{color:#082E22;opacity:0.85;margin:0 0 26px;}
.ph-final-cta .ph-cta-btn{background:#082E22;color:#fff;box-shadow:0 14px 30px -8px rgba(8,46,34,0.4);}
.ph-final-cta .ph-cta-btn:hover{background:#142A20;}

.ph-footer{padding:36px 24px 24px;text-align:center;}
.ph-footer .ph-brand{justify-content:center;margin-bottom:14px;display:inline-flex;}
.ph-footer p{font-size:0.78rem;color:#3F5046;margin:0;}

.ph-sticky-cta{position:fixed;bottom:0;left:0;right:0;z-index:60;background:rgba(255,255,255,0.98);backdrop-filter:blur(10px);border-top:1px solid #E4DDCB;padding:10px 14px calc(10px + env(safe-area-inset-bottom));display:none;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 -10px 30px -10px rgba(0,0,0,0.15);}
.ph-sticky-cta .price{font-family:'Fraunces';font-weight:600;font-size:1.15rem;color:#0E4D38;line-height:1;}
.ph-sticky-cta .price small{font-size:0.72rem;color:#3F5046;text-decoration:line-through;margin-left:6px;font-family:'Work Sans';}
.ph-sticky-cta .ph-cta-btn{padding:12px 18px;font-size:0.9rem;white-space:nowrap;}

@media (max-width:760px){
  .ph-sticky-cta{display:flex;}
  .ph-scope{padding-bottom:calc(72px + env(safe-area-inset-bottom));}
  .ph-hero{padding:36px 0 48px;}
  .ph-hero-grid{gap:32px;}
  .ph-video-frame{max-width:280px;}
  .ph-section{padding:56px 0;}
  .ph-sec-head{margin-bottom:32px;}
  .ph-offer-section{padding:0 0 56px;}
  .ph-offer-box{padding:32px 22px;border-radius:22px;gap:22px;}
  .ph-offer-left h3{font-size:1.4rem;}
  .ph-offer-mid .new{font-size:2.2rem;}
  .ph-seal{width:100px;height:100px;font-size:0.85rem;}
  .ph-final-cta{padding:44px 22px;margin:0 16px;border-radius:22px;}
  .ph-footer{padding:28px 20px 20px;}
  .ph-hero h1{font-size:2.65rem;line-height:1.02;}
  .ph-lead{font-size:1rem;}
  .ph-price-new{font-size:2.2rem;}
  .ph-cta-btn{width:auto;}
  .ph-trust-row{gap:12px 18px;margin-top:24px;}
}
@media (max-width:760px){
  section[style*="0 0 60px"]{padding:0 0 40px !important;}
}
`;

const TESTIMONIALS = [
  { stars: "★★★★★", text: "“Finally a flashcard course that doesn't feel like a textbook. The native audio and real photos make every word stick — I retained more in 2 weeks than I did in 6 months of apps.”", initial: "L", name: "Léa M.", place: "Paris, France", cls: "ph-a1" },
  { stars: "★★★★★", text: "“The speaking practice is what sold me. Hearing myself, comparing to the native voice, and improving daily — that's how you actually build confidence in Arabic.”", initial: "S", name: "Sami K.", place: "Montréal, Canada", cls: "ph-a2" },
  { stars: "★★★★★", text: "“Worth every penny — at 50% off it's almost embarrassing. Premium product, no fluff. My pronunciation has changed completely.”", initial: "A", name: "Anissa B.", place: "London, UK", cls: "ph-a3" },
];

const RETURN_CARDS = [
  { num: "01", title: "It actually works", desc: "Spaced repetition + native audio + speaking loops = vocabulary that stays in long-term memory, not lost by tomorrow." },
  { num: "02", title: "Designed for adults", desc: "No cartoons, no streak guilt. A premium learning environment that respects your time and your intelligence." },
  { num: "03", title: "Built for daily life", desc: "Mobile-first study flow you'll open at the café, on the métro, between meetings — wherever the 10 minutes appear." },
];

const MODE_EMOJI = { learn: "📚", listening: "🎧", speaking: "🎤", quiz: "🎯" } as const;
const MODE_CLASS = { learn: "ph-m1", listening: "ph-m2", speaking: "ph-m3", quiz: "ph-m4" } as const;

export default function PartnerLanding() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const { data: partner, isLoading, error } = useQuery({
    queryKey: ["partner", slug],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("partners")
        .select(
          "id, slug, display_name, campaign_title, hero_title, hero_subtitle, cta_text, price_override, old_price, landing_enabled, coupons (code, percent_off)"
        )
        .eq("slug", slug)
        .eq("landing_enabled", true)
        .maybeSingle();
      if (error) throw error;
      return data as PartnerRow | null;
    },
    enabled: !!slug,
  });

  const { data: pack } = useQuery({
    queryKey: ["fc-pack", PACK_SLUG],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcard_packs")
        .select("id, product_id, price_cents, currency")
        .eq("slug", PACK_SLUG)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const config = useMemo(() => {
    if (!partner) return null;
    const basePrice = pack ? pack.price_cents / 100 : partner.old_price ?? 30.00;
    return buildPartnerConfig(partner, basePrice);
  }, [partner, pack]);

  useEffect(() => {
    if (config?.couponCode) setPartnerCoupon(config.couponCode);
  }, [config?.couponCode]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FBF8F1] p-10">
        <Skeleton className="mx-auto h-12 w-2/3" />
        <Skeleton className="mx-auto mt-4 h-6 w-1/2" />
        <Skeleton className="mx-auto mt-8 h-64 w-full max-w-4xl rounded-3xl" />
      </div>
    );
  }
  if (error || !partner || !config) return <Navigate to="/" replace />;

  const checkoutTarget = pack?.product_id ? `/checkout?productId=${pack.product_id}` : "/flashcards-pack";
  const ctaHref = user ? checkoutTarget : `/signup?redirect=${encodeURIComponent(checkoutTarget)}`;
  const discountPct = partner.coupons?.percent_off ?? 0;
  const ownerName = config.partnerName;

  const checkSvg = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
  );
  const arrowSvg = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
  );

  return (
    <div className="ph-scope">
      <SEOHead
        title={`Exclusive Arabic Flashcards Offer for ${ownerName}'s Students`}
        description={`An exclusive invitation for ${ownerName}'s students: ${discountPct}% off the full interactive Arabic flashcard package. Lifetime access.`}
        canonicalPath={`/partner/${config.slug}`}
      />
      <style>{STYLES}</style>

      <div className="ph-urgency">
        ⏳ This offer is exclusive to {ownerName}'s students only and ends soon{" "}
        <b>· {discountPct > 0 ? `${discountPct}% Off Flashcards` : "Exclusive offer"}</b>
      </div>

      <header className="ph-header">
        <div className="ph-header-inner wrap">
          <div className="ph-brand">
            <img src={logoImage} alt="ArabiyaPath" />
            <span>ArabiyaPath</span>
          </div>
          <div className="ph-invite-badge"><span className="dot" />Private invitation</div>
        </div>
      </header>

      {/* HERO */}
      <section className="ph-hero">
        <div className="wrap ph-hero-grid">
          <div>
            <div className="ph-eyebrow-badge">★ Exclusive for {ownerName}'s Students</div>
            <h1>
              <span className="headline-main">Arabic that</span>{" "}<span className="accent">finally sticks</span>.
            </h1>
            <p className="ph-lead">
              A premium flashcard course built around real photos, native voices, and spaced repetition — so vocabulary stays in long-term memory, not in your notes app.
            </p>

            <div className="ph-price-block">
              <div className="ph-price-old">{formatPrice(config.oldPrice)}</div>
              <div className="ph-price-new-wrap">
                <div className="ph-price-new-label">YOUR PRICE TODAY</div>
                <div className="ph-price-new">{formatPrice(config.newPrice)}</div>
              </div>
            </div>

            <Link to={ctaHref} className="ph-cta-btn">
              {config.ctaLabel}
              <span style={{ width: 18, height: 18, display: "inline-flex" }}>{arrowSvg}</span>
            </Link>
            <div className="ph-cta-sub">No coupon code required · Auto-applied at checkout · 30-day guarantee</div>

            <div className="ph-trust-row">
              {["Lifetime Access", "Native Audio", "Speaking Practice", "Certificate", "30-Day Guarantee"].map((t) => (
                <div className="item" key={t}>
                  <span style={{ width: 18, height: 18, display: "inline-flex" }}>{checkSvg}</span>
                  {t}
                </div>
              ))}
            </div>
          </div>

          <div className="ph-video-stage">
            <div className="ph-video-frame">
              <iframe
                src={YT_EMBED}
                title="ArabiyaPath walkthrough"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <div className="ph-stats-bar">
        <div className="wrap ph-stats-grid">
          {config.stats.slice(0, 4).map((s) => (
            <div key={s.label}>
              <div className="num">{s.value}</div>
              <div className="lbl">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* MODES */}
      <section className="ph-section">
        <div className="wrap">
          <div className="ph-sec-head">
            <div className="ph-eyebrow">Four modes · One flow</div>
            <h2>Built like a product, not a textbook.</h2>
            <p>Every mode is designed around how memory actually works — see it, hear it, say it, recall it.</p>
          </div>
          <div className="ph-modes-grid">
            {config.modeCards.map((m) => (
              <div className="ph-mode-card" key={m.key}>
                <div className={`ph-mode-icon ${MODE_CLASS[m.key]}`}>{MODE_EMOJI[m.key]}</div>
                <h3>{m.title}</h3>
                <p>{m.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RETURN */}
      <section className="ph-section ph-return-section">
        <div className="wrap">
          <div className="ph-sec-head">
            <div className="ph-eyebrow" style={{ color: "#F6CD89" }}>Why students keep coming back</div>
            <h2>Designed to make Arabic stay.</h2>
            <p>Most apps teach you words you'll forget by next week. This is built differently.</p>
          </div>
          <div className="ph-return-grid">
            {RETURN_CARDS.map((c) => (
              <div className="ph-return-card" key={c.num}>
                <span className="num-tag">{c.num}</span>
                <h3>{c.title}</h3>
                <p>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="ph-section">
        <div className="wrap">
          <div className="ph-sec-head">
            <div className="ph-eyebrow">Real students · Real results</div>
            <h2>Loved by learners worldwide.</h2>
          </div>
          <div className="ph-testi-grid">
            {TESTIMONIALS.map((t) => (
              <div className="ph-testi-card" key={t.name}>
                <div className="ph-stars">{t.stars}</div>
                <p>{t.text}</p>
                <div className="ph-testi-who">
                  <div className={`ph-avatar ${t.cls}`}>{t.initial}</div>
                  <div>
                    <div className="name">{t.name}</div>
                    <div className="place">{t.place}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OFFER RECAP */}
      <section className="ph-offer-section" id="offer">
        <div className="wrap">
          <div className="ph-offer-box">
            <div className="ph-offer-left">
              <span className="tag">Your exclusive package</span>
              <h3>The complete Flashcards Course</h3>
              <ul>
                {config.pricingIncludes.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
            <div className="ph-offer-mid">
              <div className="old">{formatPrice(config.oldPrice)}</div>
              <div className="new">{formatPrice(config.newPrice)}</div>
            </div>
            <div className="ph-offer-right">
              <div className="ph-seal">
                {discountPct > 0 ? <>{discountPct}%<br />OFF</> : <>Exclusive<br />offer</>}
              </div>
              <Link to={ctaHref} className="ph-cta-btn">{config.ctaLabel}</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="ph-section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="ph-sec-head">
            <div className="ph-eyebrow">Quick answers</div>
            <h2>Everything you'll want to know.</h2>
          </div>
          <div className="ph-faq-list">
            {config.faq.map((f, i) => (
              <div className={`ph-faq-item ${openFaq === i ? "open" : ""}`} key={f.q}>
                <button
                  type="button"
                  className="ph-faq-q"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  {f.q}
                  <span className="ico">+</span>
                </button>
                <div className="ph-faq-a"><p>{f.a}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ padding: "0 0 60px" }}>
        <div className="ph-final-cta">
          <h2>Your private invitation closes soon.</h2>
          <p>Lock in {discountPct > 0 ? `${discountPct}% off` : "your exclusive price"}, get lifetime access, and start speaking Arabic with confidence.</p>
          <Link to={ctaHref} className="ph-cta-btn">
            {config.ctaLabel}
            <span style={{ width: 18, height: 18, display: "inline-flex" }}>{arrowSvg}</span>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="ph-footer">
        <div className="ph-brand">
          <img src={logoImage} alt="ArabiyaPath" />
          <span>ArabiyaPath</span>
        </div>
        <p>© {new Date().getFullYear()} ArabiyaPath · Private invitation for {ownerName}'s students</p>
      </footer>

      {/* MOBILE STICKY CTA */}
      <div className="ph-sticky-cta">
        <div className="price">
          {formatPrice(config.newPrice)} <small>{formatPrice(config.oldPrice)}</small>
        </div>
        <Link to={ctaHref} className="ph-cta-btn">{config.ctaLabel}</Link>
      </div>
    </div>
  );
}
