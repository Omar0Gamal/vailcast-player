import type { Metadata } from 'next';
import 'vailcast-player/styles.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vailcast Next.js Example',
  description: 'Local integration test for vailcast-player/react',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
