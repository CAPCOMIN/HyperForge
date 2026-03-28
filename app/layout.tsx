import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { LocaleProvider } from "@/components/providers/locale-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "HyperForge",
  description: "Multi-agent orchestration workspace for collaborative task execution"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="bg-[#f4f7fb] text-ink antialiased">
        <LocaleProvider>
          <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(21,94,239,0.12),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(15,157,88,0.08),_transparent_24%)]">
            <AppHeader />
            <main className="mx-auto w-full max-w-[1560px] px-4 py-4 sm:px-6 sm:py-6">
              {children}
            </main>
          </div>
        </LocaleProvider>
      </body>
    </html>
  );
}
