import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from './app-providers'; // Import the new client component

// This metadata export is now valid because this is a Server Component.
export const metadata: Metadata = {
  title: 'Broos 2.0',
  description: 'Jouw partner in mentaal welzijn.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Broos 2.0',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icons/icon-192x192.png?v=2" type="image/png" sizes="192x192" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#0B203A" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png?v=2" />
      </head>
      <body className="h-full font-body antialiased">
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
