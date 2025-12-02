import type { Metadata, Viewport } from 'next';
import { Bebas_Neue, Montserrat } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

// V4 Company Brand Typography - Montserrat (Primary)
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-montserrat',
  display: 'swap',
});

// V4 Company Brand Typography - Bebas Neue (Display/Headings)
const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-bebas',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'V4 Connect CRM',
  description: 'CRM conversacional para WhatsApp, Instagram e Messenger',
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#E30613',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${montserrat.variable} ${bebasNeue.variable} font-montserrat antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
