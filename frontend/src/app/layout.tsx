import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gita Spiritual Guidance | Ancient Indian Wisdom Meet Modern AI',
  description: 'Navigate life\'s problems by combining practical counseling guidance with the timeless wisdom of the Bhagavad Gita.',
  keywords: 'Bhagavad Gita, AI Spiritual Counselor, Mental Peace, RAG AI, Gita Verses, Stress Relief, Wisdom',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Simple client theme initializer to prevent flashing of light mode */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const token = localStorage.getItem('gita_token');
                let isDark = true;
                // Default theme setup
                if (localStorage.theme === 'light') {
                  document.documentElement.classList.remove('dark');
                } else {
                  document.documentElement.classList.add('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="bg-sandstone-100 text-sandstone-900 dark:bg-temple-bg dark:text-gray-100 min-h-screen relative overflow-x-hidden selection:bg-saffron-500/30 selection:text-saffron-600 dark:selection:text-saffron-300">
        {/* Ambient background glow orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full gold-glow-orb pointer-events-none animate-pulse-glow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full saffron-glow-orb pointer-events-none animate-pulse-glow" style={{ animationDelay: '-4s' }} />
        
        {children}
      </body>
    </html>
  );
}
