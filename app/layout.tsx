import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GoalConsensus — Multi-Agent Settlement Verification",
  description:
    "Verify football match results using independent verification agents before prediction market settlement. Byzantine-inspired consensus across statistical, AI, and rule-based agents.",
  keywords: [
    "football",
    "settlement verification",
    "prediction markets",
    "consensus",
    "AI verification",
    "Injective",
    "x402",
  ],
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
