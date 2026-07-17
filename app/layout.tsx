import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GoalConsensus — The World Cup Intelligence Terminal",
  description:
    "AI-powered intelligence for fans, developers and autonomous agents. Five specialist AI agents analyze every match in real-time.",
  keywords: [
    "football",
    "world cup",
    "AI intelligence",
    "prediction",
    "verification",
    "consensus",
    "MCP",
    "x402",
    "CCTP",
    "Injective",
    "agent skills",
    "blockchain",
  ],
  openGraph: {
    title: "GoalConsensus — The World Cup Intelligence Terminal",
    description:
      "AI-powered intelligence for fans, developers and autonomous agents. Five specialist AI agents analyze every match.",
    url: "https://goalconsensus.onrender.com",
    siteName: "GoalConsensus",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "GoalConsensus — World Cup Intelligence Terminal",
    description:
      "AI-powered football intelligence. Five specialist agents. Live debate. Premium reports. Built on Injective.",
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
