async function main() {
    // Retrieve whitelist
    const data = await browser.storage.local.get();
    let whitelist = data.whitelist ? data.whitelist : new Set();
    browser.storage.onChanged.addListener(changeData => {
        whitelist = changeData.whitelist.newValue;
    });

    // Main proxy handler
    function handleProxyRequest(requestInfo) {
        const url = new URL(requestInfo.url);
        const hostname = url.hostname;

        const proxyInfo0 = {type: 'direct'};
        const proxyInfo1 = {type: 'socks', host: 'localhost', port: 1080, proxyDNS: true};

        // Always use direct for localhost
        if (hostname == 'localhost' || hostname == '127.0.0.1') {
            console.log(`Using direct for ${url} because hostname is localhost`);
            return proxyInfo0;
        }

        // If url in whitelist
        if (whitelist.has(hostname)) {
            console.log(`Using direct for ${url} because hostname (${hostname}) is in whitelist`);
            return proxyInfo0;
        }

        // If request is from a tab
        if (requestInfo.tabId >= 0) {
            return browser.tabs.get(requestInfo.tabId).then(tab => {
                if (tab.url) {
                    const tabUrl = new URL(tab.url);
                    if (whitelist.has(tabUrl.hostname)) {
                        console.log(`Using direct for ${url} because hostname of tab.url (${tab.url}) is in whitelist`);
                        return proxyInfo0;
                    } else {
                        console.log(`Using proxy for ${url} because hostname of tab.url (${tab.url}) is not in whitelist`);
                        return proxyInfo1;
                    }
                } else {
                    console.log(`Using proxy for ${url} because tab.url is invalid (${tab.url})`);
                    return proxyInfo1;
                }
            });
        } else {  // tabId of initial requests or DNS requests is -1
            console.log(`Using proxy for ${url} because its hostname is not in whitelist and its tabId is ${requestInfo.tabId}`);
            return proxyInfo1;
        }
    }

    // Listen on all requests
    browser.proxy.onRequest.addListener(handleProxyRequest, {urls: ['<all_urls>']});
    browser.proxy.onError.addListener(error => {
        console.error(`Error in proxy handler: ${error.message}`);
    });
}

main().catch(error => {
    console.error(`Error in background: ${error.message}`);
});
