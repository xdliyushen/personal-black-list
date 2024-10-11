import { log } from "./utils";

// 域名黑名单
chrome.webNavigation.onCompleted.addListener((details) => {
  log('onCompleted details', details);

  // frameId 为 0 表示 main frame, 即主窗口
  if(details?.frameId !== 0) {
    return;
  }

  chrome.storage.sync.get(['blacklist', 'fallbackUrl'], ({ blacklist, fallbackUrl }) => {
    log('blacklist', blacklist);
    log('fallbackUrl', fallbackUrl);

    if (blacklist && blacklist.some((pattern: string) => new RegExp(pattern).test(details.url))) {
      chrome.tabs.update(details.tabId, { url: fallbackUrl || chrome.runtime.getURL('fallback.html') });
    }
  });
});

// 页面使用时间
// duration - 单位 ms
const tabTimes: Record<string, { closed: boolean, duration: number; lastVisibleTime?: number; }> = {};

const updateTabTimesStorage = (tabId: number) => {
  // 获取页面 url
  chrome.tabs.get(tabId, tab => {    
    const duration = tabTimes[tabId].duration;
    const url = tab.url;

    // TODO 写入 indexDB
    // TODO 事务
  });
};

// 页面激活 -> 页面不展示也会触发
chrome.tabs.onActivated.addListener(activeInfo => {
  const tabId = activeInfo.tabId;

  log('onActivated activeInfo', activeInfo);

  tabTimes[tabId] = {
    closed: false,
    duration: 0,
    ...(tabTimes[tabId] || {}),
  };
});

// 页面关闭
chrome.tabs.onRemoved.addListener(tabId => {
  log('onRemoved tabId', tabId);

  tabTimes[tabId].closed = true;
  // 之所以这里要判断 lastVisibleTime, 是为了避免页面只打开但一直隐藏的情况下, duration 为 0
  tabTimes[tabId].duration += tabTimes[tabId].lastVisibleTime ? Date.now() - tabTimes[tabId].lastVisibleTime : 0;

  updateTabTimesStorage(tabId);
});

// 监听 message
chrome.runtime.onMessage.addListener((request, sender) => {
  log('onMessage request', request);
  log('onMessage sender', sender);

  const tabId = sender.tab.id;

  // 避免收到的 message 在 tab 被关闭后才被处理
  if (request.action === 'addPageDuration' && !tabTimes[tabId].closed) {
    tabTimes[tabId].duration += (request.duration || 0);
    updateTabTimesStorage(tabId);
  }

  if (request.action === 'tabVisible') {
    tabTimes[tabId].lastVisibleTime = Date.now();
  }
});