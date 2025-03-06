// 全局变量
const SEMRUSH_VIP = 'vip1';

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

    // 获取当前处理的URL和索引
    chrome.storage.local.get(
      ["currentUrlIndex", "extractedUrls", "processedData"],
      function (result) {
        const { currentUrlIndex, extractedUrls, processedData = [] } = result;
        if (!extractedUrls || currentUrlIndex === undefined) {
          throw new Error("Failed to get current URL from storage");
        }
        let currentUrl = extractedUrls[currentUrlIndex];

        // 发送进度更新消息
        chrome.runtime.sendMessage({
          action: 'PROGRESS_UPDATE',
          data: {
            currentIndex: currentUrlIndex,
            totalUrls: extractedUrls.length,
            currentUrl: currentUrl,
            stage: 'overview',
            status: `正在获取 ${currentUrl} 的概览数据`
          }
        });

        // 处理 URL，移除 https:// 和 www. 前缀
        const processedUrl = currentUrl.replace(/^https?:\/\//, "").replace(/^www\./, "");
        console.log("🔗 Processed URL for next step:", processedUrl);

        // 存储第一步的数据
        const stepOneData = {
          index: currentUrlIndex,
          url: currentUrl,
          country,
          overviewTraffic: traffic,
          keywords: [], // 将在第二步填充
          keywordTraffic: [], // 将在第二步填充
          searchVolume: [] // 将在第二步填充
        };

        // 更新或添加数据到缓存
        const updatedData = [...processedData];
        const existingIndex = updatedData.findIndex(item => item.index === currentUrlIndex);
        if (existingIndex >= 0) {
          updatedData[existingIndex] = { ...updatedData[existingIndex], ...stepOneData };
        } else {
          updatedData.push(stepOneData);
        }

        // 保存更新后的数据
        chrome.storage.local.set({ processedData: updatedData }, function() {
          console.log('💾 Step 1 data saved:', stepOneData);
          
          //开始跳转第二个界面
          window.location.href = `https://${SEMRUSH_VIP}.semrush.fun/analytics/organic/positions/?filter={"search":"","volume":"","positions":"","positionsType":"all","serpFeatures":null,"intent":["transactional"],"kd":"","advanced":{}}&db=${country.toLowerCase()}&q=${processedUrl}&searchType=domain`;
        });
      }
    );
  } catch (error) {
    console.error("❌ Error getting DOM elements:", error);
    return null;
  }
}

function stepTwoGetDom() {
  console.log("👀 Starting to observe positions DOM changes");

  // 获取当前URL信息用于进度更新
  chrome.storage.local.get(['currentUrlIndex', 'extractedUrls'], function(result) {
    const { currentUrlIndex, extractedUrls } = result;
    if (currentUrlIndex !== undefined && extractedUrls) {
      chrome.runtime.sendMessage({
        action: 'PROGRESS_UPDATE',
        data: {
          currentIndex: currentUrlIndex,
          totalUrls: extractedUrls.length,
          currentUrl: extractedUrls[currentUrlIndex],
          stage: 'positions',
          status: `正在获取关键词数据`
        }
      });
    }
  });

  // 创建观察者
  const observer = new MutationObserver((mutations) => {
    // 检查是否存在目标元素集合
    const fatherElements = document.querySelectorAll("h3.___SRow_a2h7d-red-team");
    
    if (fatherElements && fatherElements.length > 0) {
      console.log("🎯 Found target elements:", fatherElements.length);
      
      // 获取前5个元素的数据（如果存在的话）
      const keywords = [];
      const keywordTraffic = [];
      const searchVolume = [];
      const elementsToProcess = Math.min(5, fatherElements.length);
      
      for (let i = 0; i < elementsToProcess; i++) {
        try {
          const element = fatherElements[i];
          
          // 获取关键字（使用name属性）
          const keywordElement = element.querySelector('span.___SText_pr68d-red-team');
          const keyword = keywordElement?.textContent.trim() || "Not found";
          
          // 通过name属性获取流量和搜索量
          const trafficElement = element.querySelector('div[name="traffic"]');
          const searchVolumeElement = element.querySelector('div[name="volume"]');
          
          const traffic = trafficElement?.textContent.trim() || "Not found";
          const volume = searchVolumeElement?.textContent.trim() || "Not found";
          
          // 添加到数组
          keywords.push(keyword);
          keywordTraffic.push(traffic);
          searchVolume.push(volume);

        } catch (error) {
          console.error(`❌ Error processing element ${i + 1}:`, error);
        }
      }
      
      // 如果成功获取到数据，更新存储
      if (keywords.length > 0) {
        // 获取当前存储的数据
        chrome.storage.local.get(['currentUrlIndex', 'processedData', 'extractedUrls'], function(result) {
          const { currentUrlIndex, processedData = [], extractedUrls = [] } = result;
          
          // 更新当前URL的数据
          const updatedData = [...processedData];
          const currentDataIndex = updatedData.findIndex(item => item.index === currentUrlIndex);
          
          if (currentDataIndex >= 0) {
            updatedData[currentDataIndex] = {
              ...updatedData[currentDataIndex],
              keywords,
              keywordTraffic,
              searchVolume
            };
            
            // 保存更新后的数据
            chrome.storage.local.set({ processedData: updatedData }, function() {
              console.log('💾 Step 2 data saved for index:', currentUrlIndex);
              console.log('📊 Current data:', updatedData[currentDataIndex]);

              // 发送进度更新消息
              chrome.runtime.sendMessage({
                action: 'PROGRESS_UPDATE',
                data: {
                  currentIndex: currentUrlIndex,
                  totalUrls: extractedUrls.length,
                  currentUrl: extractedUrls[currentUrlIndex],
                  stage: 'complete',
                  status: `已完成数据获取`,
                  processedData: updatedData[currentDataIndex]
                }
              });

              // 检查是否还有下一个URL需要处理
              const nextIndex = currentUrlIndex + 1;
              if (nextIndex < extractedUrls.length) {
                // 更新索引并处理下一个URL
                chrome.storage.local.set({ currentUrlIndex: nextIndex }, function() {
                  console.log('⏭️ Moving to next URL, index:', nextIndex);
                  const nextUrl = extractedUrls[nextIndex];
                  window.location.href = `https://${SEMRUSH_VIP}.semrush.fun/analytics/overview/?q=${nextUrl}&protocol=https&searchType=domain`;
                });
              } else {
                // 所有URL都处理完成
                console.log('✅ All URLs processed!');
                console.log('📊 Final processed data:', JSON.stringify(updatedData, null, 2));
                
                // 发送完成消息给popup
                chrome.runtime.sendMessage({
                  action: 'PROCESSING_COMPLETE',
                  data: {
                    processedUrls: updatedData.length,
                    totalUrls: extractedUrls.length,
                    finalData: updatedData
                  }
                });
              }
            });
          } else {
            console.error('❌ No matching data found for current index:', currentUrlIndex);
          }
        });
        
        // 停止观察
        observer.disconnect();
        console.log("🛑 Stopped observing DOM changes");
      }
    }
  });

  // 配置观察选项
  const config = {
    childList: true,
    subtree: true
  };

  // 开始观察
  observer.observe(document.body, config);
  console.log("🔄 Started observing DOM for positions data");
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
        window.location.href = `https://${SEMRUSH_VIP}.semrush.fun/analytics/overview/?q=${currentUrl}&protocol=https&searchType=domain`;
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
