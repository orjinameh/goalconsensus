import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GoalConsensus — Football Settlement Verification",
  description:
    "Football-only multi-agent settlement verification with Byzantine-inspired consensus, Injective x402 micropayments, and MCP Server",
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
