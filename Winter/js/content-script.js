// 全局变量
const SEMRUSH_VIP = "zh4";

// 初始化内容脚本
console.log("SEMRUSH: 🔧 Content script initialized");

// 主要功能初始化函数
function initializeScript() {
  console.log("SEMRUSH: 📄 Checking URL pattern");

  // 匹配当前页面URL
  const currentPageUrl = window.location.href;

  const entryUrlPattern = /^https:\/\/www\.semrush\.fun\/home$/;

  const urlPattern =
    /^https:\/\/\w{2,5}\d\.semrush\.fun\/analytics\/overview\/\?q=.*&protocol=https&searchType=domain$/;
  const positionsUrlPattern =
    /^https:\/\/\w{2,5}\d\.semrush\.fun\/analytics\/organic\/positions\/\?filter=.*&db=.*&q=.*&searchType=domain$/;

  const lastUrlPattern =
    /^https:\/\/\w{2,5}\d\.semrush\.fun\/analytics\/overview\/\?db=.*&q=.*&protocol=https&searchType=domain$/;

  if (urlPattern.test(currentPageUrl)) {
    // 域名概览
    console.log("SEMRUSH: ✅ Matched overview URL pattern");
    // 使用MutationObserver监听DOM变化
    observeDOM();
  } else if (positionsUrlPattern.test(currentPageUrl)) {
    console.log("SEMRUSH: ✅ Matched positions URL pattern");
    // 执行第二步
    stepTwoGetDom();
  } else if (lastUrlPattern.test(currentPageUrl)) {
    console.log("SEMRUSH: ✅ Matched last URL pattern");
    // 执行第三步
    stepThreeGetDom();
  } else if (entryUrlPattern.test(currentPageUrl)) {
    // 进入初始化界面
    console.log("SEMRUSH: ready to start");
    collectionUrls();
  } else {
    console.log("SEMRUSH: ⚠️ URL pattern not matched");
  }
}

// 检查文档是否已经加载完成
if (document.readyState === "loading") {
  // 如果文档还在加载中，添加事件监听器
  document.addEventListener("DOMContentLoaded", initializeScript);
} else {
  // 如果文档已经加载完成，直接执行
  initializeScript();
}

// collection urls
function collectionUrls() {
  console.log("SEMRUSH: 👀 Starting to observe DOM changes");

  // 添加消息监听器
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("SEMRUSH: 📨 Content script received message:", message);

    if (message.action === "START_PROCESSING") {
      console.log("SEMRUSH: 🚀 Starting URL processing in content script");
      // 获取 usingDomain、currentUrlIndex 和 extractedUrls
      chrome.storage.local.get(
        ["usingDomain", "currentUrlIndex", "extractedUrls"],
        function (result) {
          const { usingDomain, currentUrlIndex, extractedUrls } = result;

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
          const currentEntry = extractedUrls[currentUrlIndex || 0];
          console.log("SEMRUSH: 🔗 Current entry:", currentEntry);
          // 使用 getCountryCode 获取国家代码
          const countryCode = getCountryCode(currentEntry.country);
          if (countryCode === null) {
            // 没有对应的编码
            // 前往域名概览
            console.log("SEMRUSH: 🔗 没有对应的编码");

            window.location.href = `${usingDomain}/analytics/overview/?q=${currentEntry.url}&protocol=https&searchType=domain`;
          } else {
            // 有对应的编码 开始第二部
            console.log("SEMRUSH: 🔗 有对应的编码", countryCode);
            setCountyAndUrlIntoStorage(countryCode);
            // window.location.href = `${usingDomain}/analytics/organic/positions/?filter={"search":"","volume":"","positions":"","positionsType":"all","serpFeatures":null,"intent":["commercial","transactional"],"kd":"","advanced":{}}&db=${countryCode}&q=${currentEntry.url}&searchType=domain`;
          }

          // 向 popup 发送确认消息
          chrome.runtime.sendMessage({
            action: "CONTENT_SCRIPT_READY",
            data: {
              currentIndex: currentUrlIndex || 0,
              totalUrls: extractedUrls.length,
              currentUrl: currentEntry.url,
              currentCountry: currentEntry.country,
            },
          });
        }
      );
    } else {
      console.log("SEMRUSH: ⚠️ Unknown message action:", message.action);
    }
  });

  // 创建观察者
  const observer = new MutationObserver((mutations) => {
    // 检查是否存在目标元素
    const fatherElement = document.querySelector("div.card-text");
    if (fatherElement) {
      console.log("SEMRUSH: 🎯 Found target elements");
      const urlElements = document.querySelectorAll("small.text-muted");

      const urls = Array.from(urlElements).map((el) => el.textContent.trim());

      console.log("SEMRUSH: Found URLs:", urls);

      // 将所有 URLs 存储到缓存中
      chrome.storage.local.set({ semrushEntryUrls: urls }, function () {
        console.log("SEMRUSH: 💾 URLs saved to semrushEntryUrls cache");

        // 如果有 URLs，将第一个 URL 存储到 usingDomain 缓存中
        if (urls.length > 0) {
          const firstUrl = urls[0];
          chrome.storage.local.set({ usingDomain: firstUrl }, function () {
            console.log(
              "SEMRUSH: 💾 First URL saved to usingDomain cache:",
              firstUrl
            );
          });
        }

        // 发送消息通知 URLs 已保存
        chrome.runtime.sendMessage({
          action: "ENTRY_URLS_SAVED",
          data: {
            urls: urls,
            count: urls.length,
            usingDomain: urls.length > 0 ? urls[0] : null,
          },
        });
      });

      // 停止观察
      observer.disconnect();
      console.log("SEMRUSH: 🛑 Stopped observing DOM changes");
    }
  });

  const config = {
    childList: true,
    subtree: true,
  };

  observer.observe(document.body, config);
}

// 监听DOM变化
function observeDOM() {
  console.log("SEMRUSH: 👀 Starting to observe DOM changes");

  // 创建观察者 在域名概览中获取 最大流量国家
  const observer = new MutationObserver((mutations) => {
    // 检查是否存在目标元素
    const fatherElement = document.querySelectorAll(
      "div.___SRow_1hl9u-red-team"
    )[1];

    console.log("SEMRUSH: 国家元素:", fatherElement);
    if (fatherElement) {
      //国家
      const countryElement = fatherElement.querySelector(
        ".___SText_13vkm-red-team"
      );
      if (countryElement) {
        console.log("SEMRUSH: 🎯 Found target elements");
        // 获取数据
        stepOneGetDom(countryElement);
        // 停止观察
        observer.disconnect();
        console.log("SEMRUSH: 🛑 Stopped observing DOM changes");
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

function getDoms01(callback) {
  console.log("SEMRUSH: 👀 Starting to observe keywords_by_intent section");

  // 创建观察者
  const observer = new MutationObserver((mutations) => {
    // 检查一个底部元素是否存在 作为判断是否加载完成
    const bottomFatherElement = document.querySelector(
      'div[data-at="br-vs-nonbr-legend"]'
    );
    console.log("SEMRUSH: 底部元素加载转态:", bottomFatherElement);

    console.log("最后一个页面的元素加载转态:", bottomFatherElement);

    if (bottomFatherElement) {
      const grantFatherElement = document.querySelector(
        'section[data-at="keywords_by_intent"]'
      );
      const trafficFatherElement = document.querySelector(
        'div[data-at="do-summary-ot"]'
      );

      const trafficElement = trafficFatherElement.querySelector(
        'a[data-at="main-number"]'
      );
      const trafficValue = trafficElement?.textContent.trim() || "Not found";

      console.log("SEMRUSH: 🎯 Found keywords_by_intent section");

      const fatherElement1 = grantFatherElement.querySelector(
        'div.___SRow_1hl9u-red-team[aria-rowindex="4"]'
      );
      const fatherElement2 = grantFatherElement.querySelector(
        'div.___SRow_1hl9u-red-team[aria-rowindex="5"]'
      );

      // 获取商业意图百分比
      const businessIntent =
        fatherElement1
          ?.querySelector(".___SText_xheeu-red-team")
          ?.textContent.trim() || "0%";

      console.log("SEMRUSH: 商业意图百分比:", businessIntent);

      // 获取交易意图百分比
      const transactionIntent =
        fatherElement2
          ?.querySelector(".___SText_xheeu-red-team")
          ?.textContent.trim() || "0%";

      console.log("SEMRUSH: 交易意图百分比:", transactionIntent);

      // 获取主要自然搜索关键词
      const grantFatherElement01 = document.querySelectorAll(
        'section[data-at="do-organic-keywords"] .___SRow_1hl9u-red-team'
      );
      const naturalSearchKeywords = [];
      grantFatherElement01.forEach((element) => {
        const keywordElement = element.querySelector("a[data-at='keyword']");
        const intentBadgeElement = element.querySelector(
          'div[data-at="intent-badges"]'
        );
        const volumeElement = element.querySelector(
          "div[data-at='value-volume']"
        );

        const keyword = keywordElement?.textContent.trim() || "Not found";
        const volume = volumeElement?.textContent.trim() || "Not found";
        const intentBadge =
          intentBadgeElement?.textContent.trim() || "Not found";

        naturalSearchKeywords.push({ keyword, volume, intentBadge });
      });
      console.log("SEMRUSH: 主要自然搜索关键词:", naturalSearchKeywords);

      // 获取品牌与非品牌占比
      const fatherElementBrand = document.querySelector(
        'div[data-at="br-vs-nonbr-legend"]'
      );

      const brandElement = fatherElementBrand?.querySelector(
        'a[data-at="value-0"]'
      );
      const nonBrandElement = fatherElementBrand?.querySelector(
        'a[data-at="value-1"]'
      );

      const brandRatio = brandElement?.textContent.trim() || "Not found";
      const nonBrandRatio = nonBrandElement?.textContent.trim() || "Not found";

      console.log("SEMRUSH: 品牌:", brandRatio, "非品牌:", nonBrandRatio);

      // 停止观察
      observer.disconnect();
      console.log("SEMRUSH: 🛑 Stopped observing DOM changes");

      // 执行回调函数，传递获取到的数据
      callback({
        businessIntent,
        transactionIntent,
        naturalSearchKeywords,
        brandRatio,
        nonBrandRatio,
        trafficValue,
      });
    }
  });

  // 配置观察选项
  const config = {
    childList: true,
    subtree: true,
  };

  // 开始观察
  observer.observe(document.body, config);
  console.log("SEMRUSH: 🔄 Started observing DOM for keywords data");
}

// set county and url into storage
function setCountyAndUrlIntoStorage(country) {
  // 获取当前处理的URL和索引
  chrome.storage.local.get(
    ["currentUrlIndex", "extractedUrls", "processedData"],
    function (result) {
      const { currentUrlIndex, extractedUrls, processedData = [] } = result;
      if (!extractedUrls || currentUrlIndex === undefined) {
        throw new Error("Failed to get current URL from storage");
      }
      let currentEntry = extractedUrls[currentUrlIndex];

      // 发送进度更新消息
      chrome.runtime.sendMessage({
        action: "PROGRESS_UPDATE",
        data: {
          currentIndex: currentUrlIndex,
          totalUrls: extractedUrls.length,
          currentUrl: currentEntry.url,
          stage: "overview",
          status: `正在获取 ${currentEntry.url} 的概览数据（第1步/共3步）`,
        },
      });

      // 处理 URL，移除 https:// 和 www. 前缀
      const processedUrl = currentEntry.url
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "");
      console.log("SEMRUSH: 🔗 Processed URL for next step:", processedUrl);

      // 存储第一步的数据
      const stepOneData = {
        index: currentUrlIndex,
        url: currentEntry.url,
        expectedCountry: currentEntry.country,
        actualCountry: country,
      };

      // 更新或添加数据到缓存
      const updatedData = [...processedData];
      const existingIndex = updatedData.findIndex(
        (item) => item.index === currentUrlIndex
      );
      if (existingIndex >= 0) {
        updatedData[existingIndex] = {
          ...updatedData[existingIndex],
          ...stepOneData,
        };
      } else {
        updatedData.push(stepOneData);
      }

      // 保存更新后的数据
      chrome.storage.local.set({ processedData: updatedData }, function () {
        console.log("SEMRUSH: 💾 Step 1 data saved:", stepOneData);

        //读取缓存中的usingDomain开始跳转第二个界面
        chrome.storage.local.get(["usingDomain"], function (result) {
          const usingDomain = result.usingDomain;
          if (!usingDomain) {
            throw new Error("No domain found in cache");
          }
          // 使用 getCountryCode 获取国家代码
          const countryCode = country.toLowerCase();
          window.location.href = `${usingDomain}/analytics/organic/positions/?filter={"search":"","volume":"","positions":"","positionsType":"all","serpFeatures":null,"intent":["commercial","transactional"],"kd":"","advanced":{}}&db=${countryCode}&q=${processedUrl}&searchType=domain`;
        });
      });
    }
  );
}

// 在域名概览中获取 最大流量国家 没有指定国家的前提
function stepOneGetDom(countryElement) {
  try {
    const country = countryElement
      ? countryElement.textContent.trim()
      : "Not found";

    console.log("SEMRUSH: 最大流量国家:", country);

    // 如果任一元素未找到，抛出错误
    if (country === "Not found") {
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
        let currentEntry = extractedUrls[currentUrlIndex];

        // 发送进度更新消息
        chrome.runtime.sendMessage({
          action: "PROGRESS_UPDATE",
          data: {
            currentIndex: currentUrlIndex,
            totalUrls: extractedUrls.length,
            currentUrl: currentEntry.url,
            stage: "overview",
            status: `正在获取 ${currentEntry.url} 的概览数据（第1步/共3步）`,
          },
        });

        // 处理 URL，移除 https:// 和 www. 前缀
        const processedUrl = currentEntry.url
          .replace(/^https?:\/\//, "")
          .replace(/^www\./, "");
        console.log("SEMRUSH: 🔗 Processed URL for next step:", processedUrl);

        // 存储第一步的数据
        const stepOneData = {
          index: currentUrlIndex,
          url: currentEntry.url,
          expectedCountry: currentEntry.country,
          actualCountry: country,
        };

        // 更新或添加数据到缓存
        const updatedData = [...processedData];
        const existingIndex = updatedData.findIndex(
          (item) => item.index === currentUrlIndex
        );
        if (existingIndex >= 0) {
          updatedData[existingIndex] = {
            ...updatedData[existingIndex],
            ...stepOneData,
          };
        } else {
          updatedData.push(stepOneData);
        }

        // 保存更新后的数据
        chrome.storage.local.set({ processedData: updatedData }, function () {
          console.log("SEMRUSH: 💾 Step 1 data saved:", stepOneData);

          //读取缓存中的usingDomain开始跳转第二个界面
          chrome.storage.local.get(["usingDomain"], function (result) {
            const usingDomain = result.usingDomain;
            if (!usingDomain) {
              throw new Error("No domain found in cache");
            }
            // 使用 getCountryCode 获取国家代码
            const countryCode =
              getCountryCode(country) || country.toLowerCase();
            window.location.href = `${usingDomain}/analytics/organic/positions/?filter={"search":"","volume":"","positions":"","positionsType":"all","serpFeatures":null,"intent":["commercial","transactional"],"kd":"","advanced":{}}&db=${countryCode}&q=${processedUrl}&searchType=domain`;
          });
        });
      }
    );
  } catch (error) {
    console.error("SEMRUSH: ❌ Error getting DOM elements:", error);
    return null;
  }
}

function stepThreeGetDom() {
  console.log("SEMRUSH: 🚀 Starting step three - checking next URL");

  // 发送第三步开始的进度更新
  chrome.storage.local.get(
    ["currentUrlIndex", "extractedUrls"],
    function (result) {
      const { currentUrlIndex, extractedUrls } = result;
      if (currentUrlIndex !== undefined && extractedUrls) {
        const currentEntry = extractedUrls[currentUrlIndex];
        chrome.runtime.sendMessage({
          action: "PROGRESS_UPDATE",
          data: {
            currentIndex: currentUrlIndex,
            totalUrls: extractedUrls.length,
            currentUrl: currentEntry.url,
            currentCountry: currentEntry.country,
            stage: "final",
            status: `正在进行最终检查（第3步/共3步）`,
          },
        });
      }
    }
  );

  console.log("SEMRUSH: welcome to the last step");

  // 创建一个Promise来处理数据获取
  const dataPromise = new Promise((resolve) => {
    // 立即开始监听DOM变化
    const observer = new MutationObserver((mutations) => {
      const bottomElement = document.querySelector(
        'div[data-at="br-vs-nonbr-legend"]'
      );
      const keywordsSection = document.querySelector(
        'section[data-at="keywords_by_intent"]'
      );
      const topElement = document.querySelector('div[data-at="do-summary-ot"]');

      if (bottomElement && keywordsSection && topElement) {
        // 检查元素是否在视口中可见
        const rect = bottomElement.getBoundingClientRect();
        const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;

        if (isVisible) {
          console.log("SEMRUSH: ✅ All required elements found and visible");
          observer.disconnect();
          getDoms01((data) => {
            resolve(data);
          });
        }
      }
    });

    // 配置观察选项
    const config = {
      childList: true,
      subtree: true,
      attributes: true,
    };

    // 开始观察
    observer.observe(document.body, config);
    console.log("SEMRUSH: 🔄 Started observing DOM changes");

    // 开始滚动过程
    let scrollAttempts = 0;
    const maxScrollAttempts = 12;
    const scrollStep = 120;
    const scrollInterval = 800;

    const checkElements = () => {
      const bottomElement = document.querySelector(
        'div[data-at="br-vs-nonbr-legend"]'
      );
      const keywordsSection = document.querySelector(
        'section[data-at="keywords_by_intent"]'
      );
      const topElement = document.querySelector('div[data-at="do-summary-ot"]');

      if (bottomElement && keywordsSection && topElement) {
        // 检查元素是否在视口中可见
        const rect = bottomElement.getBoundingClientRect();
        const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;

        if (isVisible) {
          console.log("SEMRUSH: ✅ All required elements found and visible");
          return true;
        }
      }
      return false;
    };

    const scrollDown = () => {
      // 检查是否达到最大滚动次数或元素都可见
      if (scrollAttempts >= maxScrollAttempts) {
        console.log("SEMRUSH: ⚠️ Max scroll attempts reached");
        return;
      }

      // 检查元素是否都可见
      if (checkElements()) {
        console.log("SEMRUSH: ✅ All elements are visible, stopping scroll");
        return;
      }

      window.scrollBy({
        top: scrollStep,
        behavior: "smooth",
      });

      scrollAttempts++;
      console.log(
        `SEMRUSH: 📜 Scroll attempt ${scrollAttempts}/${maxScrollAttempts}`
      );

      // 继续下一次滚动
      setTimeout(scrollDown, scrollInterval);
    };

    // 开始滚动
    setTimeout(scrollDown, 1000);
  });

  // 处理数据获取完成后的操作
  dataPromise.then((data) => {
    chrome.storage.local.get(
      ["currentUrlIndex", "processedData", "extractedUrls"],
      function (result) {
        const {
          currentUrlIndex,
          processedData = [],
          extractedUrls = [],
        } = result;

        // 更新当前URL的数据
        const updatedData = [...processedData];
        const currentDataIndex = updatedData.findIndex(
          (item) => item.index === currentUrlIndex
        );

        if (currentDataIndex >= 0) {
          updatedData[currentDataIndex] = {
            ...updatedData[currentDataIndex],
            ...data,
          };

          console.log("SEMRUSH: 更新后的数据:", updatedData);

          // 保存更新后的数据
          chrome.storage.local.set({ processedData: updatedData }, function () {
            console.log(
              "SEMRUSH: 💾 Step 3 data saved for index:",
              currentUrlIndex
            );
            console.log(
              "SEMRUSH: 📊 Current data:",
              updatedData[currentDataIndex]
            );

            // 检查是否还有下一个URL需要处理
            const nextIndex = currentUrlIndex + 1;
            if (nextIndex < extractedUrls.length) {
              // 更新索引并处理下一个URL
              chrome.storage.local.set(
                { currentUrlIndex: nextIndex },
                function () {
                  console.log(
                    "SEMRUSH: ⏭️ Moving to next URL, index:",
                    nextIndex
                  );
                  const nextEntry = extractedUrls[nextIndex];
                  //读取缓存中的usingDomain开始跳转界面
                  chrome.storage.local.get(["usingDomain"], function (result) {
                    const usingDomain = result.usingDomain;
                    if (!usingDomain) {
                      throw new Error("No domain found in cache");
                    }
                    window.location.href = `${usingDomain}/analytics/overview/?q=${nextEntry.url}&protocol=https&searchType=domain`;
                  });
                }
              );
            } else {
              // 所有URL都处理完成
              console.log("SEMRUSH: ✅ All URLs processed!");
              console.log(
                "SEMRUSH: 📊 Final processed data:",
                JSON.stringify(updatedData, null, 2)
              );

              // 发送完成消息给popup
              chrome.runtime.sendMessage({
                action: "PROCESSING_COMPLETE",
                data: {
                  processedUrls: processedData.length,
                  totalUrls: extractedUrls.length,
                  finalData: processedData,
                  status: "所有数据处理完成",
                },
              });
            }
          });
        } else {
          console.error(
            "SEMRUSH: ❌ No matching data found for current index:",
            currentUrlIndex
          );
        }
      }
    );
  });
}

function stepTwoGetDom() {
  console.log("SEMRUSH: 🚀 Starting to observe positions DOM changes");

  // 获取当前URL信息用于进度更新
  chrome.storage.local.get(
    ["currentUrlIndex", "extractedUrls"],
    function (result) {
      const { currentUrlIndex, extractedUrls } = result;
      if (currentUrlIndex !== undefined && extractedUrls) {
        const currentEntry = extractedUrls[currentUrlIndex];
        chrome.runtime.sendMessage({
          action: "PROGRESS_UPDATE",
          data: {
            currentIndex: currentUrlIndex,
            totalUrls: extractedUrls.length,
            currentUrl: currentEntry.url,
            currentCountry: currentEntry.country,
            stage: "positions",
            status: `正在获取关键词数据（第2步/共3步）`,
          },
        });
      }
    }
  );

  // 创建观察者
  const observer = new MutationObserver((mutations) => {
    // 检查是否存在目标元素集合
    const fatherElements = document.querySelectorAll(
      "h3.___SRow_a2h7d-red-team"
    );

    if (fatherElements && fatherElements.length > 0) {
      console.log("SEMRUSH: 🎯 Found target elements:", fatherElements.length);

      // 添加200ms延迟
      setTimeout(() => {
        // 获取前5个元素的数据（如果存在的话）
        const keywords = [];
        const elementsToProcess = Math.min(10, fatherElements.length);

        for (let i = 0; i < elementsToProcess; i++) {
          try {
            const element = fatherElements[i];

            // 获取关键字（使用name属性）
            const keywordElement = element.querySelector(
              "span.___SText_pr68d-red-team"
            );
            const keyword = keywordElement?.textContent.trim() || "Not found";

            // 通过name属性获取流量和搜索量
            const trafficElement = element.querySelector('div[name="traffic"]');
            const searchVolumeElement =
              element.querySelector('div[name="volume"]');

            // 获取意图 - 使用属性选择器模糊匹配
            const intentElements = element.querySelectorAll(
              'div[data-at^="intent-badge-"]'
            );

            // 获取KD
            const kdElement = element.querySelector('[data-at="kd-value"]');

            const kd = kdElement?.textContent.trim() || "Not found";

            const intents = Array.from(intentElements)
              .map((el) => el.textContent.trim())
              .join("&");

            const intent = intents || "Not found";

            const traffic = trafficElement?.textContent.trim() || "Not found";
            const volume =
              searchVolumeElement?.textContent.trim() || "Not found";

            // 添加到数组，包含意图信息
            keywords.push({
              keyword: keyword,
              intent: intent,
              traffic: traffic,
              volume: volume,
              kd: kd,
            });
          } catch (error) {
            console.error(
              `SEMRUSH: ❌ Error processing element ${i + 1}:`,
              error
            );
          }
        }

        // 如果成功获取到数据，更新存储
        if (keywords.length > 0) {
          // 获取当前存储的数据
          chrome.storage.local.get(
            ["currentUrlIndex", "processedData", "extractedUrls"],
            function (result) {
              const {
                currentUrlIndex,
                processedData = [],
                extractedUrls = [],
              } = result;

              // 更新当前URL的数据
              const updatedData = [...processedData];
              const currentDataIndex = updatedData.findIndex(
                (item) => item.index === currentUrlIndex
              );

              if (currentDataIndex >= 0) {
                updatedData[currentDataIndex] = {
                  ...updatedData[currentDataIndex],
                  commercialAndTransactionalKeywords: keywords,
                };

                // 保存更新后的数据
                chrome.storage.local.set(
                  { processedData: updatedData },
                  function () {
                    console.log(
                      "SEMRUSH: 💾 Step 2 data saved for index:",
                      currentUrlIndex
                    );
                    console.log(
                      "SEMRUSH: 📊 Current data:",
                      updatedData[currentDataIndex]
                    );

                    // 获取当前数据中的国家和URL
                    const currentData = updatedData[currentDataIndex];
                    const country = currentData.actualCountry.toLowerCase();
                    const processedUrl = currentData.url
                      .replace(/^https?:\/\//, "")
                      .replace(/^www\./, "");

                    // 读取缓存中的usingDomain开始跳转界面
                    chrome.storage.local.get(
                      ["usingDomain"],
                      function (result) {
                        const usingDomain = result.usingDomain;
                        if (!usingDomain) {
                          throw new Error("No domain found in cache");
                        }
                        window.location.href = `${usingDomain}/analytics/overview/?db=${country}&q=${processedUrl}&protocol=https&searchType=domain`;
                      }
                    );

                    // 发送进度更新消息
                    chrome.runtime.sendMessage({
                      action: "PROGRESS_UPDATE",
                      data: {
                        currentIndex: currentUrlIndex,
                        totalUrls: extractedUrls.length,
                        currentUrl: processedUrl,
                        stage: "complete",
                        status: `已完成数据获取`,
                        processedData: updatedData[currentDataIndex],
                      },
                    });
                  }
                );
              } else {
                console.error(
                  "SEMRUSH: ❌ No matching data found for current index:",
                  currentUrlIndex
                );
              }
            }
          );

          // 停止观察
          observer.disconnect();
          console.log("SEMRUSH: 🛑 Stopped observing DOM changes");
        }
      }, 200); // 添加200ms延迟
    }
  });

  // 配置观察选项
  const config = {
    childList: true,
    subtree: true,
  };

  // 开始观察
  observer.observe(document.body, config);
  console.log("SEMRUSH: 🔄 Started observing DOM for positions data");
}
// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("SEMRUSH: 📨 Content script received message:", message);

  switch (message.action) {
    case "START_PROCESSING":
      console.log("SEMRUSH: 🚀 Starting URL processing in content script");
      handleStartProcessing();
      break;

    // 可以添加其他消息处理...
    default:
      console.log("SEMRUSH: ⚠️ Unknown message action:", message.action);
  }
});

// 处理开始处理的逻辑
function handleStartProcessing() {
  try {
    console.log("SEMRUSH: 🚀 Starting URL processing in content script");

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

        // 获取当前要处理的URL和country
        const currentEntry = extractedUrls[currentUrlIndex];
        console.log("SEMRUSH: 📍 Current URL index:", currentUrlIndex);
        console.log("SEMRUSH: 🔗 Current entry:", currentEntry);

        // 首先去往域名概览
        chrome.storage.local.get(["usingDomain"], function (result) {
          const usingDomain = result.usingDomain;
          if (!usingDomain) {
            throw new Error("No domain found in cache");
          }
          // 前往域名概览
          window.location.href = `${usingDomain}/analytics/overview/?q=${currentEntry.url}&protocol=https&searchType=domain`;
        });

        // 向 popup 发送确认消息
        chrome.runtime.sendMessage({
          action: "CONTENT_SCRIPT_READY",
          data: {
            currentIndex: currentUrlIndex,
            totalUrls: extractedUrls.length,
            currentUrl: currentEntry.url,
            currentCountry: currentEntry.country,
          },
        });
      }
    );
  } catch (error) {
    console.error("SEMRUSH: ❌ Error in content script:", error);
    // 向 popup 发送错误消息
    chrome.runtime.sendMessage({
      action: "CONTENT_SCRIPT_ERROR",
      error: error.message,
    });
  }
}
