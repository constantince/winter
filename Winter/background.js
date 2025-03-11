// 全局变量
const MAX_CONCURRENT_TABS = 1; // 最大并发标签页数量
const MAX_TAB_LIFETIME = 2 * 60 * 1000; // 5分钟

// 存储处理状态
let processingState = {
  urls: [],
  processed: [],
  failed: [],
  currentIndex: 0,
  status: "idle", // idle, processing, paused, completed, error
  progress: 0,
  error: null,
};

// 监听插件安装或更新事件
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "update") {
    console.log("SEMRUSH: 🔄 Extension updated, clearing all cache...");
    // 清除所有缓存数据
    chrome.storage.local.clear(() => {
      console.log("SEMRUSH: ✨ All cache cleared successfully");
    });
  }
});

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📨 Background script received message:", message);

  switch (message.action) {
    case "ACTIVATE_CURRENT_TAB":
      console.log("收到激活标签页的消息:", message.data);
      // 处理激活标签页的请求
      if (sender.tab && sender.tab.id) {
        chrome.tabs.update(sender.tab.id, { active: true }, function(tab) {
          console.log("✅ 成功激活标签页:", sender.tab.id);
          sendResponse({ success: true });
        });
        return true; // 保持消息通道开放
      }
      break;

    case "CLOSE_CURRENT_TAB":
      console.log("收到啦！要关闭标签页的消息:", message.data);
      console.log("收到！当前标签页ID是:", sender.tab.id);
      console.log("收到！当前URL是:", message.data.url);
      break;

    case "START_PROCESSING":
      // 向content script发送消息
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(
            tabs[0].id,
            {
              action: "START_PROCESSING",
              message: "开始处理URLs",
            },
            function (response) {
              // 发送响应回popup
              sendResponse({
                status: "success",
                message: "Processing started",
              });
            }
          );
        } else {
          sendResponse({ status: "error", message: "No active tab found" });
        }
      });
      return true; // 表示会异步发送响应

    case "CLOSE_AND_PROCESS_NEXT":
      // 关闭发送消息的标签页并处理下一个URL
      if (sender.tab && sender.tab.id) {
        handleCloseAndProcessNext(message.data, sender.tab.id);
      }
      break;

    case "GET_STATUS":
      console.log("📊 Current processing state:", processingState);
      sendResponse(processingState);
      break;

    case "PAUSE_PROCESSING":
      console.log(
        "⏸️ Pausing processing at index:",
        processingState.currentIndex
      );
      pauseProcessing();
      sendResponse({ status: "paused" });
      break;

    case "RESUME_PROCESSING":
      console.log(
        "▶️ Resuming processing from index:",
        processingState.currentIndex
      );
      resumeProcessing();
      sendResponse({ status: "resumed" });
      break;

    case "RESET_PROCESSING":
      console.log("🔄 Resetting processing state");
      resetProcessing();
      sendResponse({ status: "reset" });
      break;

    case "START_BATCH_PROCESSING":
      handleBatchProcessing();
      break;

    default:
      sendResponse({ status: "error", message: "Unknown action" });
      return false; // 同步响应
  }
});

// 开始处理URLs
async function startProcessing() {
  try {
    // 从storage获取URLs
    const result = await chrome.storage.local.get(["extractedUrls"]);
    const urls = result.extractedUrls;

    if (!urls || urls.length === 0) {
      console.error("❌ No URLs found in storage");
      handleError(new Error("No URLs found in storage"));
      return;
    }

    console.log("📝 Retrieved URLs from storage:", urls.length);

    // 初始化状态
    processingState = {
      urls: urls,
      processed: [],
      failed: [],
      currentIndex: 0,
      status: "processing",
      progress: 0,
      error: null,
    };

    // 保存状态到storage
    await saveState();
    console.log("💾 Initial state saved");

    // 开始处理第一个URL
    processNextUrl();
  } catch (error) {
    console.error("❌ Error in startProcessing:", error);
    handleError(error);
  }
}

// 处理下一个URL
async function processNextUrl() {
  if (processingState.status !== "processing") {
    console.log(
      "⏹️ Processing stopped, current status:",
      processingState.status
    );
    return;
  }

  if (processingState.currentIndex >= processingState.urls.length) {
    console.log("✅ All URLs processed successfully");
    completeProcessing();
    return;
  }

  const currentUrl = processingState.urls[processingState.currentIndex];
  console.log(
    `🔄 Processing URL ${processingState.currentIndex + 1}/${
      processingState.urls.length
    }:`,
    currentUrl
  );

  try {
    // 处理当前URL
    const result = await processUrl(currentUrl);

    // 更新处理状态
    processingState.processed.push(result);
    processingState.currentIndex++;
    processingState.progress =
      (processingState.currentIndex / processingState.urls.length) * 100;

    console.log(
      `✅ URL processed successfully. Progress: ${processingState.progress.toFixed(
        2
      )}%`
    );

    // 保存状态并通知进度
    await saveState();
    notifyProgress();

    // 直接处理下一个URL，不使用setTimeout
    processNextUrl();
  } catch (error) {
    console.error(`❌ Failed to process URL: ${currentUrl}`, error);
    processingState.failed.push({
      url: currentUrl,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    processingState.currentIndex++;
    await saveState();
    notifyProgress();

    // 直接处理下一个URL，不使用setTimeout
    processNextUrl();
  }
}

// 处理单个URL的函数
async function processUrl(url) {
  console.log("🔍 Processing URL:", url);

  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("✅ Finished processing URL:", url);
      resolve({
        url: url,
        timestamp: new Date().toISOString(),
      });
    }, 100); // 每个URL处理耗时100ms
  });
}

// 暂停处理
function pauseProcessing() {
  console.log("⏸️ Pausing processing");
  processingState.status = "paused";
  saveState();
  notifyProgress();
}

// 恢复处理
function resumeProcessing() {
  if (processingState.status === "paused") {
    console.log("▶️ Resuming processing");
    processingState.status = "processing";
    saveState();
    processNextUrl();
  }
}

// 重置处理
function resetProcessing() {
  console.log("🔄 Resetting all processing state");
  processingState = {
    urls: [],
    processed: [],
    failed: [],
    currentIndex: 0,
    status: "idle",
    progress: 0,
    error: null,
  };
  saveState();
  notifyProgress();
}

// 完成处理
function completeProcessing() {
  console.log("🎉 Processing completed!", {
    total: processingState.urls.length,
    processed: processingState.processed.length,
    failed: processingState.failed.length,
  });
  processingState.status = "completed";
  processingState.progress = 100;
  saveState();

  // 发送完成消息
  chrome.runtime.sendMessage({
    action: "processingComplete",
    data: {
      status: "completed",
      total: processingState.urls.length,
      processed: processingState.processed.length,
      failed: processingState.failed.length,
      progress: 100,
    },
  });
}

// 处理错误
function handleError(error) {
  console.error("❌ Error occurred:", error);
  processingState.status = "error";
  processingState.error = error.message;
  saveState();

  // 发送错误消息
  chrome.runtime.sendMessage({
    action: "processingError",
    error: error.message,
    data: {
      status: "error",
      total: processingState.urls.length,
      processed: processingState.processed.length,
      failed: processingState.failed.length,
      progress: processingState.progress,
    },
  });
}

// 保存状态到storage
async function saveState() {
  try {
    await chrome.storage.local.set({ processingState });
    console.log("💾 State saved:", processingState);
  } catch (error) {
    console.error("❌ Error saving state:", error);
  }
}

// 通知进度更新
function notifyProgress() {
  // 只在处理中状态发送进度更新
  if (processingState.status === "processing") {
    const progressData = {
      status: processingState.status,
      progress: processingState.progress,
      processed: processingState.processed.length,
      failed: processingState.failed.length,
      total: processingState.urls.length,
      error: processingState.error,
    };
    console.log("📢 Progress update:", progressData);
    chrome.runtime.sendMessage({
      action: "PROGRESS_UPDATE",
      data: progressData,
    });
  }
}

// 处理批量处理的函数
async function handleBatchProcessing() {
  try {
    // 从storage获取URLs和semrushEntryUrls
    const result = await chrome.storage.local.get([
      "extractedUrls",
      "semrushEntryUrls",
    ]);
    const allUrls = result.extractedUrls || [];
    const semrushUrls = result.semrushEntryUrls || [];

    if (!semrushUrls.length) {
      console.error("❌ No semrush entry URLs found");
      return;
    }

    // 获取未处理的URLs
    const unprocessedUrls = allUrls.filter(
      (url) => url.status === "unprocessed"
    );
    console.log("📊 Found unprocessed URLs:", unprocessedUrls.length);

    if (unprocessedUrls.length === 0) {
      console.log("✅ No unprocessed URLs found");
      return;
    }

    // 获取前N个未处理的URL
    const urlsToProcess = unprocessedUrls.slice(0, MAX_CONCURRENT_TABS);
    console.log(`🔄 Processing ${urlsToProcess.length} URLs in parallel`);

    // 更新这些URL的状态为processing
    const updatedUrls = allUrls.map((url) => {
      if (urlsToProcess.some((u) => u.url === url.url)) {
        return { ...url, status: "processing" };
      }
      return url;
    });

    // 保存更新后的状态
    await chrome.storage.local.set({ extractedUrls: updatedUrls });

    // 为每个URL打开一个新标签
    await processUrlBatch(urlsToProcess, allUrls, semrushUrls);

    console.log(`✅ Opened ${urlsToProcess.length} tabs for processing`);
  } catch (error) {
    console.error("❌ Error in batch processing:", error);
  }
}

// 处理关闭当前标签页并处理下一个URL的函数
async function handleCloseAndProcessNext(data, tabId) {
  try {
    // 关闭发送消息的标签页
    // await chrome.tabs.remove(tabId);
    console.log("✅ Closed tab:", tabId);

    // 从storage获取URLs和semrushEntryUrls
    const result = await chrome.storage.local.get([
      "extractedUrls",
      "semrushEntryUrls",
      "processedData",
    ]);
    const allUrls = result.extractedUrls || [];
    const semrushUrls = result.semrushEntryUrls || [];
    const processedData = result.processedData || [];

    // 获取未处理的URLs
    const unprocessedUrls = allUrls.filter(
      (url) => url.status === "unprocessed"
    );

    // 如果没有未处理的URL，说明所有URL都已处理完成
    if (unprocessedUrls.length === 0) {
      console.log("✅ All URLs have been processed!");
      // 发送完成消息给popup
      chrome.runtime.sendMessage({
        action: "PROCESSING_COMPLETE",
        data: {
          processedUrls: processedData.length,
          totalUrls: allUrls.length,
          finalData: processedData,
          status: "所有数据处理完成",
        },
      });
      return;
    }

    // 如果还有未处理的URL，继续处理
    if (data.hasUnprocessedUrls) {
      // 如果是超时导致的关闭，将当前URL状态重置为unprocessed
      if (data.isTimeout) {
        const currentUrlIndex = allUrls.findIndex(
          (url) => url.url === data.currentProcessedUrl
        );
        if (currentUrlIndex !== -1) {
          allUrls[currentUrlIndex].status = "unprocessed";
          await chrome.storage.local.set({ extractedUrls: allUrls });
        }
      }

      // 获取要处理的URL（最多MAX_CONCURRENT_TABS个）
      const urlsToProcess = unprocessedUrls.slice(0, MAX_CONCURRENT_TABS);

      // 更新这些URL的状态为processing
      const updatedUrls = allUrls.map((url) => {
        if (urlsToProcess.some((u) => u.url === url.url)) {
          return { ...url, status: "processing" };
        }
        return url;
      });

      // 保存更新后的状态
      await chrome.storage.local.set({ extractedUrls: updatedUrls });

      // 为每个URL打开一个新标签
      await processUrlBatch(urlsToProcess, updatedUrls, semrushUrls);
    }
  } catch (error) {
    console.error("❌ Error in handleCloseAndProcessNext:", error);
  }
}

// 新增：处理一批URL的函数
async function processUrlBatch(urlsToProcess, allUrls, semrushUrls) {
  try {
    // 获取当前打开的标签页数量 - 只获取我们扩展打开的标签页
    const tabs = await chrome.tabs.query({
      url: ["*://*.semrush.fun/*"], // 只匹配我们的域名
    });
    console.log("🔍 Current extension tabs count:", tabs.length);

    // 计算可以打开的新标签页数量
    const availableSlots = Math.min(
      MAX_CONCURRENT_TABS, // 直接使用最大值，因为我们只计算了扩展的标签页
      urlsToProcess.length
    );

    console.log("📊 Available slots for new tabs:", availableSlots);

    // 只处理可用槽位数量的URL
    const batchToProcess = urlsToProcess.slice(0, availableSlots);
    console.log("🎯 URLs to process in this batch:", batchToProcess.length);

    // 跟踪当前批次中的所有标签
    const currentBatchTabs = [];

    for (const url of batchToProcess) {
      if (!url || !url.url) {
        console.error("❌ Invalid URL object:", url);
        continue; // 跳过无效的URL
      }

      const urlIndex = allUrls.findIndex((item) => item?.url === url.url);
      if (urlIndex === -1) {
        console.error("❌ URL not found in allUrls:", url);
        continue; // 跳过未找到的URL
      }

      const processedUrl = url.url
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "");

      // 为每个URL随机选择一个域名
      const randomDomain =
        semrushUrls[Math.floor(Math.random() * semrushUrls.length)];
      console.log("🎲 Selected random domain for URL:", randomDomain);

      const targetUrl = `${randomDomain}/analytics/overview/?db=${"us"}&q=${processedUrl}&protocol=https&searchType=domain&processingUrl=${urlIndex}`;
      console.log("🔗 Opening URL:", targetUrl);

      try {
        // 创建新标签
        const tab = await chrome.tabs.create({
          url: targetUrl,
          active: false,
        });

        // 将新标签添加到当前批次
        currentBatchTabs.push(tab.id);
        console.log(`✅ Created tab ${tab.id} for URL:`, url.url);

        // 设置标签最大存活时间
        setTimeout(async () => {
          try {
            // 检查标签是否还存在
            const tabExists = await chrome.tabs.get(tab.id).catch(() => null);
            if (tabExists) {
              console.log(
                `⏰ Tab ${tab.id} reached maximum lifetime, closing...`
              );
              await chrome.tabs.remove(tab.id);

              // 获取最新的URL状态
              const latestResult = await chrome.storage.local.get([
                "extractedUrls",
                "semrushEntryUrls",
              ]);
              const latestUrls = latestResult.extractedUrls || [];

              // 将URL状态重置为unprocessed
              const currentUrlIndex = latestUrls.findIndex(
                (item) => item?.url === url.url
              );
              if (currentUrlIndex !== -1) {
                latestUrls[currentUrlIndex].status = "unprocessed";
                await chrome.storage.local.set({ extractedUrls: latestUrls });
                console.log(`🔄 Reset status to unprocessed for URL:`, url.url);
              }
            }
          } catch (error) {
            console.error(`Failed to handle tab ${tab.id} timeout:`, error);
          }
        }, MAX_TAB_LIFETIME);
      } catch (error) {
        console.error(`Failed to create tab for URL ${url.url}:`, error);
      }
    }

    // 监听所有标签的关闭
    if (currentBatchTabs.length > 0) {
      let closedTabs = new Set();
      const tabCloseListener = (tabId) => {
        if (currentBatchTabs.includes(tabId)) {
          closedTabs.add(tabId);
          console.log(
            `🔄 Tab ${tabId} closed, ${closedTabs.size}/${currentBatchTabs.length} tabs closed`
          );

          // 检查是否所有标签都已关闭
          if (closedTabs.size === currentBatchTabs.length) {
            // 移除监听器
            chrome.tabs.onRemoved.removeListener(tabCloseListener);
            console.log(
              "✅ All tabs in current batch closed, checking remaining URLs..."
            );
            // 检查并处理剩余的未处理URL
            checkAndProcessRemainingUrls();
          }
        }
      };

      // 添加标签关闭监听器
      chrome.tabs.onRemoved.addListener(tabCloseListener);
      console.log(
        "👂 Tab close listener added for",
        currentBatchTabs.length,
        "tabs"
      );
    } else {
      console.log("⚠️ No tabs were created in this batch");
    }
  } catch (error) {
    console.error("❌ Error in processUrlBatch:", error);
  }
}

// 新增：检查并处理剩余的未处理URL
async function checkAndProcessRemainingUrls() {
  try {
    // 获取最新的URL状态
    const result = await chrome.storage.local.get([
      "extractedUrls",
      "semrushEntryUrls",
      "processedData",
    ]);
    const allUrls = result.extractedUrls || [];
    const semrushUrls = result.semrushEntryUrls || [];
    const processedData = result.processedData || [];

    // 获取未处理的URLs
    const unprocessedUrls = allUrls.filter(
      (url) => url.status === "unprocessed"
    );

    console.log(
      "📊 Checking remaining unprocessed URLs:",
      unprocessedUrls.length
    );

    if (unprocessedUrls.length === 0) {
      console.log("✅ All URLs have been processed!");
      // 发送完成消息给popup
      chrome.runtime.sendMessage({
        action: "PROCESSING_COMPLETE",
        data: {
          processedUrls: processedData.length,
          totalUrls: allUrls.length,
          finalData: processedData,
          status: "所有数据处理完成",
        },
      });
      return;
    }

    // 如果还有未处理的URL，开始新的批次处理
    console.log(`🔄 Starting new batch with ${unprocessedUrls.length} URLs`);

    // 更新这些URL的状态为processing
    const updatedUrls = allUrls.map((url) => {
      if (unprocessedUrls.some((u) => u.url === url.url)) {
        return { ...url, status: "processing" };
      }
      return url;
    });

    // 保存更新后的状态
    await chrome.storage.local.set({ extractedUrls: updatedUrls });

    // 处理新的批次
    await processUrlBatch(unprocessedUrls, updatedUrls, semrushUrls);
  } catch (error) {
    console.error("❌ Error checking remaining URLs:", error);
  }
}

// 处理多个标签页的打开
async function handleMultipleTabs(urls) {
  console.log("🔄 Starting to open multiple tabs:", urls);
  const openedTabs = [];

  try {
    // 获取所有可用的域名
    const result = await chrome.storage.local.get(["semrushEntryUrls"]);
    const availableDomains = result.semrushEntryUrls || [];

    if (!availableDomains.length) {
      console.error("❌ No available domains found");
      return;
    }

    // 依次打开每个标签，每个标签使用不同的随机域名
    for (const url of urls) {
      // 为每个标签随机选择一个域名
      const randomIndex = Math.floor(Math.random() * availableDomains.length);
      const randomDomain = availableDomains[randomIndex];

      // 使用随机域名创建完整的URL
      const fullUrl = url.replace(/(https?:\/\/[^\/]+)/, randomDomain);

      const tab = await chrome.tabs.create({ url: fullUrl, active: false });
      openedTabs.push(tab.id);
      console.log(
        `✅ Opened tab for ${fullUrl} with domain ${randomDomain}`,
        tab.id
      );
    }

    // 监听标签加载完成
    const loadPromises = openedTabs.map((tabId) => {
      return new Promise((resolve) => {
        function listener(updatedTabId, changeInfo) {
          if (updatedTabId === tabId && changeInfo.status === "complete") {
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
