import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orca Security Chatbot",
  description: "AI chatbot to fetch and analyze Orca Security reports",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
