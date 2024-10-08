import { log } from "./utils";

chrome.webNavigation.onCompleted.addListener((details) => {
  log('onCompleted details', details);

  chrome.storage.sync.get(['blacklist', 'fallbackUrl'], ({ blacklist, fallbackUrl }) => {
    log('blacklist', blacklist);
    log('fallbackUrl', fallbackUrl);

    if (blacklist && blacklist.some(pattern => new RegExp(pattern).test(details.url))) {
      chrome.tabs.update(details.tabId, { url: fallbackUrl || chrome.runtime.getURL('fallback.html') });
    }
  });
});
