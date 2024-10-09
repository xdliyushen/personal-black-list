import { initLog, sendMessageToBackground } from "./utils";

initLog();

// 监听页面可见性变化
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    sendMessageToBackground('tabHidden', { url: location.href });
  }
});
