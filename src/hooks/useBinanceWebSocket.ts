import { useEffect, useRef } from "react";
import { WebSocketKlineData } from "@/types";

// URL cơ sở cho WebSocket của Binance
const BINANCE_WEBSOCKET_URL = 'wss://stream.binance.com:9443/ws';

export const useBinanceWebSocket = (
  symbol: string, // Mã cặp giao dịch, ví dụ: "BTCUSDT"
  interval: string, // Khung thời gian, ví dụ: "1m", "1h"
  onKlineData: (data: WebSocketKlineData['k']) => void // Callback khi có dữ liệu kline mới
) => {
  // useRef để lưu trữ đối tượng WebSocket, giúp nó tồn tại qua các lần re-render
  // và có thể được truy cập trong hàm cleanup.
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Đảm bảo symbol và interval đã được cung cấp trước khi cố gắng kết nối
    if (!symbol || !interval) {
      console.warn("Symbol or interval is missing, skipping WebSocket connection.");
      return;
    }

    // Xây dựng URL WebSocket chính xác.
    // Sử dụng cú pháp template literal của JavaScript `` để nội suy biến.
const wsUrl = `<span class="math-inline">\{BINANCE\_WEBSOCKET\_URL\}/</span>{symbol.toLowerCase()}@kline_${interval}`;

    console.log(`Attempting to connect WebSocket to: ${wsUrl}`);

    // Khởi tạo đối tượng WebSocket và gán vào ref.
    // Nếu đã có kết nối cũ, đóng nó trước.
    if (ws.current) {
      ws.current.close();
    }
    ws.current = new WebSocket(wsUrl);

    // Xử lý sự kiện khi kết nối WebSocket được mở
    ws.current.onopen = () => {
      console.log(`WebSocket opened for ${symbol}-${interval}`);
    };

    // Xử lý sự kiện khi nhận được tin nhắn từ WebSocket
    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Kiểm tra xem dữ liệu có phải là sự kiện kline và có chứa trường 'k' không
        if (data.e === 'kline' && data.k) {
          onKlineData(data.k); // Gọi hàm callback với dữ liệu kline đã được phân tích
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error, event.data);
      }
    };

    // Xử lý sự kiện khi có lỗi WebSocket
    ws.current.onerror = (event) => {
      console.error("WebSocket Error (useBinanceWebSocket):", event);
      // Kiểm tra kiểu của event để truy cập message nếu có
      if (event instanceof ErrorEvent) {
        console.error("Error message (from ErrorEvent):", event.message);
      }
    };

    // Xử lý sự kiện khi kết nối WebSocket bị đóng
    ws.current.onclose = (event) => {
      console.log(`WebSocket closed for ${symbol}-${interval}: Code ${event.code}, Reason: ${event.reason}`);
      // Các code phổ biến:
      // 1000: Normal Closure (Đóng bình thường)
      // 1001: Going Away (Trình duyệt đóng trang)
      // 1006: Abnormal Closure (Đóng bất thường, thường do lỗi mạng hoặc server không phản hồi)
      if (event.code === 1006) {
          console.warn("WebSocket closed due to abnormal closure (e.g., network issue or server unavailability).");
      }
    };

    // Hàm cleanup: Được gọi khi component unmount hoặc khi dependencies thay đổi
    return () => {
      // Đảm bảo WebSocket đang mở trước khi đóng nó
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close();
        console.log(`WebSocket closed on unmount/dependency change for ${symbol}-${interval}`);
      }
      ws.current = null; // Đặt ref về null để tránh rò rỉ bộ nhớ
    };
  }, [symbol, interval, onKlineData]); // Dependencies: Hook sẽ chạy lại khi symbol, interval hoặc onKlineData thay đổi
};