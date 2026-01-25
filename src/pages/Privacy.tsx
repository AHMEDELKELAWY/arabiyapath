import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { generateBreadcrumbListSchema } from "@/lib/seo/breadcrumbs";

const breadcrumbSchema = generateBreadcrumbListSchema([
  { name: "Home", path: "/" },
  { name: "Privacy Policy", path: "/privacy" },
]);

export default function Privacy() {
  return (
    <>
      <SEOHead
        title="Privacy Policy"
        description="Learn how ArabiyaPath collects, uses, and protects your personal information. Our privacy policy covers data collection, cookies, third-party services, and your rights."
        canonicalPath="/privacy"
        jsonLd={breadcrumbSchema}
      />
      <Layout>
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto prose prose-gray dark:prose-invert">
              <h1 className="text-4xl font-bold text-foreground mb-8">Privacy Policy</h1>
              <p className="text-muted-foreground mb-8">
                <strong>Last updated:</strong> January 2026
              </p>

              <p className="text-muted-foreground mb-6">
                At ArabiyaPath, we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">1. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Personal Information</h3>
              <p className="text-muted-foreground mb-4">
                When you create an account or make a purchase, we may collect:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                <li>Name and email address</li>
                <li>Payment information (processed securely by PayPal)</li>
                <li>Account credentials</li>
                <li>Learning progress and quiz results</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Contact Form Data</h3>
              <p className="text-muted-foreground mb-4">
                When you contact us through our contact form, we collect your name, email address, and message content to respond to your inquiry.
              </p>

              <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Automatically Collected Information</h3>
              <p className="text-muted-foreground mb-4">
                When you visit our website, we automatically collect:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                <li>Browser type and version</li>
                <li>Operating system</li>
                <li>Pages visited and time spent</li>
                <li>Referring website</li>
                <li>IP address (anonymized where possible)</li>
              </ul>

              <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">2. How We Use Your Information</h2>
              <p className="text-muted-foreground mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                <li>Provide and maintain our services</li>
                <li>Process payments and deliver purchased content</li>
                <li>Track your learning progress and issue certificates</li>
                <li>Send transactional emails (purchase confirmations, account updates)</li>
                <li>Respond to your inquiries and support requests</li>
                <li>Improve our website and course content</li>
                <li>Send marketing communications (with your consent)</li>
                <li>Prevent fraud and ensure security</li>
              </ul>

              <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">3. Cookies and Tracking</h2>
              <p className="text-muted-foreground mb-4">
                We use cookies and similar tracking technologies to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                <li>Keep you signed in to your account</li>
                <li>Remember your preferences</li>
                <li>Analyze website traffic and usage patterns</li>
                <li>Improve user experience</li>
              </ul>
              <p className="text-muted-foreground mb-4">
                You can control cookies through your browser settings. Disabling cookies may affect some features of our website.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">4. Third-Party Services</h2>
              <p className="text-muted-foreground mb-4">
                We use the following third-party services that may collect information:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                <li><strong>Google Analytics 4 (GA4):</strong> Website analytics to understand how visitors use our site. Data is anonymized and aggregated.</li>
                <li><strong>PayPal:</strong> Payment processing. PayPal has its own privacy policy governing payment data.</li>
                <li><strong>Postmark:</strong> Transactional email delivery for account notifications and contact form responses.</li>
              </ul>
              <p className="text-muted-foreground mb-4">
                These services have their own privacy policies, and we encourage you to review them.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">5. Data Retention</h2>
              <p className="text-muted-foreground mb-4">
                We retain your personal information for as long as:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                <li>Your account remains active</li>
                <li>Necessary to provide our services</li>
                <li>Required by law or for legal purposes</li>
              </ul>
              <p className="text-muted-foreground mb-4">
                Learning progress and certificates are retained indefinitely to ensure you maintain access to your achievements. If you delete your account, personal data is removed within 30 days, except where retention is required by law.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">6. Data Security</h2>
              <p className="text-muted-foreground mb-4">
                We implement appropriate security measures to protect your information, including:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                <li>HTTPS encryption for all data transmission</li>
                <li>Secure password hashing</li>
                <li>Regular security audits</li>
                <li>Limited access to personal data by staff</li>
              </ul>
              <p className="text-muted-foreground mb-4">
                However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">7. Your Rights</h2>
              <p className="text-muted-foreground mb-4">
                Depending on your location, you may have the right to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                <li>Access the personal information we hold about you</li>
                <li>Correct inaccurate information</li>
                <li>Delete your account and personal data</li>
                <li>Opt out of marketing communications</li>
                <li>Export your data in a portable format</li>
              </ul>
              <p className="text-muted-foreground mb-4">
                To exercise these rights, contact us at admin@arabiyapath.com.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">8. Children's Privacy</h2>
              <p className="text-muted-foreground mb-4">
                Our services are not intended for children under 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected such information, we will take steps to delete it.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">9. Changes to This Policy</h2>
              <p className="text-muted-foreground mb-4">
                We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated revision date. We encourage you to review this policy periodically.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">10. Contact Us</h2>
              <p className="text-muted-foreground mb-4">
                If you have questions about this Privacy Policy or our data practices, please contact us at:
              </p>
              <p className="text-muted-foreground">
                <strong>Email:</strong> admin@arabiyapath.com
              </p>
            </div>
          </div>
        </section>
      </Layout>
    </>
  );
}
