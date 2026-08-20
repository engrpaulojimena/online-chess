import './globals.css';

export const metadata = {
  title: 'Online Chess',
  description: 'Two-player realtime chess built with Next.js and Supabase.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
