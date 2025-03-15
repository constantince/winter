// 全局变量
const SEMRUSH_VIP = "zh4";
const OBSERVER_TIMEOUT = 0.5 * 60 * 1000; //  2 分钟超时
const FALLBACK_URL = "https://www.semrush.fun/home"; // 超时后返回的URL
let shouldStopScroll = false; // 控制是否停止滚动
const params = new URLSearchParams(window.location.search);
const domain = window.location.origin;
const processingUrl = params.get("processingUrl");
// 匹配当前页面URL
const currentPageUrl = window.location.href;
// 初始化内容脚本
console.log("SEMRUSH: 🔧 Content script initialized");

checkProcessingStatus();

// 主要功能初始化函数
function initializeScript() {
  console.log("Initializing content script");
  console.log("SEMRUSH: 📄 Checking URL pattern");
  const overviewUrlPattern = /overview/;

  const positionsUrlPattern = /positions/;

  const indexPagePattern = /projects/;

  if (overviewUrlPattern.test(currentPageUrl)) {
    // 域名概览
    waitUntilElementIsVisible();
  } else if (positionsUrlPattern.test(currentPageUrl)) {
    getIntentData();
  } else if (indexPagePattern.test(currentPageUrl)) {
    // 进入初始化projects界面
    console.log("SEMRUSH: ready to start");
    // 发送一次心跳
    sendOneHeartbeat();

    searchInput();
  } else {
    console.log("SEMRUSH: ⚠️ URL pattern not matched");
  }
}

// 发送单次心跳的函数
function sendOneHeartbeat() {
  console.log("Sending one-time heartbeat");
  chrome.runtime.sendMessage(
    {
      action: "HEARTBEAT",
      data: {
        timestamp: Date.now(),
      },
    },
    (response) => {
      if (response && response.status === "ok") {
        console.log("Heartbeat acknowledged");
      }
    }
  );
}

// 检查缓存processingStatus 的状态
function checkProcessingStatus() {
  const entryUrlPattern = /^https:\/\/www\.semrush\.fun\/home$/;

  if (entryUrlPattern.test(currentPageUrl)) {
    document.addEventListener("DOMContentLoaded", initMenu);
  } else {
    chrome.storage.local.get("processingStatus", function (result) {
      console.log("SEMRUSH: 🔍 Processing status:", result.processingStatus);
      if (result.processingStatus === "processing") {
        // 检查文档是否已经加载完成
        if (document.readyState === "loading") {
          // 如果文档还在加载中，添加事件监听器
          document.addEventListener("DOMContentLoaded", initializeScript);
        } else {
          // 如果文档已经加载完成，直接执行
          setTimeout(() => {
            initializeScript();
          }, 1000);
        }
      }
    });
  }
}

function initMenyAndJump() {
  chrome.storage.local.get(["usingDomain", "extractedUrls"], function (result) {
    const { usingDomain, extractedUrls } = result;

    if (!extractedUrls || !extractedUrls.length) {
      chrome.runtime.sendMessage({
        action: "CONTENT_SCRIPT_ERROR",
        error: "No URLs found in cache",
      });
      return;
    }

    if (!usingDomain) {
      chrome.runtime.sendMessage({
        action: "CONTENT_SCRIPT_ERROR",
        error: "No domain found in cache",
      });
      return;
    }

    // 获取当前要处理的URL
    const currentEntry = extractedUrls[processingUrl];
    console.log("SEMRUSH: 🔗 Current entry:", currentEntry);
    // 使用 getCountryCode 获取国家代码
    const countryCode = getCountryCode(currentEntry.country);
    if (countryCode === null) {
      // 没有对应的编码
      // 前往域名概览
      console.log("SEMRUSH: 🔗 没有对应的编码");

      window.location.href = `${domain}/analytics/overview/?q=${currentEntry.url}&protocol=https&searchType=domain&processingUrl=${processingUrl}`;
    } else {
      // 有对应的编码 开始第二部
      console.log("SEMRUSH: 🔗 有对应的编码", countryCode);
      setCountyAndUrlIntoStorage(countryCode);
    }

    // 向 popup 发送确认消息
    // chrome.runtime.sendMessage({
    //   action: "CONTENT_SCRIPT_READY",
    //   data: {
    //     currentIndex: processingUrl,
    //     totalUrls: extractedUrls.length,
    //     currentUrl: currentEntry.url,
    //     currentCountry: currentEntry.country,
    //   },
    // });
  });
}

// collection urls
function collectionUrls() {
  console.log("SEMRUSH: 👀 Starting to listen message");
  initMenyAndJump();
}

function initMenu() {
  console.log("SEMRUSH: 开始初始化菜单");
  const menuElements = document.querySelectorAll("small.text-muted");
  const menuUrls = [];
  menuElements.forEach((element) => {
    const url = element.textContent.trim();
    // 需要排除https://www.semrush.fun/setup?lid=13
    if (url !== "https://en01.semrush.fun") {
      menuUrls.push(url);
    }
  });
  console.log("SEMRUSH: 菜单元素:", menuUrls);
  // 直接使用固定的URL值
  // 设置为数组，保持与原逻辑兼容
  const urlsArray = menuUrls;
  // 使用随机一条作为固定URL

  const fixedUrl = urlsArray[Math.floor(Math.random() * urlsArray.length)];

  // 直接存储到缓存
  chrome.storage.local.set(
    {
      semrushEntryUrls: urlsArray,
      usingDomain: fixedUrl,
    },
    function () {
      console.log("SEMRUSH: 💾 Fixed URL saved to cache:", fixedUrl);

      // 发送消息通知 URLs 已保存
      chrome.runtime.sendMessage({
        action: "ENTRY_URLS_SAVED",
        data: {
          urls: urlsArray,
          count: urlsArray.length,
          usingDomain: fixedUrl,
        },
      });
    }
  );
}
