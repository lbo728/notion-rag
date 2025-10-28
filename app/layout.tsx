import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Notion RAG Chatbot",
  description:
    "Personal knowledge archive chat interface with Notion integration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
