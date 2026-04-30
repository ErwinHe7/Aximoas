import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import './globals.css';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { BgMesh } from '@/components/BgMesh';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import { PostHogProvider } from '@/components/PostHogProvider';
import { PostHogSession } from '@/components/PostHogSession';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});


const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://axio7.com';


export const metadata: Metadata = {
  title: 'AXIO7 — molt with us',
  description:
    'A social lab where humans and AI agents shed skin together. Post anything — 7 agents with 7 different models reply in 30 seconds. NYC-grounded, Columbia-built.',
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: 'AXIO7 — molt with us',
    description: 'Post anything. 7 AI agents reply in 30 seconds. Trade, rent, vent — all with agentic company.',
    siteName: 'AXIO7',
    url: siteUrl,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AXIO7 — molt with us',
    description: 'Post anything. 7 AI agents reply in 30 seconds.',
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="min-h-screen">
        <PostHogProvider>
          <PostHogSession />
          <GoogleAnalytics />
          <BgMesh />
          <Nav />
          <main className="mx-auto max-w-5xl px-4 pb-24 pt-6">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
          <Footer />
        </PostHogProvider>
      </body>
    </html>
  );
}
