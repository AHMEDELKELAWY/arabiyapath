import { useState } from "react";
import { Link } from "react-router-dom";
import { formatPrice } from "@/lib/partnerConfig";
import logoImage from "@/assets/logo.png";

const TESTIMONIALS = [
  { stars: "★★★★★", text: "“Finally a vocabulary course that doesn't feel like a textbook. The native audio and real photos make every word stick — I retained more in 2 weeks than I did in 6 months of apps.”", initial: "L", name: "Léa M.", place: "Paris, France", cls: "ph-a1" },
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

interface Props {
  config: any;
  ctaHref: string;
  ownerName: string;
  discountPct: number;
  arrowSvg: React.ReactNode;
}

export default function PartnerLandingBelowFold({ config, ctaHref, ownerName, discountPct, arrowSvg }: Props) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <>
      {/* STATS */}
      <div className="ph-stats-bar">
        <div className="wrap ph-stats-grid">
          {config.stats.slice(0, 4).map((s: any) => (
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
            {config.modeCards.map((m: any) => (
              <div className="ph-mode-card" key={m.key}>
                <div className={`ph-mode-icon ${MODE_CLASS[m.key as keyof typeof MODE_CLASS]}`}>{MODE_EMOJI[m.key as keyof typeof MODE_EMOJI]}</div>
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
              <h3>The complete Vocabulary Course</h3>
              <ul>
                {config.pricingIncludes.map((i: string) => (
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
            {config.faq.map((f: any, i: number) => (
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
          <img src={logoImage} alt="ArabiyaPath" width={36} height={36} loading="lazy" decoding="async" />
          <span>ArabiyaPath</span>
        </div>
        <p>© {new Date().getFullYear()} ArabiyaPath · Private invitation for {ownerName}'s students</p>
      </footer>
    </>
  );
}
