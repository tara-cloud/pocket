import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = { title: 'Pocket', description: 'Tara artifact registry' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <div className="nav-inner">
            <Link href="/" className="nav-brand">📦 Pocket</Link>
            <div className="nav-links">
              <Link href="/">Repositories</Link>
              <Link href="/ota">OTA Releases</Link>
              <Link href="/keys">API Keys</Link>
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
