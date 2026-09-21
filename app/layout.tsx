import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

// Social cards truncate around 155-160 characters, so the shared description
// stays lean; the fuller stat list lives on the page itself.
const description =
  "Walk up, look, verified in under 5 seconds. Five anti-spoofing layers reject photos and replay attacks. 99.98% uptime across 618 days in production.";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${BRAND.siteUrl}/#organization`,
      name: BRAND.name,
      url: BRAND.siteUrl,
      email: BRAND.email,
    },
    {
      "@type": "WebSite",
      "@id": `${BRAND.siteUrl}/#website`,
      url: `${BRAND.siteUrl}/`,
      name: BRAND.name,
      alternateName: BRAND.tagline,
      inLanguage: "en",
      publisher: { "@id": `${BRAND.siteUrl}/#organization` },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${BRAND.siteUrl}/#app`,
      name: BRAND.name,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Windows 10+",
      url: `${BRAND.siteUrl}/`,
      description,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      keywords:
        "facial recognition, attendance, biometric, liveness detection, anti-spoofing",
      featureList: [
        "Real-time face recognition attendance",
        "5-layer anti-spoofing / liveness detection",
        "Cloud admin dashboard with offline-safe sync",
        "Self-healing camera pipeline",
      ],
      publisher: { "@id": `${BRAND.siteUrl}/#organization` },
    },
  ],
};

export const metadata: Metadata = {
  // BRAND.siteUrl is a bare origin (no sub-path), so metadataBase can be it
  // directly. (Do not put a sub-path in metadataBase: Next 16.3.5 then
  // doubles the basePath on metadata-file URLs like og:image.)
  metadataBase: new URL(BRAND.siteUrl),
  title: `${BRAND.name} | ${BRAND.tagline}`,
  description,
  alternates: { canonical: "/" },
  keywords: [
    "facial recognition",
    "attendance",
    "biometric",
    "liveness detection",
    "anti-spoofing",
  ],
  openGraph: {
    // og:site_name carries the brand, so the card title stays just the promise.
    title: BRAND.tagline.replace(/\.$/, ""),
    description,
    url: "/",
    type: "website",
    siteName: BRAND.name,
    locale: "en_US",
  },
  // X/Twitter falls back to the Open Graph title, description and image when
  // twitter:* twins are absent, so only the card type needs to be explicit.
  twitter: { card: "summary_large_image" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#05070d",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {/* Hide scroll-reveal targets until GSAP takes over, so hydrated content
            never flashes visible → hidden → animated. Only runs when full motion
            is allowed; a CSS failsafe re-reveals everything if JS never does.
            ?motion=full also adds .motion-full so the reduced-motion CSS kill
            switch stands down - the QA override shows the real experience.
            Must mirror prefersReducedMotion() in lib/device.ts. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var f=new URLSearchParams(location.search).get("motion")==="full";if(f)document.documentElement.classList.add("motion-full");if(!f&&!matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.classList.add("motion-pending")}catch(e){}',
          }}
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {children}
      </body>
    </html>
  );
}
