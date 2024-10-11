import { initLog, sendMessageToBackground } from "./utils";

initLog();

let startTime = Date.now();
let timer: any = null;

// 定期发送页面时长, 避免因为页面停留时间过长但不刷新
setInterval(() => {
  sendMessageToBackground('addPageDuration', { url: location.href, duration: 30000 });
}, 30000);

// 监听页面可见性变化
document.addEventListener('visibilitychange', () => {
  if(timer) {
    clearInterval(timer);
  }

  if (document.visibilityState === 'visible') {
    startTime = Date.now();

    sendMessageToBackground('tabVisible', { url: location.href });
    
    // 定期发送页面时长, 避免因为页面停留时间过长但不刷新
    timer = setInterval(() => {
      // TODO 需要是个事务 成功后 startTime 再变化
      sendMessageToBackground('addPageDuration', { url: location.href, duration: Date.now() - startTime });
      startTime = Date.now();
    }, 30000);
  }

  if (document.visibilityState === 'hidden') {
    sendMessageToBackground('addPageDuration', { url: location.href, duration: Date.now() - startTime });
  }
});