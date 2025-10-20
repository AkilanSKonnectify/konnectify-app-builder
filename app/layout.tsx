import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'VS Code Interface',
  description: 'A simplified VS Code-like editor interface',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, overflow: 'hidden' }}>{children}</body>
    </html>
  );
}
