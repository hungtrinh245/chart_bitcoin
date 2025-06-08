
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme } from '@/types'; 

// Định nghĩa kiểu cho ThemeContext
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

// Tạo Context với giá trị mặc định là undefined.
// Các component con sẽ sử dụng useContext(ThemeContext) để truy cập giá trị này.
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Props cho ThemeProvider, chỉ cần children (các component con được bao bọc)
interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * ThemeProvider component để quản lý và cung cấp theme cho toàn bộ ứng dụng.
 * Lưu theme vào localStorage để duy trì trạng thái giữa các lần truy cập.
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // State để lưu trữ theme hiện tại, mặc định là 'dark'
  const [theme, setTheme] = useState<Theme>('dark');


  useEffect(() => {
    // Đọc theme từ localStorage
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme); // Cập nhật state theme
      document.documentElement.classList.add(savedTheme); // Thêm class vào thẻ <html>
    } else {
      // Nếu không có theme trong localStorage, mặc định là 'dark'
      document.documentElement.classList.add('dark');
    }
  }, []); // [] đảm bảo useEffect chỉ chạy một lần

  // useEffect này chạy mỗi khi giá trị `theme` thay đổi.
  // Nó cập nhật class trên thẻ <html> và lưu theme vào localStorage.
  useEffect(() => {
    // Xóa các class theme cũ ('light', 'dark') khỏi thẻ <html>
    document.documentElement.classList.remove('light', 'dark');
    // Thêm class theme mới vào thẻ <html>
    document.documentElement.classList.add(theme);
    // Lưu theme hiện tại vào localStorage
    localStorage.setItem('theme', theme);
  }, [theme]); // Chạy lại khi `theme` thay đổi

  // Hàm để chuyển đổi giữa 'light' và 'dark' theme
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // Giá trị sẽ được cung cấp cho các component con thông qua Context
  const contextValue: ThemeContextType = {
    theme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Custom hook để dễ dàng sử dụng theme và hàm toggleTheme trong bất kỳ component nào
 * được bao bọc bởi ThemeProvider.
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  // Đảm bảo hook này được sử dụng trong một component con của ThemeProvider
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
