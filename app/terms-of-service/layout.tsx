import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | MS CureChain",
  description: "Official Terms & Conditions for MS CureChain. Learn about our service agreement, eligibility, appointment booking policies, and legal authority.",
  keywords: ["Terms of Service", "T&C", "MS CureChain", "Service Agreement", "Refund Policy"],
};

export default function TermsOfServiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
