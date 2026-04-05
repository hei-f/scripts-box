import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";
import { initErrorCapture } from "./services/errorLogger";
import { cleanupOldErrorLogs } from "./services/tauri";

// 初始化全局错误捕获
initErrorCapture();

// 清理过期的错误日志（保留 7 天）
cleanupOldErrorLogs(7).match(
  () => {},
  (err) => console.error('清理过期日志失败:', err)
);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
