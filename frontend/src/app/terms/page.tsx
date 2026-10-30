import type { Metadata } from "next";

import { LegalPage } from "@/components/homepage/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of the ASIP platform.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="September 2026">
      <p>
        These terms govern your use of the ASIP platform. By creating an account
        or using the directory you agree to them.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Accounts</h2>
        <p>
          You are responsible for the accuracy of the information you provide and
          for keeping your sign-in details safe. One verified business listing is
          allowed per legal business.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Reviews and content</h2>
        <p>
          Reviews must reflect your own genuine experience. Content that is
          fraudulent, defamatory, or unlawful may be removed, and repeated misuse
          can lead to account suspension.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Verification</h2>
        <p>
          Verification status reflects checks performed by the platform at the
          time of review. It is not a guarantee about a business and can change.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Service availability</h2>
        <p>
          The platform is provided as-is. We may change, suspend, or withdraw
          features, and we do not warrant uninterrupted availability.
        </p>
      </section>
    </LegalPage>
  );
}