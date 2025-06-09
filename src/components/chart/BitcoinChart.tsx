// src/components/chart/BitcoinChart.tsx
'use client'; // Đảm bảo component này là Client Component trong Next.js App Router

import React, { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickSeriesPartialOptions,
  HistogramSeriesPartialOptions,
  DeepPartial,
  Time,
} from 'lightweight-charts'; // Đảm bảo chỉ import các thành phần này

import { getHistoricalData, getCurrentPrice } from '@/services/binance';
import { ChartCandlestickData, ChartVolumeData, WebSocketKlineData, Interval } from '@/types';
import { useBinanceWebSocket } from '@/hooks/useBinanceWebSocket';
import { useTheme } from '@/contexts/ThemeContext';

interface BitcoinChartProps {
  symbol: string;
  interval: Interval;
}

const BitcoinChart: React.FC<BitcoinChartProps> = ({ symbol, interval }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const { theme } = useTheme();

  const [currentPrice, setCurrentPrice] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Cấu hình các tùy chọn cho biểu đồ dựa trên theme
  const chartOptions = {
    layout: {
      background: {
        type: ColorType.Solid,
        color: theme === 'dark' ? '#1a202c' : '#ffffff',
      },
      textColor: theme === 'dark' ? '#cbd5e0' : '#2d3748',
    },
    grid: {
      vertLines: {
        color: theme === 'dark' ? '#2d3748' : '#e2e8f0',
      },
      horzLines: {
        color: theme === 'dark' ? '#2d3748' : '#e2e8f0',
      },
    },
    priceScale: {
      borderColor: theme === 'dark' ? '#4a5568' : '#a0aec0',
    },
    timeScale: {
      borderColor: theme === 'dark' ? '#4a5568' : '#a0aec0',
      timeVisible: true,
      secondsVisible: false,
      visible: true, // Ensure time axis is visible
      tickMarkFormatter: (time: Time) => {
        // Format time on X-axis
        const date = new Date((time as number) * 1000); // lightweight-charts uses seconds, Date uses ms
        return date.toLocaleDateString('vi-VN'); // Format date according to Vietnamese standard
      },
    },
    crosshair: {
      vertLine: {
        color: theme === 'dark' ? '#718096' : '#4a5568',
      },
      horzLine: {
        color: theme === 'dark' ? '#718096' : '#4a5568',
      },
    },
    handleScroll: {
      vertTouchDrag: false, // Disable vertical touch drag
      horzTouchDrag: true, // Enable horizontal touch drag
    },
    handleScale: {
      axisDoubleClick: false, // Disable double-click zoom on axis
      pinchType: 2, // Enable pinch-zoom on both axes
      mouseWheel: true, // Enable mouse wheel zoom
    }
  };

  // Candlestick series configuration
  const candlestickSeriesOptions: DeepPartial<CandlestickSeriesPartialOptions> = {
    upColor: '#26a69a',
    downColor: '#ef5350',
    borderVisible: false,
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
  };

  // Volume series configuration
  const volumeSeriesOptions: DeepPartial<HistogramSeriesPartialOptions> = {
    color: '#38761d',
    priceScaleId: 'volume',
    overlay: true, // Overlay true means volume series is on the same pane as candlesticks.
    scaleMargins: {
      top: 0.7, // Occupy 30% of the bottom space of the pane (70% top space for candlesticks)
      bottom: 0,
    },
  };

  // Callback function to fetch historical data and update the chart
  // This is now called within useLayoutEffect after chart initialization
  const fetchAndSetHistoricalData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { chartData, volumeData } = await getHistoricalData(symbol, interval);
      if (candlestickSeriesRef.current && volumeSeriesRef.current) {
        candlestickSeriesRef.current.setData(chartData);
        volumeSeriesRef.current.setData(volumeData);
        console.log(`Đã tải ${chartData.length} nến lịch sử cho ${symbol}-${interval}`);
        setIsLoading(false); // Set loading to false after data is loaded
      } else {
        // This case should ideally not be hit if fetch is called after refs are ready
        console.error("Chart series refs are unexpectedly null after data fetch attempt.");
        setError("Lỗi nội bộ: Không thể cập nhật biểu đồ.");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu lịch sử:", err);
      setError("Không thể tải dữ liệu lịch sử. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.");
      setIsLoading(false); // Set loading to false on error
    }
  }, [symbol, interval]); // Dependencies: Re-run when symbol or interval changes

  // Callback function to handle new kline data from WebSocket
  const handleNewKlineData = useCallback((kline: WebSocketKlineData['k']) => {
    if (candlestickSeriesRef.current && volumeSeriesRef.current) {
      const newCandle: ChartCandlestickData = {
        time: kline.t / 1000,
        open: parseFloat(kline.o),
        high: parseFloat(kline.h),
        low: parseFloat(kline.l),
        close: parseFloat(kline.c),
      };

      const newVolume: ChartVolumeData = {
        time: kline.t / 1000,
        value: parseFloat(kline.v),
        color: parseFloat(kline.c) >= parseFloat(kline.o) ? 'rgba(0, 150, 136, 0.8)' : 'rgba(255, 82, 82, 0.8)',
      };

      candlestickSeriesRef.current.update(newCandle);
      volumeSeriesRef.current.update(newVolume);

      setCurrentPrice(parseFloat(kline.c).toFixed(2));
      setLastUpdated(new Date(kline.T).toLocaleTimeString('vi-VN'));
    }
  }, []);

  // Hook to use WebSocket
  useBinanceWebSocket(symbol, interval, handleNewKlineData);

  // useLayoutEffect to initialize and manage the chart lifecycle.
  // This ensures the chart is created and managed correctly in the DOM.
  useLayoutEffect(() => {
    if (!chartContainerRef.current) {
      console.warn("chartContainerRef.current is null. Skipping chart creation.");
      return;
    }

    // --- DEBUGGING LINE ---
    console.log("Type of createChart:", typeof createChart);
    if (typeof createChart !== 'function') {
        console.error("createChart is NOT a function! Lightweight-charts might not be loaded correctly.");
        setError("Lỗi khởi tạo biểu đồ: Thư viện Lightweight-charts không được tải đúng cách.");
        return;
    }
    // --- END DEBUGGING LINE ---

    // If chart already exists, remove it before creating a new one (e.g., on theme change)
    if (chartRef.current) {
      console.log("Removing existing chart before creating new one.");
      chartRef.current.remove();
      chartRef.current = null;
    }

    console.log("Creating new chart instance...");
    const chart = createChart(chartContainerRef.current, {
      ...chartOptions,
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
    });
    chartRef.current = chart;

    const newCandlestickSeries = chart.addCandlestickSeries(candlestickSeriesOptions);
    candlestickSeriesRef.current = newCandlestickSeries;

    const newVolumeSeries = chart.addHistogramSeries(volumeSeriesOptions);
    volumeSeriesRef.current = newVolumeSeries;

    chart.priceScale('volume').applyOptions({
      visible: false,
    });

    chart.priceScale('right').applyOptions({
      visible: true,
      borderColor: chartOptions.priceScale.borderColor,
    });
    
    // Fetch historical data immediately after chart and series are initialized
    fetchAndSetHistoricalData();

    // ResizeObserver to handle responsiveness
    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length === 0 || !entries[0].contentRect) return;
      const { width, height } = entries[0].contentRect;
      if (chartRef.current) { // Check chartRef.current again before resizing
        chartRef.current.resize(width, height);
      }
    });

    resizeObserver.observe(chartContainerRef.current);

    // Subscribe to visible logical range changes for loading more old data (future feature)
    chart.timeScale().subscribeVisibleLogicalRangeChange((newRange) => {
      // Logic for loading more old data will be developed here.
    });

    // Cleanup function: remove chart and disconnect observer when component unmounts
    return () => {
      console.log("Cleanup: Disconnecting resize observer and removing chart.");
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [theme, symbol, interval, fetchAndSetHistoricalData]); // Dependencies: Re-run when theme, symbol, interval change

  // useEffect to update current price every 1 minute (as a fallback/refresh mechanism)
  useEffect(() => {
    const priceInterval = setInterval(async () => {
      const price = await getCurrentPrice(symbol);
      if (price) {
        setCurrentPrice(parseFloat(price).toFixed(2));
        setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
      }
    }, 60000);

    return () => clearInterval(priceInterval);
  }, [symbol]); // Dependency: Re-run when symbol changes

  // Display error state
  if (error) {
    return (
      <div className="flex justify-center items-center h-full text-red-500 font-semibold">
        {error}
      </div>
    );
  }

  // Display loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full text-gray-500">
        Đang tải dữ liệu biểu đồ...
      </div>
    );
  }

  // Main chart container once data is loaded and no error
  return (
    <div className="relative w-full h-full flex flex-col rounded-lg shadow-xl overflow-hidden">
      <div className={`p-4 ${theme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'} border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center transition-colors duration-300`}>
        <div className="flex items-center space-x-2">
          <span className="font-bold text-xl">BTC/USDT</span>
          {currentPrice && (
            <span className="text-2xl font-extrabold text-green-500">
              ${currentPrice}
            </span>
          )}
        </div>
        {lastUpdated && (
          <span className="text-sm text-gray-500">Cập nhật: {lastUpdated}</span>
        )}
      </div>

      <div ref={chartContainerRef} className="flex-grow w-full h-full" />
    </div>
  );
};

export default BitcoinChart;
