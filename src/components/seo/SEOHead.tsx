import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  noindex?: boolean;
  robots?: string;
  jsonLd?: object | object[];
}

const SITE_NAME = 'ArabiyaPath';
const BASE_URL = 'https://arabiyapath.com';
const DEFAULT_TITLE = 'ArabiyaPath - Master Arabic the Natural Way';
const DEFAULT_DESC = 'Learn Arabic dialects online with ArabiyaPath. Master Gulf, Egyptian, or Modern Standard Arabic through immersive lessons, native audio, and earn certificates.';
const DEFAULT_OG_IMAGE = '/og-image.png';

export function SEOHead({
  title,
  description,
  canonicalPath = '',
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  noindex = false,
  robots,
  jsonLd,
}: SEOProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const metaDescription = description || DEFAULT_DESC;
  const canonicalUrl = `${BASE_URL}${canonicalPath}`;
  const imageUrl = ogImage.startsWith('http') ? ogImage : `${BASE_URL}${ogImage}`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Site Icons */}
      <link rel="icon" href="/favicon.ico" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/site.webmanifest" />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={imageUrl} />

      {/* Robots */}
      {robots ? (
        <meta name="robots" content={robots} />
      ) : (
        noindex && <meta name="robots" content="noindex,nofollow" />
      )}

      {/* JSON-LD Structured Data */}
      {jsonLd &&
        (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).map((schema, idx) => (
          <script key={idx} type="application/ld+json">
            {JSON.stringify(schema)}
          </script>
        ))}
    </Helmet>
  );
}

// SEO data helpers for dialects
export const getDialectSEO = (dialectName: string): { title: string; description: string } => {
  const seoMap: Record<string, { title: string; description: string }> = {
    'Gulf Arabic': {
      title: 'Learn Gulf Arabic (Khaleeji)',
      description: 'Speak Arabic like a native in UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, and Oman. Master Gulf dialect with practical lessons, native audio, and earn certificates.',
    },
    'Egyptian Arabic': {
      title: 'Learn Egyptian Arabic',
      description: 'The most widely understood Arabic dialect. Perfect for travel, media, and entertainment. Learn Egyptian Arabic with immersive lessons and native speakers.',
    },
    'Modern Standard Arabic': {
      title: 'Learn Modern Standard Arabic (Fusha)',
      description: 'Master formal Arabic for media, academia, and international business. Learn MSA with comprehensive lessons, native audio, and earn recognized certificates.',
    },
  };
  
  return seoMap[dialectName] || {
    title: `Learn ${dialectName}`,
    description: `Master ${dialectName} with ArabiyaPath. Practical lessons, native audio, and certificates to prove your progress.`,
  };
};

// JSON-LD Schema Generators
export const generateOrganizationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "name": "ArabiyaPath",
  "url": "https://arabiyapath.com",
  "logo": "https://arabiyapath.com/logo.png",
  "description": "Learn Arabic dialects online with ArabiyaPath. Master Gulf, Egyptian, or Modern Standard Arabic through immersive lessons, native audio, and earn certificates."
});

export const generateWebSiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "url": "https://arabiyapath.com",
  "name": "ArabiyaPath",
});

export const generateCourseSchema = (
  dialectName: string,
  description: string,
  canonicalPath: string
) => {
  const courseNames: Record<string, string> = {
    'Gulf Arabic': 'Gulf Arabic Course (Khaleeji)',
    'Egyptian Arabic': 'Egyptian Arabic Course',
    'Modern Standard Arabic': 'Modern Standard Arabic Course (Fusha)',
  };

  return {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": courseNames[dialectName] || `${dialectName} Course`,
    "description": description,
    "url": `https://arabiyapath.com${canonicalPath}`,
    "provider": {
      "@type": "Organization",
      "name": "ArabiyaPath",
      "url": "https://arabiyapath.com"
    },
    "inLanguage": "en",
    "audience": {
      "@type": "Audience",
      "audienceType": "Non-native Arabic speakers, Expats, Language learners"
    }
  };
};

export type FAQItem = { q: string; a: string };

export const generateFAQPageSchema = (canonicalPath: string, faqs: FAQItem[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "url": `https://arabiyapath.com${canonicalPath}`,
  "mainEntity": faqs.map((faq) => ({
    "@type": "Question",
    "name": faq.q,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.a,
    },
  })),
});
