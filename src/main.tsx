import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import { XProvider } from '@ant-design/x';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import { initializeUniAppBridge } from './services/uniAppBridge';
import './styles.css';

void initializeUniAppBridge().catch((error) => {
  console.warn('[UniAppBridge] SDK 初始化失败：', error);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          colorInfo: '#18a058',
          borderRadius: 18,
          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
        },
      }}
    >
      <XProvider>
        <App />
      </XProvider>
    </ConfigProvider>
  </React.StrictMode>,
);
