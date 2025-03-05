// document.addEventListener('DOMContentLoaded', initialization);
// const URLs = window.location.href;
console.log("content-script.js loaded");
// inti function
function initialization() {
  //https://vip1.semrush.fun/projects/
  // const pattern = /https?:\/\/(vip\d)\.semrush\.fun\/projects\/?$/;
  // if (!pattern.test(URLs)) {
  //     console.error("Not in the relevant product page")
  //     return;
  // }
  // code excute here;
  console.log("start to geting data...");
  window.location.href =
    "https://vip1.semrush.fun/analytics/overview/?q=baidu.com&protocol=https&searchType=domain";
}

function pause() {
  console.log("paused...");
}

// 添加一个初始化消息，确认脚本已加载
console.log("Content script loaded");

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message);

  if (message.action === "ping") {
    console.log("Received ping, sending pong");
    sendResponse({ pong: true });
    return true;
  }

  if (message.action === "startProcessing") {
    const urls = message.data.urls;
    console.log(`收到 ${urls.length} 个URL准备处理:`, urls);

    // 立即回复已收到消息
    sendResponse({ status: "started" });

    // 开始处理URLs
    processUrls(urls)
      .then(() => {
        // 所有URL处理完成后，发送完成消息
        chrome.runtime.sendMessage({
          action: "processingComplete",
          data: {
            total: urls.length,
            timestamp: new Date().getTime(),
          },
        });
      })
      .catch((error) => {
        // 处理出错时发送错误消息
        chrome.runtime.sendMessage({
          action: "processingError",
          error: error.message,
        });
      });

    return true;
  }
});

// 处理URLs的函数
async function processUrls(urls) {
  console.log("开始处理URLs...");

  try {
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      try {
        console.log(`处理URL ${i + 1}/${urls.length}:`, url);
        await processUrl(url);

        // 发送进度更新
        chrome.runtime.sendMessage({
          action: "processingProgress",
          data: {
            current: i + 1,
            total: urls.length,
            url: url,
          },
        });
      } catch (error) {
        console.error(`处理URL失败: ${url}`, error);
      }
    }

    console.log("所有URL处理完成");

    // 发送完成消息
    chrome.runtime.sendMessage({
      action: "processingComplete",
      data: {
        total: urls.length,
        timestamp: new Date().getTime(),
      },
    });

    // 清理本地数据
    cleanupLocalData();
  } catch (error) {
    console.error("处理URLs时出错:", error);
    chrome.runtime.sendMessage({
      action: "processingError",
      error: error.message,
    });
  }
}

// 清理本地数据
function cleanupLocalData() {
  // 清理可能存在的全局变量
  if (window.urlExtractorData) {
    delete window.urlExtractorData;
  }

  // 移除可能添加的DOM标记
  const marker = document.getElementById("url-extractor-initialized");
  if (marker) {
    marker.remove();
  }

  console.log("本地数据已清理");
}

// 处理单个URL的函数
async function processUrl(url) {
  // 这里添加实际的URL处理逻辑
  await new Promise((resolve) => setTimeout(resolve, 100)); // 模拟处理时间
}

// 可以添加一个清理函数
function clearStoredUrls() {
  chrome.storage.local.remove(["extractedUrls"], function () {
    console.log("URLs已从存储中清除");
  });
}
