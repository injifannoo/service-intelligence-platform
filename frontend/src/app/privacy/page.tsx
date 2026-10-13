import type { Metadata } from "next";

import { LegalPage } from "@/components/homepage/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How ASIP collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="September 2026">
      <p>
        This policy explains what information ASIP collects when you use the
        platform and how that information is used. It is a plain-language summary
        and applies to the directory, review, comparison, and analytics features.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Information we collect</h2>
        <p>
          When you create an account we store the name, email address, and role you
          provide. When you register a business we store the business details you
          submit. Reviews, ratings, and reports you create are stored and shown to
          other users as part of the directory.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">How we use it</h2>
        <p>
          Account and business information is used to operate your account, verify
          providers, display listings, and generate the analytics and summaries
          shown in the product. We do not sell personal information.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Your choices</h2>
        <p>
          You can update your profile and your reviews at any time, and you can
          request that your account be removed. Content you post in reviews may
          remain visible to others as part of the platform&rsquo;s historical
          record.
        </p>
      </section>

      <p className="text-sm">
        Questions about this policy can be sent to the contact address listed in
        the site footer.
      </p>
    </LegalPage>
  );
}
