import React, { useEffect } from 'react';
import { ConfigProvider, App as AntdApp } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCurrentUser } from './store/authSlice.js';
import { getAntdTheme } from './theme/themeConfig.js';
import { AppRoutes } from './routes/index.jsx';
import './styles/moduleDesign.css';

export function App() {
  const dispatch = useDispatch();
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);

  // Authenticated session restoration on app startup
  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  const currentTheme = getAntdTheme(isDarkMode);

  return (
    <ConfigProvider theme={currentTheme}>
      <AntdApp>
        <AppRoutes />
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
