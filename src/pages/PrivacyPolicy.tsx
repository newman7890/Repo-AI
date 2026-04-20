import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Privacy Policy"
        description="How Renderme AI collects, uses, and protects your photos and personal data."
        canonical="/privacy"
      />
      <header className="border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            Renderme AI
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: April 17, 2026</p>

        <div className="prose prose-invert max-w-none space-y-6 text-foreground/90">
          <section>
            <h2 className="text-2xl font-semibold mb-3">1. Introduction</h2>
            <p>
              Welcome to Renderme AI ("we", "our", "us"). We respect your privacy and are
              committed to protecting your personal data. This privacy policy explains how
              we collect, use, and safeguard your information when you use our website and
              AI photo editing services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">2. Information We Collect</h2>
            <p>We collect the following types of information:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                <strong>Account information:</strong> email address, authentication details
                when you sign up or log in.
              </li>
              <li>
                <strong>Photos and prompts:</strong> images you upload and text prompts you
                submit for AI processing.
              </li>
              <li>
                <strong>Usage data:</strong> device information, browser type, and how you
                interact with our app.
              </li>
              <li>
                <strong>Payment data:</strong> processed securely through our payment
                provider; we do not store full card details.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide and improve our AI photo editing services.</li>
              <li>To process your transactions and manage your credits.</li>
              <li>To authenticate users and secure accounts.</li>
              <li>To communicate updates, security alerts, and support messages.</li>
              <li>To comply with legal obligations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">4. Your Photos</h2>
            <p>
              Photos you upload are processed by AI models to generate edited results. We
              do not sell your photos or use them to train third-party models without your
              consent. You can delete your edit history at any time from the app.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">5. Data Sharing</h2>
            <p>
              We do not sell your personal information. We share data only with:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>AI model providers strictly to process your edit requests.</li>
              <li>Payment processors to complete transactions.</li>
              <li>Authorities when required by law.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">6. Data Security</h2>
            <p>
              We use industry-standard encryption, secure authentication, and row-level
              security on our database to protect your data. However, no system is 100%
              secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">7. Your Rights</h2>
            <p>
              You have the right to access, correct, or delete your personal data, and to
              withdraw consent at any time. To exercise these rights, contact us at the
              email below.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">8. Children's Privacy</h2>
            <p>
              Renderme AI is not intended for users under the age of 13. We do not knowingly
              collect data from children.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this policy from time to time. Changes will be posted on this
              page with an updated date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">10. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, contact us at{" "}
              <a href="mailto:support@renderme.site" className="text-primary underline">
                support@renderme.site
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Renderme AI. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
