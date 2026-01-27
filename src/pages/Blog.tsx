import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { blogPosts } from "@/content/blog";
import { CalendarDays, ArrowRight } from "lucide-react";

export default function Blog() {
  return (
    <Layout>
      <SEOHead 
        title="Blog - Arabic Learning Tips & Insights"
        description="Explore expert tips, guides, and insights for learning Arabic. From Gulf Arabic to Fusha, discover resources to accelerate your language journey."
        canonicalPath="/blog"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Blog",
          "name": "ArabiyaPath Blog",
          "description": "Expert tips and insights for learning Arabic",
          "url": "https://arabiyapath.com/blog",
          "publisher": {
            "@type": "Organization",
            "name": "ArabiyaPath",
            "url": "https://arabiyapath.com"
          }
        }}
      />
      
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Arabic Learning <span className="text-primary">Blog</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Expert tips, guides, and insights to help you master Arabic—whether you're learning Gulf Arabic, Fusha, or exploring the language for the first time.
            </p>
          </div>
          
          {/* Blog Posts Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {blogPosts.map((post) => (
              <Link key={post.slug} to={`/blog/${post.slug}`} className="group">
                <Card className="h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-border/50 hover:border-primary/30">
                  <CardHeader>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <CalendarDays className="w-4 h-4" />
                      <time dateTime={post.date}>
                        {new Date(post.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </time>
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground line-clamp-3 mb-4">
                      {post.excerpt}
                    </p>
                    <span className="inline-flex items-center gap-1 text-primary font-medium text-sm group-hover:gap-2 transition-all">
                      Read more <ArrowRight className="w-4 h-4" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          
          {/* CTA Section */}
          <div className="mt-16 text-center">
            <div className="glass rounded-2xl p-8 max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold mb-3">Ready to Start Learning?</h2>
              <p className="text-muted-foreground mb-6">
                Put these tips into practice with our structured Arabic courses.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  to="/learn/gulf-arabic" 
                  className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Explore Gulf Arabic
                </Link>
                <Link 
                  to="/learn/fusha-arabic" 
                  className="inline-flex items-center justify-center gap-2 border-2 border-primary text-primary px-6 py-3 rounded-lg font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  Explore Fusha Arabic
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
