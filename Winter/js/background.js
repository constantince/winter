// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background script received message:", message);

  if (message.action === "CHECK_REDIRECTS") {
    handleRedirectChecks(message.data.urls, sendResponse);
    return true; // 保持消息通道开放以进行异步响应
  }
});

// 处理重定向检查
async function handleRedirectChecks(urls) {
  const redirectedUrls = [];
  const tabIds = new Map();

  // 创建一个 Promise，在所有重定向完成时解析
  return new Promise((resolve) => {
    let pendingUrls = new Set(urls);

    // 监听标签页更新事件
    chrome.tabs.onUpdated.addListener(function onUpdated(
      tabId,
      changeInfo,
      tab
    ) {
      if (changeInfo.status === "complete" && tabIds.has(tabId)) {
        const originalUrl = tabIds.get(tabId);
        redirectedUrls.push(tab.url);
        pendingUrls.delete(originalUrl);

        // 关闭检查完成的标签页
        chrome.tabs.remove(tabId);

        // 如果所有 URL 都已检查完成
        if (pendingUrls.size === 0) {
          chrome.tabs.onUpdated.removeListener(onUpdated);
          resolve(redirectedUrls);
        }
      }
    });

    // 为每个 URL 创建一个新标签页
    urls.forEach((url) => {
      chrome.tabs.create({ url: url, active: false }, (tab) => {
        tabIds.set(tab.id, url);
      });
    });
  });
}

// 处理来自 content script 的其他消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "CHECK_REDIRECTS") {
    handleRedirectChecks(message.data.urls).then((redirectedUrls) => {
      sendResponse({ redirectedUrls });
    });
    return true; // 保持消息通道开放
  }
  // ... 处理其他消息类型
});
