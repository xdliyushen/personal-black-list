import { getTabUrlById, hash, log } from "./utils";

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
const tabTimes: Record<
  string, 
  { 
    closed: boolean;
    duration: number; 
    url: string, 
    lastVisibleTime?: number; 
    pageStartTime?: number;
    pageEndTime?: number;
  }
> = {};
const tabId2Key: Record<number, string> = {};

// 更新页面使用时间
const updateTabTimesStorage = async (tabId: number) => {
  return new Promise((resolve, reject) => {
    const url = tabTimes[tabId].url || await getTabUrlById(tabId);

    // 获取页面 url
    chrome.tabs.get(tabId, tab => {    
      const duration = tabTimes[tabId].duration;
      const url = tab.url;

      // TODO 写入 indexDB
      // TODO 事务
      
    });
  });
};

const createTabTimesItem = async (tabId: number) => {
  const url = await getTabUrlById(tabId) as string;
  const key = await hash(`${url}_${tabId}`);

  tabTimes[key] = {
    closed: false,
    duration: 0,
    url,
    pageStartTime: Date.now(),
    pageEndTime: -1,
    lastVisibleTime: -1,
  };

  tabId2Key[tabId] = key;
}

const updateTabTimesItem = async (tabId: number, key: string, value: any) => {
  const targetKey = tabId2Key[tabId];
  tabTimes[targetKey] = {
    ...tabTimes[key],
    [key]: value,
  };
}

// 页面激活 -> 页面不展示也会触发, 例如通过 cmd + shft + t 恢复多个页面 -> TODO chatgpt说不会, 需要验证
chrome.tabs.onActivated.addListener(async activeInfo => {
  const tabId = activeInfo.tabId;

  log('onActivated activeInfo', activeInfo);

  createTabTimesItem(tabId);
});

// 页面链接变化
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  log('onUpdated tabId', tabId);
  log('onUpdated changeInfo', changeInfo);
  log('onUpdated tab', tab);

  createTabTimesItem(tabId);
});

// 页面关闭
chrome.tabs.onRemoved.addListener(tabId => {
  log('onRemoved tabId', tabId);

  const key = tabId2Key[tabId];

  tabTimes[key].closed = true;
  tabTimes[key].pageEndTime = Date.now();
  // 之所以这里要判断 lastVisibleTime, 是为了避免页面只打开但一直隐藏的情况下, duration 为 0
  tabTimes[key].duration += tabTimes[key].lastVisibleTime ? Date.now() - tabTimes[key].lastVisibleTime : 0;

  updateTabTimesStorage(tabId);
});

// 监听 message
chrome.runtime.onMessage.addListener((request, sender) => {
  log('onMessage request', request);
  log('onMessage sender', sender);

  const tabId = sender.tab.id;
  const key = tabId2Key[tabId];

  // 避免收到的 message 在 tab 被关闭后才被处理
  if (request.action === 'addPageDuration' && !tabTimes[key].closed) {
    tabTimes[key].duration += (request.duration || 0);

    updateTabTimesStorage(tabId);
  }

  if (request.action === 'tabVisible') {
    tabTimes[key].lastVisibleTime = Date.now();
  }
});