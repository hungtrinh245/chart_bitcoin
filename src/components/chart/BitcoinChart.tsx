// src/components/chart/BitcoinChart.tsx
"use client"; // Đảm bảo component này là Client Component trong Next.js App Router
// Các Client Components là các component có thể sử dụng các hook của React như useState, useEffect,
// và các sự kiện của trình duyệt như onClick, cũng như quản lý state.

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
} from "react";
import {
  createChart, // Hàm tạo biểu đồ chính
  ColorType, // Kiểu màu sắc
  IChartApi, // Interface của đối tượng biểu đồ
  ISeriesApi, // Interface của đối tượng series (nến, khối lượng)
  CandlestickSeriesPartialOptions, // Tùy chọn cho series nến
  HistogramSeriesPartialOptions, // Tùy chọn cho series khối lượng
  DeepPartial, // Helper type cho các tùy chọn sâu
  Time, // Kiểu dữ liệu thời gian
} from "lightweight-charts";
import { getHistoricalData, getCurrentPrice } from "@/services/binance"; // Import các hàm API
import {
  ChartCandlestickData,
  ChartVolumeData,
  WebSocketKlineData,
  Interval,
} from "@/types"; // Import các kiểu dữ liệu
import { useBinanceWebSocket } from "@/hooks/useBinanceWebSocket"; // Import custom hook WebSocket
import { useTheme } from "@/contexts/ThemeContext"; // Import hook theme để lấy theme hiện tại

// Props cho component BitcoinChart
interface BitcoinChartProps {
  symbol: string; // Mã cặp giao dịch (ví dụ: BTCUSDT)
  interval: Interval; // Khung thời gian (ví dụ: '1m', '1h', '1d')
}

const BitcoinChart: React.FC<BitcoinChartProps> = ({ symbol, interval }) => {
  // useRef để tham chiếu đến phần tử DOM (div) chứa biểu đồ.
  // chartContainerRef sẽ được gán vào thuộc tính ref của div đó.
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // useRef để lưu trữ đối tượng biểu đồ (IChartApi) từ lightweight-charts.
  // Điều này giúp chúng ta có thể truy cập đối tượng biểu đồ trong các lần render sau.
  const chartRef = useRef<IChartApi | null>(null);

  // useRef để lưu trữ đối tượng series nến (ISeriesApi<'Candlestick'>).
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  // useRef để lưu trữ đối tượng series khối lượng (ISeriesApi<'Histogram'>).
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  // Sử dụng hook useTheme để lấy theme hiện tại ('light' hoặc 'dark') và hàm toggleTheme.
  const { theme } = useTheme();

  // State để lưu trữ giá Bitcoin hiện tại (từ WebSocket)
  const [currentPrice, setCurrentPrice] = useState<string | null>(null);

  // State để lưu trữ thời gian cuối cùng giá được cập nhật
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // Cấu hình tổng thể của biểu đồ, thay đổi dựa trên theme sáng/tối
  const chartOptions = {
    layout: {
      // Màu nền của biểu đồ
      background: {
        type: ColorType.Solid,
        color: theme === "dark" ? "#1a202c" : "#ffffff", // Màu nền tối cho dark theme, trắng cho light theme
      },
      // Màu chữ trên biểu đồ
      textColor: theme === "dark" ? "#cbd5e0" : "#2d3748", // Màu chữ sáng cho dark theme, tối cho light theme
    },
    grid: {
      // Màu đường lưới dọc
      vertLines: {
        color: theme === "dark" ? "#2d3748" : "#e2e8f0",
      },
      // Màu đường lưới ngang
      horzLines: {
        color: theme === "dark" ? "#2d3748" : "#e2e8f0",
      },
    },
    priceScale: {
      // Màu đường viền của thang giá bên phải
      borderColor: theme === "dark" ? "#4a5568" : "#a0aec0",
    },
    timeScale: {
      // Màu đường viền của thang thời gian bên dưới
      borderColor: theme === "dark" ? "#4a5568" : "#a0aec0",
      timeVisible: true, // Hiển thị thời gian trên trục x
      secondsVisible: false, // Ẩn giây trên trục x (chỉ hiển thị phút, giờ, ngày)
    },
    crosshair: {
      // Màu đường crosshair (đường ngang và dọc khi di chuột)
      vertLine: {
        color: theme === "dark" ? "#718096" : "#4a5568",
      },
      horzLine: {
        color: theme === "dark" ? "#718096" : "#4a5568",
      },
    },
    // Vô hiệu hóa tính năng cuộn mặc định của trình duyệt để lightweight-charts xử lý cuộn biểu đồ
    handleScroll: {
      vertTouchDrag: false,
    },
    // Vô hiệu hóa tính năng zoom mặc định của trình duyệt
    handleScale: {
      axisDoubleClick: false,
    },
  };

  // Cấu hình riêng cho series nến
  const candlestickSeriesOptions: DeepPartial<CandlestickSeriesPartialOptions> =
    {
      upColor: "#26a69a", // Màu nến tăng (xanh lá)
      downColor: "#ef5350", // Màu nến giảm (đỏ)
      borderVisible: false, // Ẩn viền nến
      wickUpColor: "#26a69a", // Màu bấc nến tăng
      wickDownColor: "#ef5350", // Màu bấc nến giảm
    };

  // Cấu hình riêng cho series khối lượng
  const volumeSeriesOptions: DeepPartial<HistogramSeriesPartialOptions> = {
    color: "#38761d", // Màu mặc định (sẽ bị ghi đè bởi màu từ dữ liệu ChartVolumeData)
    priceScaleId: "volume", // Gán ID riêng cho thang giá của volume.
    // Điều này quan trọng để lightweight-charts biết đây là một series khác.
    overlay: true, // Đặt overlay là true để series khối lượng nằm trên cùng một pane với nến.
    // Sau đó chúng ta sẽ điều chỉnh tỷ lệ scaleMargins.
    scaleMargins: {
      top: 0.7, // Chiếm 30% không gian phía dưới của pane (70% không gian trên cùng cho nến)
      bottom: 0,
    },
  };

  // Hàm bất đồng bộ để fetch dữ liệu lịch sử từ Binance API
  // và cập nhật biểu đồ với dữ liệu đó.
  const fetchAndSetHistoricalData = useCallback(async () => {
    // Gọi hàm getHistoricalData từ service binance.ts
    const { chartData, volumeData } = await getHistoricalData(symbol, interval);

    if (
      chartRef.current &&
      candlestickSeriesRef.current &&
      volumeSeriesRef.current
    ) {
      // Đặt toàn bộ dữ liệu nến cho series nến
      candlestickSeriesRef.current.setData(chartData);
      // Đặt toàn bộ dữ liệu khối lượng cho series khối lượng
      volumeSeriesRef.current.setData(volumeData);
      console.log(
        `Đã tải ${chartData.length} nến lịch sử cho ${symbol}-${interval}`
      );
    }
  }, [symbol, interval]); 

  // Hàm callback xử lý dữ liệu kline real-time nhận được từ WebSocket.

  const handleNewKlineData = useCallback((kline: WebSocketKlineData["k"]) => {
    // Đảm bảo các series đã được khởi tạo
    if (candlestickSeriesRef.current && volumeSeriesRef.current) {
      // Chuyển đổi dữ liệu kline từ WebSocket sang định dạng ChartCandlestickData
      const newCandle: ChartCandlestickData = {
        time: kline.t / 1000, // Thời gian mở nến (giây)
        open: parseFloat(kline.o),
        high: parseFloat(kline.h),
        low: parseFloat(kline.l),
        close: parseFloat(kline.c),
      };

      // Chuyển đổi dữ liệu kline từ WebSocket sang định dạng ChartVolumeData
      const newVolume: ChartVolumeData = {
        time: kline.t / 1000, // Thời gian mở nến (giây)
        value: parseFloat(kline.v), // Khối lượng giao dịch
        // Xác định màu sắc của thanh khối lượng dựa trên giá đóng và giá mở
        color:
          parseFloat(kline.c) >= parseFloat(kline.o)
            ? "rgba(0, 150, 136, 0.8)"
            : "rgba(255, 82, 82, 0.8)",
      };

      // Cập nhật nến và khối lượng hiện tại trên biểu đồ.
      // Phương thức `update` sẽ tự động thêm nến mới hoặc cập nhật nến cuối cùng.
      candlestickSeriesRef.current.update(newCandle);
      volumeSeriesRef.current.update(newVolume);

      // Cập nhật giá hiện tại và thời gian cập nhật trên UI
      setCurrentPrice(parseFloat(kline.c).toFixed(2)); // Giá đóng cửa, làm tròn 2 chữ số thập phân
      setLastUpdated(new Date(kline.T).toLocaleTimeString()); // Thời gian đóng nến của kline
    }
  }, []); 

  // Sử dụng custom hook useBinanceWebSocket để kết nối WebSocket và nhận dữ liệu real-time.
  // Khi có dữ liệu mới, handleNewKlineData sẽ được gọi.
  useBinanceWebSocket(symbol, interval, handleNewKlineData);

  // useLayoutEffect được sử dụng để khởi tạo biểu đồ.
  // Nó chạy đồng bộ sau khi DOM được cập nhật, trước khi trình duyệt vẽ lại màn hình.
  // Điều này đảm bảo rằng biểu đồ được tạo ra trên một phần tử DOM đã sẵn sàng.
  useLayoutEffect(() => {
    // Đảm bảo ref của container biểu đồ đã được gán
    if (!chartContainerRef.current) return;

    // Khởi tạo biểu đồ chính với các tùy chọn đã định nghĩa
    const chart = createChart(chartContainerRef.current, {
      ...chartOptions, // Các tùy chọn layout, grid, timeScale, priceScale...
      width: chartContainerRef.current.clientWidth, // Chiều rộng của biểu đồ bằng chiều rộng của container
      height: chartContainerRef.current.clientHeight, // Chiều cao của biểu đồ bằng chiều cao của container
    });
    chartRef.current = chart; // Lưu đối tượng chart vào ref

    // Thêm series nến vào biểu đồ
    const newCandlestickSeries = chart.addCandlestickSeries(
      candlestickSeriesOptions
    );
    candlestickSeriesRef.current = newCandlestickSeries; // Lưu series nến vào ref

    // Thêm series khối lượng vào biểu đồ
    const newVolumeSeries = chart.addHistogramSeries(volumeSeriesOptions);
    volumeSeriesRef.current = newVolumeSeries; // Lưu series khối lượng vào ref

    // Cấu hình thang giá của series khối lượng để không hiển thị giá trị.
    // Điều này giúp volume chart chỉ hiển thị biểu đồ mà không có thang giá số bên cạnh.
    chart.priceScale("volume").applyOptions({
      visible: false, // Ẩn thang giá
    });

    // Cấu hình thang giá mặc định (cho nến) để hiển thị ở bên phải.
    chart.priceScale("right").applyOptions({
      visible: true,
      borderColor: chartOptions.priceScale.borderColor, // Sử dụng màu viền từ chartOptions
    });

    // Xử lý responsive: Sử dụng ResizeObserver để tự động thay đổi kích thước biểu đồ
    // khi kích thước của container thay đổi (ví dụ: khi người dùng thay đổi kích thước cửa sổ trình duyệt).
    const resizeObserver = new ResizeObserver((entries) => {
      // Đảm bảo có entries và contentRect hợp lệ
      if (entries.length === 0 || !entries[0].contentRect) return;
      const { width, height } = entries[0].contentRect;
      // Thay đổi kích thước biểu đồ để khớp với container
      chart.resize(width, height);
    });

    // Bắt đầu quan sát kích thước của chartContainerRef.current
    resizeObserver.observe(chartContainerRef.current);

    // Lắng nghe sự kiện khi phạm vi thời gian hiển thị của biểu đồ thay đổi.
    // Đây là nơi bạn sẽ thêm logic để tải thêm dữ liệu cũ khi người dùng kéo biểu đồ về bên trái.
    // (Lưu ý: Trong bài này, chúng ta chưa triển khai đầy đủ tính năng này).
    chart.timeScale().subscribeVisibleLogicalRangeChange((newRange) => {
      // console.log('Phạm vi hiển thị đã thay đổi:', newRange);
      // Logic tải thêm dữ liệu cũ sẽ cần được phát triển ở đây.
      // Ví dụ: Kiểm tra nếu `newRange.from` tiến gần đến điểm dữ liệu đầu tiên,
      // sau đó gọi API với `endTime` cũ hơn và thêm dữ liệu mới vào biểu đồ.
    });

    // Hàm cleanup: Được gọi khi component unmount.
    // Đảm bảo giải phóng tài nguyên để tránh memory leaks.
    return () => {
      resizeObserver.disconnect(); // Ngừng quan sát kích thước
      if (chartRef.current) {
        chartRef.current.remove(); // Xóa biểu đồ khỏi DOM và giải phóng bộ nhớ
        chartRef.current = null;
      }
    };
  }, [chartOptions, candlestickSeriesOptions, volumeSeriesOptions]); // Dependencies: Chạy lại khi các tùy chọn biểu đồ thay đổi (do theme)

  // useEffect để fetch dữ liệu lịch sử khi component mount hoặc khi symbol/interval thay đổi.
  useEffect(() => {
    fetchAndSetHistoricalData();

    // Triển khai "Nút Lấy Giá Hiện Tại" dưới dạng tự động cập nhật mỗi 1 phút.
    // Điều này cũng như một cơ chế dự phòng để lấy giá nếu WebSocket có vấn đề.
    const priceInterval = setInterval(async () => {
      const price = await getCurrentPrice(symbol); // Lấy giá hiện tại từ API
      if (price) {
        setCurrentPrice(parseFloat(price).toFixed(2)); // Cập nhật giá
        setLastUpdated(new Date().toLocaleTimeString()); // Cập nhật thời gian
      }
    }, 60000); // Cập nhật mỗi 60 giây (1 phút)

    // Hàm cleanup: Xóa interval khi component unmount
    return () => clearInterval(priceInterval);
  }, [symbol, interval, fetchAndSetHistoricalData]); // Dependencies: Chạy lại khi symbol, interval thay đổi

  return (
    <div className="relative w-full h-full flex flex-col rounded-lg shadow-xl overflow-hidden">
      {/* Thanh thông tin giá hiện tại */}
      <div
        className={`p-4 ${
          theme === "dark"
            ? "bg-gray-800 text-gray-200"
            : "bg-white text-gray-800"
        } border-b ${
          theme === "dark" ? "border-gray-700" : "border-gray-200"
        } flex justify-between items-center transition-colors duration-300`}
      >
        <div className="flex items-center space-x-2">
          {/* Tên cặp giao dịch */}
          <span className="font-bold text-xl">BTC/USDT</span>
          {/* Hiển thị giá hiện tại nếu có */}
          {currentPrice && (
            <span className="text-2xl font-extrabold text-green-500">
              ${currentPrice}
            </span>
          )}
        </div>
        {/* Hiển thị thời gian cập nhật cuối cùng */}
        {lastUpdated && (
          <span className="text-sm text-gray-500">Cập nhật: {lastUpdated}</span>
        )}
      </div>

      {/* Container chính cho biểu đồ. height-full và flex-grow để nó chiếm hết không gian còn lại */}
      <div ref={chartContainerRef} className="flex-grow w-full h-full" />
    </div>
  );
};

export default BitcoinChart;
