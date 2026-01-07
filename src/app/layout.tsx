import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { HemsProvider } from "@/context/HemsContext";

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
        "min-h-screen bg-background font-sans antialiased text-sm selection:bg-purple-100 selection:text-purple-900",
        font.className
      )}>
        <HemsProvider>
          {children}
        </HemsProvider>
      </body>
    </html>
  );
}


