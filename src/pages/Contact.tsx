import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { ContactMethods } from "@/components/contact/ContactMethods";
import { ContactFormCard } from "@/components/contact/ContactFormCard";
import { ContactSuccessCard } from "@/components/contact/ContactSuccessCard";

export default function Contact() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  return (
    <>
      <SEOHead
        title="Contact Us"
        description="Have a question about learning Arabic? Contact the ArabiyaPath team. We respond within 24 hours to help you on your Arabic learning journey."
        canonicalPath="/contact"
      />
      <Layout>
      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient opacity-[0.03]" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Get in <span className="text-gradient">Touch</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Have a question or need help? We're here for you.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Methods */}
      <ContactMethods />

      {/* Contact Form */}
      <section className="py-12 pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            {isSubmitted ? (
              <ContactSuccessCard onReset={() => setIsSubmitted(false)} />
            ) : (
              <ContactFormCard onSuccess={() => setIsSubmitted(true)} />
            )}
          </div>
        </div>
      </section>
      </Layout>
    </>
  );
}
