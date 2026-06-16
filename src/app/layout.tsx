import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { HemsProvider } from "@/context/HemsContext";
import { Toaster } from "sonner";
import { Footer } from "@/components/layout/Footer";

const font = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HEMS - HR Admin",
  description: "HR & Employee Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
        "min-h-screen bg-[#f8faf6] font-sans antialiased tracking-tight text-sm selection:bg-purple-100 selection:text-purple-900 flex flex-col",
        font.className
      )}>
        <HemsProvider>
          <Toaster richColors position="top-right" />
          <div className="flex-1">
            {children}
          </div>
          <Footer />
        </HemsProvider>
      </body>
    </html>
  );
}


