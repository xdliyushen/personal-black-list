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
const tabTimes: Record<string, { lastActiveTime: number, closed: boolean, duration: number }> = {};

const updateTabTimesStorage = (tabId: number, url: string) => {
  const duration = tabTimes[tabId].duration;

  chrome.storage.sync.get('tabTimes', ({ tabTimes: tabTimesStorage }) => {
    log('tabTimesStorage', tabTimesStorage);

    const currentDate = new Date();
    const currentDay = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`;

    const newTabTimesStorage = {
      ...tabTimesStorage,
      [currentDay]: {
        ...(tabTimesStorage?.[currentDay] || {}),
        [url]: (tabTimesStorage?.[currentDay]?.[url] || 0) + duration,
      },
    };

    log('newTabTimesStorage', newTabTimesStorage);

    chrome.storage.sync.set({ tabTimes: newTabTimesStorage });
  });
};

chrome.tabs.onActivated.addListener(activeInfo => {
  const tabId = activeInfo.tabId;

  log('onActivated activeInfo', activeInfo);

  tabTimes[tabId] = {
    ...(tabTimes[tabId] || {
      closed: false,
      duration: 0,
    }),
    lastActiveTime: Date.now(),
  };
});

// 页面关闭
chrome.tabs.onRemoved.addListener(tabId => {
  log('onRemoved tabId', tabId);

  tabTimes[tabId].closed = true;
  tabTimes[tabId].duration = Date.now() - tabTimes[tabId].lastActiveTime;

  // 获取页面 url
  chrome.tabs.get(tabId, tab => {
    log('onRemoved tab', tab);

    updateTabTimesStorage(tabId, tab.url);
  });
});

// 监听 message
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  log('onMessage request', request);
  log('onMessage sender', sender);

  const tabId = sender.tab.id;

  // 避免收到的 message 在 tab 被关闭后才被处理
  if (request.action === 'tabHidden' && !tabTimes[tabId].closed) {
    tabTimes[tabId].duration = Date.now() - tabTimes[tabId].lastActiveTime;
  }

  sendResponse('tabHidden');
});