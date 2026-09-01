import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Scanframe — Portrait Signal Generator',
  description:
    'Turn a single portrait into a monochrome animated scan loop with halftone detail and violet glitches.',
  openGraph: {
    title: 'Scanframe — Portrait Signal Generator',
    description:
      'Turn a single portrait into a monochrome animated scan loop with halftone detail and violet glitches.',
    images: [{ url: '/og.png', width: 1731, height: 909, alt: 'Scanframe portrait signal generator' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Scanframe — Portrait Signal Generator',
    description:
      'Turn a single portrait into a monochrome animated scan loop with halftone detail and violet glitches.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
