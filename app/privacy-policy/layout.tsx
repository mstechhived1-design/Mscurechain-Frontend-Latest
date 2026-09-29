import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | MS CureChain",
  description: "Official Privacy Policy for MS CureChain Patient App. We disclose our data collection practices and app permissions including Camera, Location, and Storage usage.",
  keywords: ["Privacy Policy", "MS CureChain", "Data Protection", "Camera Permission", "Location Permission"],
};

export default function PrivacyPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
