import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GoalConsensus — Multi-Agent Football Intelligence Platform",
  description:
    "Predict and verify football match results across every competition using AI ensemble voting and BFT provider verification. Trustless, multi-agent intelligence. MCP integration.",
  keywords: [
    "football",
    "prediction",
    "verification",
    "consensus",
    "AI",
    "prediction markets",
    "Injective",
    "x402",
    "MCP",
    "settlement",
  ],
  openGraph: {
    title: "GoalConsensus — Multi-Agent Football Intelligence Platform",
    description:
      "Predict and verify football match results using AI ensemble voting and BFT provider verification across all competitions.",
    url: "https://goalconsensus.onrender.com",
    siteName: "GoalConsensus",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "GoalConsensus — Football Intelligence Platform",
    description:
      "Predict and verify football match results using AI ensemble voting and BFT verification. MCP integration.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-surface-1 text-text-primary font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
