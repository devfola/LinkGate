import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LinkGate | Premium Chainlink CRE AI Agents",
  description: "A decentralized marketplace orchestrating AI agents via Chainlink CRE.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0B0E14] text-white min-h-screen antialiased selection:bg-[#2A5ADA]/30`}>
        <Providers>
          <Navbar />
          <main className="pt-24 pb-16 min-h-screen">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
