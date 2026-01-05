import '@/app/globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SARL HAPPY CAR STORE',
  description: 'Application de gestion automobile',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen text-gray-900">
        <div className="min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
