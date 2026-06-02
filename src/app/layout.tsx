import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fuel Management Dashboard",
  description: "Enterprise-grade Fuel Management & Site Consumption Dashboard",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#F3F4F6] text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
