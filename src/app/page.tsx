// src/app/page.tsx
'use client';

import { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { Interval } from '@/types';

const intervals: Interval[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'];

// Tải động component BitcoinChart và VÔ HIỆU HÓA SSR (Server-Side Rendering) cho nó.
const BitcoinChart = dynamic(() => import('@/components/chart/BitcoinChart'), {
  ssr: false, // Rất quan trọng: chỉ render trên client
  loading: () => <div className="flex justify-center items-center h-[60vh] text-gray-500">Đang tải biểu đồ...</div>,
});

function HomeContent() {
  const [selectedInterval, setSelectedInterval] = useState<Interval>('1h');
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'} flex flex-col p-4 transition-colors duration-300`}>
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Biểu đồ giá Bitcoin</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-full ${theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'} transition-colors duration-200`}
            aria-label="Toggle dark/light theme"
          >
            {theme === 'dark' ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.364l-1.591 1.591M21 12h-2.25m-.364 6.364l-1.591-1.591M12 18.75V21m-6.364-.364l1.591-1.591M3 12H5.25m-.364-6.364l1.591 1.591M12 12.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0112 21.75c-3.626 0-6.95-1.843-8.816-4.998m15.356-2.672c.307-.63.53-1.333.66-2.084 0 1.5-1.29-2.72-2.87-2.72s-2.87 1.22-2.87 2.72a3.868 3.868 0 01.66 2.084m-4.524 0c-.307.63-.53-1.333-.66 2.084 0 1.5 1.29 2.72 2.87 2.72s2.87-1.22 2.87-2.72a3.868 3.868 0 01-.66-2.084m-12.793 0c-.307-.63-.53-1.333-.66-2.084 0-1.5 1.29-2.72 2.87-2.72s2.87 1.22 2.87 2.72a3.868 3.868 0 01-.66 2.084" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        {intervals.map((interval) => (
          <button
            key={interval}
            onClick={() => setSelectedInterval(interval)}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-all duration-200
              ${selectedInterval === interval
                ? 'bg-blue-600 text-white shadow-md'
                : `${theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} hover:scale-105`
              }`}
          >
            {interval.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="flex-grow w-full h-[60vh]">
        <Suspense fallback={<div className="flex justify-center items-center h-[60vh] text-gray-500">Đang tải biểu đồ...</div>}>
          <BitcoinChart symbol="BTCUSDT" interval={selectedInterval} />
        </Suspense>
      </div>

      <footer className="mt-8 text-center text-gray-500 text-sm">
        <p>Dữ liệu được cung cấp bởi Binance API và WebSocket.</p>
        <p>Được xây dựng với Next.js, TypeScript và Lightweight-Charts.</p>
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <ThemeProvider>
      <HomeContent />
    </ThemeProvider>
  );
}
