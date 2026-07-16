import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GoalConsensus — BFT World Cup Oracle",
  description:
    "Byzantine Fault Tolerant World Cup 2026 match oracle with Injective x402 micropayments and MCP Server",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0a] text-white font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
