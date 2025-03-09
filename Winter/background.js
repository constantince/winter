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

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📨 Background script received message:", message);

  switch (message.action) {
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
