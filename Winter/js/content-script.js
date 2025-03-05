// 初始化内容脚本
console.log("🔧 Content script initialized");

// DOM加载完成后执行
document.addEventListener("DOMContentLoaded", function () {
  console.log("📄 DOM loaded, checking URL pattern");

  // 匹配当前页面URL
  const currentPageUrl = window.location.href;
  const urlPattern =
    /^https:\/\/vip\d\.semrush\.fun\/analytics\/overview\/\?q=.*&protocol=https&searchType=domain$/;
  const positionsUrlPattern =
    /^https:\/\/vip\d\.semrush\.fun\/analytics\/organic\/positions\/\?filter=.*&db=.*&q=.*&searchType=domain$/;

  if (urlPattern.test(currentPageUrl)) {
    console.log("✅ Matched overview URL pattern");
    // 使用MutationObserver监听DOM变化
    observeDOM();
  } else if (positionsUrlPattern.test(currentPageUrl)) {
    console.log("✅ Matched positions URL pattern");
    // 执行第二步
    stepTwoGetDom();
  } else {
    console.log("⚠️ URL pattern not matched");
  }
});

// 监听DOM变化
function observeDOM() {
  console.log("👀 Starting to observe DOM changes");

  // 创建观察者
  const observer = new MutationObserver((mutations) => {
    // 检查是否存在目标元素
    const fatherElement = document.querySelectorAll(
      "div.___SRow_1hl9u-red-team"
    )[1];

    console.log("国家元素:", fatherElement);
    if (fatherElement) {
      //国家
      const countryElement = fatherElement.querySelector(
        ".___SText_13vkm-red-team"
      );
      //流量
      const trafficElement = fatherElement.querySelector(
        ".___SText_xheeu-red-team"
      );

      if (countryElement && trafficElement) {
        console.log("🎯 Found target elements");
        // 获取数据
        stepOneGetDom(countryElement, trafficElement);
        // 停止观察
        observer.disconnect();
        console.log("🛑 Stopped observing DOM changes");
      }
    }
  });

  // 配置观察选项
  const config = {
    childList: true,
    subtree: true,
  };

  // 开始观察
  observer.observe(document.body, config);
}

function stepOneGetDom(countryElement, trafficElement) {
  try {
    const country = countryElement
      ? countryElement.textContent.trim()
      : "Not found";

    const traffic = trafficElement
      ? trafficElement.textContent.trim()
      : "Not found";

    console.log("国家:", country, "流量:", traffic);

    // 如果任一元素未找到，抛出错误
    if (country === "Not found" || traffic === "Not found") {
      throw new Error("Some elements were not found on the page");
    }

    // 获取当前处理的URL
    chrome.storage.local.get(
      ["currentUrlIndex", "extractedUrls"],
      function (result) {
        const { currentUrlIndex, extractedUrls } = result;
        if (!extractedUrls || currentUrlIndex === undefined) {
          throw new Error("Failed to get current URL from storage");
        }
        let currentUrl = extractedUrls[currentUrlIndex];

        // 处理 URL，移除 https:// 和 www. 前缀
        currentUrl = currentUrl
          .replace(/^https?:\/\//, "")
          .replace(/^www\./, "");
        console.log("🔗 Processed URL for next step:", currentUrl);

        //开始跳转第二个界面
        window.location.href = `https://vip1.semrush.fun/analytics/organic/positions/?filter={"search":"","volume":"","positions":"","positionsType":"all","serpFeatures":null,"intent":["transactional"],"kd":"","advanced":{}}&db=${country.toLowerCase()}&q=${currentUrl}&searchType=domain`;
      }
    );
  } catch (error) {
    console.error("❌ Error getting DOM elements:", error);
    return null;
  }
}

function stepTwoGetDom() {
  console.log("👋 Heel");
}

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📨 Content script received message:", message);

  switch (message.action) {
    case "START_PROCESSING":
      console.log("🚀 Starting URL processing in content script");
      handleStartProcessing();
      break;

    // 可以添加其他消息处理...
    default:
      console.log("⚠️ Unknown message action:", message.action);
  }
});

// 处理开始处理的逻辑
function handleStartProcessing() {
  try {
    console.log("🚀 Starting URL processing in content script");

    // 获取当前索引和URLs
    chrome.storage.local.get(
      ["currentUrlIndex", "extractedUrls"],
      function (result) {
        const { currentUrlIndex, extractedUrls } = result;

        if (!extractedUrls || extractedUrls.length === 0) {
          throw new Error("No URLs found in cache");
        }

        if (currentUrlIndex === undefined) {
          throw new Error("No URL index found in cache");
        }

        // 获取当前要处理的URL
        const currentUrl = extractedUrls[currentUrlIndex];
        console.log("📍 Current URL index:", currentUrlIndex);
        console.log("🔗 Current URL:", currentUrl);
        window.location.href = `https://vip1.semrush.fun/analytics/overview/?q=${currentUrl}&protocol=https&searchType=domain`;
        // 向 popup 发送确认消息
        chrome.runtime.sendMessage({
          action: "CONTENT_SCRIPT_READY",
          data: {
            currentIndex: currentUrlIndex,
            totalUrls: extractedUrls.length,
            currentUrl: currentUrl,
          },
        });
      }
    );
  } catch (error) {
    console.error("❌ Error in content script:", error);
    // 向 popup 发送错误消息
    chrome.runtime.sendMessage({
      action: "CONTENT_SCRIPT_ERROR",
      error: error.message,
    });
  }
}
