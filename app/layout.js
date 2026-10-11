import './globals.css';
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from 'next/font/google';

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const body = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata = {
  title: 'Rapi Materi — materi kuliah tersusun otomatis di Google Drive',
  description: 'Unggah materi dari WhatsApp, pilih semester, mata kuliah, dan bab. Foldernya dibuat otomatis di Google Drive.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
