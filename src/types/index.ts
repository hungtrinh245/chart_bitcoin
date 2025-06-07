export type KlineData = [
     number, // 0: Open time (ms)
  string, // 1: Open price
  string, // 2: High price
  string, // 3: Low price
  string, // 4: Close price
  string, // 5: Volume
  number, // 6: Close time (ms)
  string, // 7: Quote asset volume
  number, // 8: Number of trades
  string, // 9: Taker buy base asset volume
  string, // 10: Taker buy quote asset volume
  string  // 11: Ignore
];

//định nghĩa kiẻu dữ liệu cho biểu đồ nến 

export interface ChartCandlestickData {
    time: number, //thời gian
    open: number, //giá mở
    high: number, //giá cao nhất
    low: number, //giá thấp nhất
    close: number, //giá đóng
}

//định nghĩa kiểu dữ liệu cho biểu đồ khối lượng 

export interface ChartVolumeData {
    time: number, //thời gian
    value: number, //giá trị khối lương
    color:string //màu của thanh( xanh nếu tăng, đỏ nếu nến giảmgiảm)
}


// Định nghĩa kiểu dữ liệu cho dữ liệu Kline từ WebSocket


export interface WebSocketKlineData {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  k: {
    t: number;    // Kline start time
    T: number;    // Kline close time
    s: string;    // Symbol
    i: string;    // Interval
    f: number;    // First trade ID
    L: number;    // Last trade ID
    o: string;    // Open price
    c: string;    // Close price
    h: string;    // High price
    l: string;    // Low price
    v: string;    // Base asset volume
    n: number;    // Number of trades
    x: boolean;   // Is this kline closed?
    q: string;    // Quote asset volume
    V: string;    // Taker buy base asset volume
    Q: string;    // Taker buy quote asset volume
    B: string;    // Ignore
  };
}

// Định nghĩa kiểu dữ liệu cho context theme (sáng hoặc tối)
export type Theme = 'light' | 'dark';

// Các khung thời gian hỗ trợ cho biểu đồ
export type Interval = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1M'