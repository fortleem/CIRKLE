import type { Metadata, Viewport } from "next";
import { Inter, Fraunces, Tajawal } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryProvider } from "@/components/providers/query-provider";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], display: "swap", weight: ["300", "400", "500", "600", "700"] });
const tajawal = Tajawal({ variable: "--font-tajawal", subsets: ["arabic", "latin"], display: "swap", weight: ["300", "400", "500", "700"] });

export const metadata: Metadata = {
  title: "Cirkle — A New Social Operating System",
  description: "Cirkle (دواير) — a luxurious AI-native super app for chat, video, photos, social, travel, and payments. Free forever. Privacy-first.",
  keywords: ["Cirkle", "دواير", "social app", "AI super app", "chat", "video", "photos", "travel", "payments"],
  openGraph: {
    title: "Cirkle — A New Social Operating System",
    description: "Free forever. Privacy-first. AI-native super app replacing 10+ apps.",
    type: "website",
    locale: "en_US",
    siteName: "Cirkle",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cirkle — A New Social Operating System",
    description: "Free forever. Privacy-first. AI-native super app replacing 10+ apps.",
  },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", maximumScale: 5, themeColor: [{ media: "(prefers-color-scheme: light)", color: "#FDFCF9" }, { media: "(prefers-color-scheme: dark)", color: "#1A4A5A" }] };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${fraunces.variable} ${tajawal.variable} antialiased bg-background text-foreground`}>
        {/* Prevent FOUC: apply saved theme before hydration.
            Respects prefers-color-scheme for first-time visitors. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("circle-theme");if(t===null){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}if(t==="dark"){document.documentElement.classList.add("dark");}}catch(e){document.documentElement.classList.add("dark");}})();`,
          }}
        />
        <QueryProvider>
          <TooltipProvider>
            {children}
            <Toaster />
            <SonnerToaster position="bottom-right" richColors closeButton />
          </TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
