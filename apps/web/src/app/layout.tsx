import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { TopNav } from '@/components/layout/TopNav';
import { Providers } from './providers';
import Script from 'next/script'; 

const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'TimeFlow ERP',
  description: 'Enterprise Project Management & Time Tracking',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-2Y4S0DEVL0';

  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      {/* 🟢 THE FIX: Container should not hide overflow globally, allow content scroll under fixed nav */}
      <body className="min-h-screen w-full bg-background text-foreground font-sans antialiased flex flex-col relative pt-[64px]">
        <Providers>
          <TopNav />
          
          <main className="w-full h-full pb-10">
            {children}
          </main>
        </Providers>

        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}', {
                page_path: window.location.pathname,
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
