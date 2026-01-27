import { useParams, Link, Navigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { getPostBySlug } from "@/content/blog";
import { CalendarDays, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPostBySlug(slug) : undefined;
  
  if (!post) {
    return <Navigate to="/blog" replace />;
  }
  
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.description,
    "datePublished": post.date,
    "dateModified": post.date,
    "author": {
      "@type": "Organization",
      "name": "ArabiyaPath",
      "url": "https://arabiyapath.com"
    },
    "publisher": {
      "@type": "Organization",
      "name": "ArabiyaPath",
      "url": "https://arabiyapath.com",
      "logo": {
        "@type": "ImageObject",
        "url": "https://arabiyapath.com/logo.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://arabiyapath.com/blog/${post.slug}`
    }
  };
  
  return (
    <Layout>
      <SEOHead 
        title={post.title}
        description={post.description}
        canonicalPath={`/blog/${post.slug}`}
        ogType="article"
        jsonLd={articleSchema}
      />
      
      <article className="py-12 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <div className="max-w-3xl mx-auto mb-8">
            <Button variant="ghost" asChild className="gap-2 -ml-4">
              <Link to="/blog">
                <ArrowLeft className="w-4 h-4" />
                Back to Blog
              </Link>
            </Button>
          </div>
          
          {/* Article Header */}
          <header className="max-w-3xl mx-auto mb-10 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
              <CalendarDays className="w-4 h-4" />
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </time>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
              {post.title}
            </h1>
          </header>
          
          {/* Article Content */}
          <div className="max-w-3xl mx-auto prose prose-lg dark:prose-invert prose-headings:font-bold prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-li:text-muted-foreground prose-blockquote:border-primary prose-blockquote:text-muted-foreground">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                // Handle internal links
                a: ({ href, children, ...props }) => {
                  const isInternal = href?.startsWith('/');
                  if (isInternal) {
                    return (
                      <Link to={href || '/'} className="text-primary hover:underline">
                        {children}
                      </Link>
                    );
                  }
                  return (
                    <a 
                      href={href} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      {...props}
                    >
                      {children}
                    </a>
                  );
                }
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>
          
          {/* Article Footer CTA */}
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
