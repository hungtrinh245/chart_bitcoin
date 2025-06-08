import axios from "axios";
import { ChartCandlestickData, ChartVolumeData, Interval, KlineData,  } from "@/types";



const API_URL = 'https://api.binance.com/api/v3'


    export const getHistoricalData = async (
  symbol: string,
  interval: Interval,
  limit: number = 500
): Promise<{ chartData: ChartCandlestickData[]; volumeData: ChartVolumeData[] }> => {
  try {
    // Gọi API klines của Binance
    const response = await axios.get<KlineData[]>(`${API_URL}/klines`, {
      params: { symbol, interval, limit },
    });


    //xử lý dữ liệu trả về từ API
 const chartData = response.data.map((item) => ({
      time: item[0], // Timestamp
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
    }));


    const volumeData = response.data.map((item) => ({
      time: item[0], // Timestamp
      volume: parseFloat(item[5]),
    }));

    
       return { chartData, volumeData };
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu lịch sử:", error);
    return { chartData: [], volumeData: [] };
  }
};

export const getCurrentPrice = async (symbol: string): Promise<string | null> => {
  try {
    // Gọi API ticker/price của Binance để lấy giá hiện tại
    const response = await axios.get<{ price: string }>(`${API_URL}/ticker/price`, {
      params: { symbol },
    });
    return response.data.price;
  } catch (error) {
    console.error("Lỗi khi lấy giá hiện tại:", error);
    return null;
  }
};