import { useEffect, useRef } from "react";
import { WebSocketKlineData } from "@/types";


const BINANCE_WEBSOCKET_URL = 'wss://stream.binance.com:9443/ws';
export const useBinanceWebSocket = (
  symbol: string,
  interval: string,
  onKlineData: (data: WebSocketKlineData['k']) => void
) => {
  const ws = useRef<WebSocket | null>(null); // Ref để lưu trữ đối tượng WebSocket

  useEffect(() => {
    // Xây dựng URL WebSocket dựa trên symbol và interval
    const url = `${BINANCE_WEBSOCKET_URL}/${symbol.toLowerCase()}@kline_${interval}`;
    ws.current = new WebSocket(url); // Khởi tạo kết nối WebSocket

    ws.current.onopen = () => {
      console.log('Kết nối WebSocket đã mở:', url);
    };

    ws.current.onmessage = (event) => {
      try {
        const data: WebSocketKlineData = JSON.parse(event.data);
        // Kiểm tra xem dữ liệu có phải là kline event không
        if (data.e === 'kline' && data.k) {
          onKlineData(data.k); // Gọi callback với dữ liệu kline
        }
      } catch (error) {
        console.error('Lỗi khi phân tích dữ liệu WebSocket:', error);
      }
    };

    ws.current.onclose = () => {
      console.log('Kết nối WebSocket đã đóng.');
    };

    ws.current.onerror = (error) => {
      console.error('Lỗi WebSocket:', error);
    };

    return () => {
      if (ws.current) {
        console.log('Đóng kết nối WebSocket.');
        ws.current.close();
      }
    };
     }, [symbol, interval, onKlineData]);
    };