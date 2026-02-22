import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RTIF | Research Technology Innovation & Fulfillment",
  description:
    "Custom technology solutions, systems builds, and end-to-end order fulfillment. RTIF delivers innovation from concept to customer. Based in San Tan Valley, Arizona.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased text-gray-900 bg-white">{children}</body>
    </html>
  );
}
