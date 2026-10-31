import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Principle AI — Find jobs when they're posted",
  description:
    "Discover hiring-manager-posted jobs early, see how well you match, and find legitimate referral opportunities.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background">{children}</body>
    </html>
  );
}
