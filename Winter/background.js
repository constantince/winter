// 存储定时器和标签页信息
let tabCloseTimer = null;
let activeTabId = null;
let reopenTimer = null;
const REOPEN_DELAY = 2 * 60 * 1000; // 2分钟
const TAB_CLOSE_TIMEOUT = 15 * 60 * 1000; // 15分钟

// 处理来自popup.js的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message);

  switch (message.action) {
    case "OPEN_AND_CLOSE_TAB":
      // 从缓存中获取usingDomain，然后打开新标签页
      chrome.storage.local.get(["usingDomain"], function(result) {
        if (result.usingDomain) {
          openAndStartTimer(result.usingDomain);
        } else {
          console.error("No usingDomain found in cache");
        }
      });
      break;

    case "HEARTBEAT":
      // 处理心跳消息，重置倒计时
      if (activeTabId && tabCloseTimer) {
        console.log("Received heartbeat, resetting timer for tab:", activeTabId);
        resetCloseTimer(TAB_CLOSE_TIMEOUT);
        sendResponse({ status: "ok" });
      }
      break;

    // ... existing cases ...
  }

  // 返回true表示异步处理消息
  return true;
});

// 打开标签页并开始计时器
function openAndStartTimer(url) {
  // 清除现有的重新打开定时器（如果存在）
  if (reopenTimer) {
    clearTimeout(reopenTimer);
    reopenTimer = null;
  }

  chrome.tabs.create({ url: url, active: true }, (tab) => {
    console.log("New tab opened:", tab.id);
    activeTabId = tab.id;
    
    // 设置倒计时关闭标签页
    resetCloseTimer(TAB_CLOSE_TIMEOUT);
  });
}

// 重置关闭标签页的定时器
function resetCloseTimer(timeout) {
  // 清除现有的定时器
  if (tabCloseTimer) {
    clearTimeout(tabCloseTimer);
  }

  // 设置新的定时器
  tabCloseTimer = setTimeout(() => {
    if (activeTabId) {
      chrome.tabs.remove(activeTabId, () => {
        console.log("Tab closed after countdown:", activeTabId);
        activeTabId = null;
        tabCloseTimer = null;

        // 设置2分钟后重新打开标签页
        console.log("Setting timer to reopen tab in 2 minutes");
        reopenTimer = setTimeout(() => {
          console.log("Reopening tab after 2 minutes");
          // 从缓存中获取URL并重新打开
          chrome.storage.local.get(["usingDomain", "semrushEntryUrls"], function(result) {
            // 取usingDomain在semrushEntryUrls缓存中的下一个url 如果是最后一个，则取第一个
            const usingDomainIndex = result.semrushEntryUrls.indexOf(result.usingDomain);
            const nextUrl = usingDomainIndex === result.semrushEntryUrls.length - 1 ? result.semrushEntryUrls[0] :  result.semrushEntryUrls[usingDomainIndex + 1];
            // 更新usingDomain  
            chrome.storage.local.set({ usingDomain: nextUrl }, function() {
              if (nextUrl) {
                openAndStartTimer(nextUrl);
              } else {
                console.error("No usingDomain found in cache");
              }
            });
          });
        }, REOPEN_DELAY);
      });
    }
  }, timeout);
}
