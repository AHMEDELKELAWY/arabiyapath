import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  noindex?: boolean;
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
      {noindex && <meta name="robots" content="noindex,nofollow" />}
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
