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