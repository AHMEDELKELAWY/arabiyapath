import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { generateBreadcrumbListSchema } from "@/lib/seo/breadcrumbs";

const breadcrumbSchema = generateBreadcrumbListSchema([
  { name: "Home", path: "/" },
  { name: "Terms of Service", path: "/terms" },
]);

export default function Terms() {
  return (
    <>
      <SEOHead
        title="Terms of Service"
        description="Read the Terms of Service for ArabiyaPath. Learn about account creation, payments, acceptable use, intellectual property, and your rights as a user."
        canonicalPath="/terms"
        jsonLd={breadcrumbSchema}
      />
      <Layout>
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto prose prose-gray dark:prose-invert">
              <h1 className="text-4xl font-bold text-foreground mb-8">Terms of Service</h1>
              <p className="text-muted-foreground mb-8">
                <strong>Last updated:</strong> January 2026
              </p>

              <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">1. Overview</h2>
              <p className="text-muted-foreground mb-4">
                Welcome to ArabiyaPath. By accessing or using our website and services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.
              </p>
              <p className="text-muted-foreground mb-4">
                ArabiyaPath provides online Arabic language learning courses, including audio lessons, quizzes, and certificates. Our services are designed for non-native speakers seeking to learn Arabic dialects.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">2. Accounts</h2>
              <p className="text-muted-foreground mb-4">
                To access certain features, you must create an account. You are responsible for:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                <li>Providing accurate and complete registration information</li>
                <li>Maintaining the security of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use</li>
              </ul>
              <p className="text-muted-foreground mb-4">
                You must be at least 13 years of age to create an account. If you are under 18, you must have parental or guardian consent.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">3. Payments and Subscriptions</h2>
              <p className="text-muted-foreground mb-4">
                ArabiyaPath offers one-time purchase courses with lifetime access. When you purchase:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                <li>Payment is processed securely through PayPal or authorized payment providers</li>
                <li>Prices are displayed in USD and are subject to change without notice</li>
                <li>Access is granted immediately upon successful payment confirmation</li>
                <li>Purchases are non-transferable and for personal use only</li>
              </ul>

              <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">4. Refunds</h2>
              <p className="text-muted-foreground mb-4">
                We offer a 30-day money-back guarantee on all purchases. To request a refund:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                <li>Contact us within 30 days of purchase at admin@arabiyapath.com</li>
                <li>Include your order details and reason for refund</li>
                <li>Refunds are processed within 5-10 business days</li>
              </ul>
              <p className="text-muted-foreground mb-4">
                Refund requests made after 30 days may be considered on a case-by-case basis but are not guaranteed.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">5. Acceptable Use</h2>
              <p className="text-muted-foreground mb-4">
                You agree not to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                <li>Share, distribute, or resell course content</li>
                <li>Use automated systems to access or scrape our content</li>
                <li>Attempt to bypass security measures or access restrictions</li>
                <li>Use the platform for any unlawful purpose</li>
                <li>Impersonate others or provide false information</li>
                <li>Interfere with or disrupt the platform's operation</li>
              </ul>
              <p className="text-muted-foreground mb-4">
                Violation of these terms may result in account suspension or termination without refund.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">6. Intellectual Property</h2>
              <p className="text-muted-foreground mb-4">
                All content on ArabiyaPath, including but not limited to text, audio, images, videos, and course materials, is owned by or licensed to ArabiyaPath and protected by copyright and other intellectual property laws.
              </p>
              <p className="text-muted-foreground mb-4">
                Your purchase grants you a personal, non-exclusive, non-transferable license to access and use the purchased content for your own educational purposes. You may not reproduce, distribute, modify, or create derivative works without written permission.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">7. Disclaimer of Warranties</h2>
              <p className="text-muted-foreground mb-4">
                ArabiyaPath provides services "as is" without warranties of any kind, either express or implied. We do not guarantee:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                <li>Specific language learning outcomes or fluency levels</li>
                <li>Uninterrupted or error-free access to the platform</li>
                <li>Compatibility with all devices or browsers</li>
              </ul>
              <p className="text-muted-foreground mb-4">
                Your progress depends on your dedication and practice. We provide tools and resources to support your learning journey.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">8. Limitation of Liability</h2>
              <p className="text-muted-foreground mb-4">
                To the maximum extent permitted by law, ArabiyaPath shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use our services.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">9. Changes to Terms</h2>
              <p className="text-muted-foreground mb-4">
                We may update these Terms of Service from time to time. Changes will be posted on this page with an updated revision date. Continued use of the platform after changes constitutes acceptance of the new terms.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">10. Contact</h2>
              <p className="text-muted-foreground mb-4">
                If you have questions about these Terms of Service, please contact us at:
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
