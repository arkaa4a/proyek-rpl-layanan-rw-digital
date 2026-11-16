import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "Sistem Layanan Digital RW",
  description: "Sistem informasi pelayanan administrasi digital RT/RW terpadu berbasis AI",
};

import AIAssistant from "@/components/AIAssistant";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>
        <Navbar />
        <main className="container" style={{ minHeight: 'calc(100vh - 4rem)', padding: '2rem 1.5rem' }}>
          {children}
        </main>
        <AIAssistant />
      </body>
    </html>
  );
}
