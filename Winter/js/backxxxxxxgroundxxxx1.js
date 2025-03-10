// 监听插件安装或更新事件
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'update') {
    console.log('SEMRUSH: 🔄 Extension updated, clearing all cache...');
    // 清除所有缓存数据
    chrome.storage.local.clear(() => {
      console.log('SEMRUSH: ✨ All cache cleared successfully');
    });
  }
});

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background script received message:", message);

  switch (message.action) {
    case "PROGRESS_UPDATE":
      // 更新处理状态到缓存
      chrome.storage.local.set({
        processingStatus: "processing",
        currentProcessingState: message.data,
      });
      break;

    case "PROCESSING_COMPLETE":
      // 更新完成状态到缓存
      chrome.storage.local.set({
        processingStatus: "completed",
        processedData: message.data.finalData,
        currentProcessingState: {
          status: "completed",
          data: message.data.finalData,
        },
      });
      break;

    case "CONTENT_SCRIPT_ERROR":
      // 更新错误状态到缓存
      chrome.storage.local.set({
        processingStatus: "error",
        currentProcessingState: {
          status: "error",
          error: message.error,
        },
      });
      break;

    case "CONTENT_SCRIPT_READY":
      // 更新准备状态到缓存
      chrome.storage.local.set({
        currentProcessingState: {
          status: "ready",
          ...message.data,
        },
      });
      break;
  }

  // 返回true表示会异步发送响应
  return true;
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

// 处理打开多个标签的逻辑
async function handleMultipleTabs(urls) {
  console.log("🔄 Starting to open multiple tabs:", urls);
  const openedTabs = [];

  try {
    // 依次打开每个标签
    for (const url of urls) {
      const tab = await chrome.tabs.create({ url, active: false });
      openedTabs.push(tab.id);
      console.log(`✅ Opened tab for ${url}`, tab.id);
    }

    // 监听标签加载完成
    const loadPromises = openedTabs.map(tabId => {
      return new Promise((resolve) => {
        function listener(updatedTabId, changeInfo) {
          if (updatedTabId === tabId && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve(tabId);
          }
        }
        chrome.tabs.onUpdated.addListener(listener);
      });
    });

    // 等待所有标签加载完成
    await Promise.all(loadPromises);
    console.log("✅ All tabs finished loading");

    // 关闭所有打开的标签
    for (const tabId of openedTabs) {
      await chrome.tabs.remove(tabId);
      console.log(`🔄 Closed tab ${tabId}`);
    }

    console.log("✅ All tabs processed and closed");
  } catch (error) {
    console.error("❌ Error handling multiple tabs:", error);
    // 确保清理所有打开的标签
    for (const tabId of openedTabs) {
      try {
        await chrome.tabs.remove(tabId);
      } catch (e) {
        console.error(`Failed to close tab ${tabId}:`, e);
      }
    }
  }
}

// 处理关闭浏览器和清空缓存的函数
async function handleCloseBrowserAndClearCache() {
  try {
    console.log("🔄 开始清理缓存和关闭浏览器...");
    
    // 清空所有缓存数据
    await chrome.storage.local.clear();
    console.log("✅ 缓存已清空");
    
    // 获取所有标签页
    const tabs = await chrome.tabs.query({});
    console.log(`📑 找到 ${tabs.length} 个标签页`);
    
    // 关闭所有标签页
    for (const tab of tabs) {
      if (tab.id !== chrome.tabs.TAB_ID_NONE) {
        await chrome.tabs.remove(tab.id);
        console.log(`✅ 已关闭标签页: ${tab.url}`);
      }
    }
    
    // 关闭浏览器窗口
    const windows = await chrome.windows.getAll();
    for (const window of windows) {
      await chrome.windows.remove(window.id);
      console.log(`✅ 已关闭窗口: ${window.id}`);
    }
    
    console.log("✅ 所有操作已完成");
  } catch (error) {
    console.error("❌ 清理缓存和关闭浏览器时出错:", error);
    throw error;
  }
}

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("📨 收到消息:", request);

  if (request.action === "OPEN_MULTIPLE_TABS") {
    if (request.data && Array.isArray(request.data.urls)) {
      handleMultipleTabs(request.data.urls)
        .then(() => {
          console.log("✅ 所有标签页处理完成");
          sendResponse({ success: true });
        })
        .catch((error) => {
          console.error("❌ 处理标签页时出错:", error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // 保持消息通道开放
    } else {
      console.error("❌ 无效的URL数组");
      sendResponse({ success: false, error: "无效的URL数组" });
    }
  } else if (request.action === "CLOSE_BROWSER_AND_CLEAR_CACHE") {
    handleCloseBrowserAndClearCache()
      .then(() => {
        console.log("✅ 浏览器关闭和缓存清理完成");
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error("❌ 关闭浏览器和清理缓存时出错:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 保持消息通道开放
  }
});
