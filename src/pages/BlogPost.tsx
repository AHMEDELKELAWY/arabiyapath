import { useParams, Link, Navigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { getPostBySlug, BLOG_SLUG_REDIRECTS } from "@/content/blog";
import { CalendarDays, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateBreadcrumbListSchema } from "@/lib/seo/breadcrumbs";
import { generateFAQPageSchema, type FAQItem } from "@/components/seo/SEOHead";

/** Extra per-post JSON-LD (e.g. HowTo) keyed by slug. */
const EXTRA_SCHEMAS_BY_SLUG: Record<string, object[]> = {
  "learn-gulf-arabic-online-for-beginners": [
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "Learn Gulf Arabic Online for Beginners: The Comprehensive 2026 Guide",
      description:
        "A comprehensive guide for beginners to learn Gulf Arabic (Khaleeji) online. Discover why it's essential for expats in the UAE, Saudi Arabia, and Qatar, how it differs from Fusha, and a 4-step roadmap to learn it effectively.",
      image: "https://arabiyapath.com/images/blog/learn-gulf-arabic-online-for-beginners.jpg",
      totalTime: "PT6M",
      supply: [
        { "@type": "HowToSupply", name: "Internet connection" },
        { "@type": "HowToSupply", name: "ArabiyaPath Arabic learning platform" },
      ],
      tool: [
        { "@type": "HowToTool", name: "Computer or smartphone" },
        { "@type": "HowToTool", name: "Headphones (optional)" },
      ],
      step: [
        {
          "@type": "HowToStep",
          name: "Master the Sounds (Pronunciation First)",
          text: "Start by listening to native Gulf Arabic audio and repeating it aloud to train your ear and tongue to the rhythm and melody of the Gulf dialect.",
        },
        {
          "@type": "HowToStep",
          name: "Learn Survival Phrases",
          text: "Focus on building a solid foundation of high-frequency phrases such as greetings, numbers, and politeness expressions.",
        },
        {
          "@type": "HowToStep",
          name: "Dive into Basic Grammar and Vocabulary",
          text: "After mastering the basics, start learning essential sentence structures and vocabulary related to your daily life.",
        },
        {
          "@type": "HowToStep",
          name: "Practice Consistently and Immerse Yourself",
          text: "Practice the language regularly through conversations, listening to Gulf media, and using learning platforms like ArabiyaPath.",
        },
      ],
      author: { "@type": "Organization", name: "ArabiyaPath" },
      publisher: {
        "@type": "Organization",
        name: "ArabiyaPath",
        logo: { "@type": "ImageObject", url: "https://arabiyapath.com/logo.png" },
      },
    },
  ],
};

/** Parse Q/A pairs from an FAQ section in the markdown so we can emit FAQPage JSON-LD. */
function extractFAQs(md: string): FAQItem[] {
  const sectionMatch = md.match(/##\s+(?:FAQ|FAQs|Frequently Asked Questions)[^\n]*\n([\s\S]*?)(?=\n##\s|$)/i);
  if (!sectionMatch) return [];
  const section = sectionMatch[1];
  const items: FAQItem[] = [];
  // Match "### Question" followed by paragraph(s) until next ### or end
  const qRe = /###\s+([^\n]+)\n+([\s\S]*?)(?=\n###\s|$)/g;
  let m;
  while ((m = qRe.exec(section)) !== null) {
    const q = m[1].replace(/[*_`]/g, "").trim();
    const a = m[2].replace(/\s+/g, " ").replace(/[*_`]/g, "").trim();
    if (q && a) items.push({ q, a: a.slice(0, 500) });
  }
  // Fallback: bold question pattern "**Q:** ... **A:** ..."
  if (!items.length) {
    const boldRe = /\*\*([^*]+\?)\*\*\s*([^\n]+(?:\n(?!\*\*)[^\n]+)*)/g;
    let bm;
    while ((bm = boldRe.exec(section)) !== null) {
      items.push({ q: bm[1].trim(), a: bm[2].replace(/\s+/g, " ").trim().slice(0, 500) });
    }
  }
  return items.slice(0, 10);
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();

  // Consolidated duplicates redirect to their pillar page.
  const redirectTarget = slug ? BLOG_SLUG_REDIRECTS[slug] : undefined;
  if (redirectTarget) {
    return <Navigate to={`/blog/${redirectTarget}`} replace />;
  }

  const post = slug ? getPostBySlug(slug) : undefined;

  if (!post) {
    return <Navigate to="/blog" replace />;
  }


  const canonicalPath = `/blog/${post.slug}`;
  const ogImage = post.image || '/og-image.png';
  const absoluteImage = ogImage.startsWith('http')
    ? ogImage
    : `https://arabiyapath.com${ogImage}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.description,
    "image": [absoluteImage],
    "datePublished": post.date,
    "dateModified": post.date,
    "inLanguage": "en",
    "author": {
      "@type": "Organization",
      "name": "ArabiyaPath",
      "url": "https://arabiyapath.com",
    },
    "publisher": {
      "@type": "Organization",
      "name": "ArabiyaPath",
      "url": "https://arabiyapath.com",
      "logo": {
        "@type": "ImageObject",
        "url": "https://arabiyapath.com/logo.png",
      },
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://arabiyapath.com${canonicalPath}`,
    },
  };

  const breadcrumbSchema = generateBreadcrumbListSchema([
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: post.title, path: canonicalPath },
  ]);

  const faqs = extractFAQs(post.content);
  const schemas: object[] = [articleSchema, breadcrumbSchema];
  if (faqs.length) schemas.push(generateFAQPageSchema(canonicalPath, faqs));
  const extra = EXTRA_SCHEMAS_BY_SLUG[post.slug];
  if (extra) schemas.push(...extra);

  return (
    <Layout>
      <SEOHead
        title={post.title}
        description={post.description || post.excerpt}
        canonicalPath={canonicalPath}
        ogType="article"
        ogImage={ogImage}
        jsonLd={schemas}
      />


      <article className="py-12 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto mb-8">
            <Button variant="ghost" asChild className="gap-2 -ml-4">
              <Link to="/blog">
                <ArrowLeft className="w-4 h-4" />
                Back to Blog
              </Link>
            </Button>
          </div>

          <header className="max-w-3xl mx-auto mb-10 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
              <CalendarDays className="w-4 h-4" />
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
              {post.title}
            </h1>
          </header>

          <div className="max-w-3xl mx-auto prose prose-lg dark:prose-invert prose-headings:font-bold prose-headings:text-foreground prose-headings:scroll-mt-24 prose-p:text-muted-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-li:text-muted-foreground prose-blockquote:border-primary prose-blockquote:text-muted-foreground">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, rehypeSlug]}
              components={{
                a: ({ href, children, id, ...props }: any) => {
                  // Empty in-content anchors like <a id="x"></a> — keep the id for TOC
                  // but render as an invisible span so no link/text appears.
                  const text = Array.isArray(children) ? children.join("") : String(children ?? "");
                  if ((!href || href === "") && !text.trim()) {
                    return <span id={id || props.name} aria-hidden="true" />;
                  }
                  if (href && href.startsWith("/")) {
                    return (
                      <Link to={href} className="text-primary hover:underline">
                        {children}
                      </Link>
                    );
                  }
                  return (
                    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                      {children}
                    </a>
                  );
                },
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>

          <footer className="max-w-3xl mx-auto mt-12 pt-8 border-t border-border">
            <div className="glass rounded-2xl p-8 text-center">
              <h2 className="text-2xl font-bold mb-3">Start Your Arabic Journey Today</h2>
              <p className="text-muted-foreground mb-6">
                Join thousands of learners mastering Arabic with ArabiyaPath's structured courses.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link to="/signup">Sign Up Free</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/pricing">View Pricing</Link>
                </Button>
              </div>
            </div>
          </footer>
        </div>
      </article>
    </Layout>
  );
}
