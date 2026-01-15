import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Azure Storage Cost Calculator',
  description: 'Calculate Azure storage costs for Data Lake Storage and Blob Storage',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}



