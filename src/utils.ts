export function sendMessageToBackground(action: string, data: any, callback?: (response: any) => void) {
    chrome.runtime.sendMessage({ action, data }, callback);
}

export function sendMessageToActiveTab(action: string, data: any, callback?: (response: any) => void) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action, data }, callback);
    });
}

export function log(name: string, data: any) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "log", name, data }, (response) => {
            console.log('log response', response);
        });
    });
}

export function initLog() {
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === "log") {
            console.log('log', request.name, request.data);
        }
    });

    console.log('log initialized');
}