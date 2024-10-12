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

export function getTabUrlById(tagId: number) {
    return new Promise((resolve) => {
        try {
            chrome.tabs.get(tagId, tab => {
                resolve(tab.url || '');
            });
        } catch (error) {
            console.error('getTabUrlById error', error);
            resolve('');
        }
    })
}

export async function hash(str: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}