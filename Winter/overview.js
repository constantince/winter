function getOverviewData() {
  //country-distribution-table
  console.log("SEMRUSH: 👀 Waiting for srf-skip-to-content element to render");

  // 设置超时定时器
  const timeoutId = setTimeout(() => {
    console.log("SEMRUSH: ⚠️ Timeout reached waiting for srf-skip-to-content");
    if (observer) {
      observer.disconnect();
    }
  }, OBSERVER_TIMEOUT);

  // 创建观察者
  const observer = new MutationObserver((mutations) => {
    const fatherElement = document.querySelector(
      'div[data-at="country-distribution-table"]'
    );

    // 检查元素是否已渲染
    if (fatherElement) {
      const titleElement = fatherElement.querySelector(
        'span[data-at="db-title"]'
      );
      const trafficElement = fatherElement.querySelector(
        'div[data-at="table-row"] div[name="organicTraffic"]'
      );

      if (titleElement && trafficElement) {
        // 清除超时定时器
        clearTimeout(timeoutId);
        // 处理找到的元素
        processSkipToContentElementInOverview(titleElement, trafficElement);

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
    attributes: true,
  };

  // 开始观察
  observer.observe(document.body, config);
  console.log("SEMRUSH: 📄 getOverviewData");
}

function processSkipToContentElementInOverview(titleElement, trafficElement) {
  console.log("SEMRUSH: 📄 processSkipToContentElement");

  const country = titleElement.textContent || "No title";
  const traffic = trafficElement.textContent || "No traffic";
  // 给使用css 使用console的内嵌语法 %c 给 console打印出来的title和traffic标红
  console.log("%cSEMRUSH: 📄 国家 " + country, "color: red;");
  console.log("%cSEMRUSH: 📄 流量 " + traffic, "color: red;");

  // 获取当前缓存中的currentUrl
  chrome.storage.local.get(
    ["currentUrl", "processingTableData"],
    function (result) {
      const currentUrl = result.currentUrl || "";
      const processingTableData = result.processingTableData || {};
      const newProcessingTableData = processingTableData[currentUrl] || {};
      newProcessingTableData.country = country;
      newProcessingTableData.traffic = traffic;
      chrome.storage.local.set(
        {
          processingTableData: {
            ...processingTableData,
            [currentUrl]: newProcessingTableData,
          },
        },
        function () {
          let databasePills = document.querySelector(
            `div[data-at='database-pills'] button[value='${country.toLowerCase()}']`
          );

          if (!databasePills) {
            databasePills = document.querySelectorAll(
              "div[data-at='database-pills'] button"
            )[1];
          }

          if (databasePills) {
            databasePills.click();
            console.log("SEMRUSH: 📄 点击数据库按钮");
            oberverThePrimaryData();
          }
        }
      );
    }
  );
}

function oberverThePrimaryData() {
  // 创建观察者
  const observer = new MutationObserver((mutations) => {
    const fatherElement = document.querySelector('div[data-at="primary-data"]');
    console.log("SEMRUSH: 📄 fatherElement", fatherElement);
    // 检查元素是否已渲染
    if (fatherElement) {
      afterClickDatabasePills();
      // 停止观察
      observer.disconnect();
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
}

function afterClickDatabasePills() {
  // 开始滚动
  const scroller = scrollingToBottom();
  // 创建观察者
  const observer = new MutationObserver((mutations) => {
    // 检查元素是否已渲染

    const bottomElement = document.querySelector(
      'div[data-at="br-vs-nonbr-legend"]'
    );
    const keywordsSection = document.querySelector(
      'section[data-at="keywords_by_intent"]'
    );

    const naturalElement = document.querySelector(
      'div[data-at="top-keywords-table"]'
    );

    const viewAllButton = document.querySelector(
      'a[data-at="view-full-report"]'
    );

    console.log("SEMRUSH: 📄 bottomElement", bottomElement);
    console.log("SEMRUSH: 📄 keywordsSection", keywordsSection);
    console.log("SEMRUSH: 📄 naturalElement", naturalElement);
    console.log("SEMRUSH: 📄 viewAllButton", viewAllButton);
    if (bottomElement && keywordsSection && naturalElement && viewAllButton) {
      console.log("SEMRUSH: 📄 I see you!!!!");
      collectDataFromKeywordsSection(scroller);
      // 停止观察
      observer.disconnect();
      console.log("SEMRUSH: 🛑 Stopped observing DOM changes");
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
}

function collectDataFromKeywordsSection(scroller) {
  const grantFatherElement = document.querySelector(
    'section[data-at="keywords_by_intent"]'
  );

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
    const volumeElement = element.querySelector("div[data-at='value-volume']");

    const keyword = keywordElement?.textContent.trim() || "Not found";
    const volume = volumeElement?.textContent.trim() || "Not found";
    const intentBadge = intentBadgeElement?.textContent.trim() || "Not found";

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

  scroller.stop();

  const overviewResult = {
    businessIntent,
    transactionIntent,
    naturalSearchKeywords,
    brandRatio,
    nonBrandRatio,
  };

  // 将overviewResult 存储到当前域名地缓存中
  chrome.storage.local.get(
    ["processingTableData", "currentUrl"],
    function (result) {
      const processingTableData = result.processingTableData || {};
      const currentUrl = result.currentUrl || "";

      const currentData = processingTableData[currentUrl];
      chrome.storage.local.set(
        {
          processingTableData: {
            ...processingTableData,
            [`${currentUrl}`]: {
              ...currentData,
              ...overviewResult,
            },
          },
        },
        function () {
          setTimeout(() => {
            // 触发搜索按钮点击
            const viewAllButton = document.querySelector(
              'a[data-at="view-full-report"]'
            );

            if (viewAllButton) {
              viewAllButton.click();
              console.log("SEMRUSH: 📄 点击查看全部报告");
            }
          }, 1300);
        }
      );
    }
  );
}

// ... existing code ...

// 滚动函数：缓慢向下滚动页面
function smoothScroll(options = {}) {
  // 默认配置
  const config = {
    speed: 1.5, // 滚动速度 (像素/帧)
    interval: 20, // 滚动间隔 (毫秒)
    maxScrollTime: 60000, // 最大滚动时间 (毫秒)，防止无限滚动
    pauseOnUserScroll: true, // 当用户手动滚动时暂停
  };

  // 合并用户配置
  Object.assign(config, options);

  // 滚动状态
  const scrollState = {
    isScrolling: false, // 是否正在滚动
    scrollTimerId: null, // 计时器ID
    startTime: 0, // 开始时间
    lastScrollTop: 0, // 上次滚动位置
    totalScrolled: 0, // 已滚动总距离
  };

  // 开始滚动
  function startScrolling() {
    if (scrollState.isScrolling) return;

    console.log("SEMRUSH: 🔄 开始平滑滚动");
    scrollState.isScrolling = true;
    scrollState.startTime = Date.now();
    scrollState.lastScrollTop = window.scrollY;
    scrollState.totalScrolled = 0;

    // 设置滚动间隔
    scrollState.scrollTimerId = setInterval(performScroll, config.interval);

    // 监听用户滚动
    if (config.pauseOnUserScroll) {
      window.addEventListener("wheel", handleUserScroll);
      window.addEventListener("touchmove", handleUserScroll);
    }

    // 设置最大滚动时间
    setTimeout(() => {
      if (scrollState.isScrolling) {
        stopScrolling();
        console.log(
          `SEMRUSH: ⏱️ 滚动已达到最大时间限制 (${
            config.maxScrollTime / 1000
          }秒)`
        );
      }
    }, config.maxScrollTime);
  }

  // 停止滚动
  function stopScrolling() {
    if (!scrollState.isScrolling) return;

    console.log(
      `SEMRUSH: 🛑 停止滚动，总共滚动了 ${scrollState.totalScrolled.toFixed(
        0
      )} 像素`
    );
    scrollState.isScrolling = false;

    // 清除定时器
    clearInterval(scrollState.scrollTimerId);

    // 移除事件监听器
    if (config.pauseOnUserScroll) {
      window.removeEventListener("wheel", handleUserScroll);
      window.removeEventListener("touchmove", handleUserScroll);
    }
  }

  // 执行滚动
  function performScroll() {
    if (!scrollState.isScrolling) return;

    // 检查是否到达页面底部
    const scrollHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    const windowHeight = window.innerHeight;
    const scrollTop = window.scrollY;

    // 如果已经到达底部，停止滚动
    if (scrollTop + windowHeight >= scrollHeight - 5) {
      console.log("SEMRUSH: 📜 已到达页面底部，停止滚动");
      stopScrolling();
      return;
    }

    // 计算滚动距离
    const scrollDistance = config.speed;

    // 执行滚动
    window.scrollBy({
      top: scrollDistance,
      behavior: "auto", // 使用'auto'而不是'smooth'以避免滚动叠加
    });

    // 更新状态
    scrollState.totalScrolled += scrollDistance;

    // 每滚动100像素记录一次日志
    if (
      Math.floor(scrollState.totalScrolled / 100) >
      Math.floor((scrollState.totalScrolled - scrollDistance) / 100)
    ) {
      console.log(
        `SEMRUSH: 📜 已滚动 ${scrollState.totalScrolled.toFixed(0)} 像素`
      );
    }

    // 检查用户是否手动滚动了页面
    if (
      config.pauseOnUserScroll &&
      window.scrollY !== scrollState.lastScrollTop + scrollDistance
    ) {
      console.log("SEMRUSH: 👆 检测到用户滚动，暂停自动滚动");
      stopScrolling();
      return;
    }

    // 更新上次滚动位置
    scrollState.lastScrollTop = window.scrollY;
  }

  // 处理用户滚动
  function handleUserScroll() {
    if (scrollState.isScrolling) {
      console.log("SEMRUSH: 👆 检测到用户滚动，暂停自动滚动");
      stopScrolling();
    }
  }

  // 返回控制接口
  return {
    start: startScrolling,
    stop: stopScrolling,
    isScrolling: () => scrollState.isScrolling,
    getScrolled: () => scrollState.totalScrolled,
  };
}

// 在窗口加载后调用滚动函数示例
function scrollingToBottom() {
  const scroller = smoothScroll({
    speed: 220, // 每次滚动2像素
    interval: 1000, // 每30毫秒滚动一次
  });

  console.log("SEMRUSH: 🔄 开始向下滚动页面");
  scroller.start();
  return scroller;
  // 如果需要在某个条件下停止滚动
  // setTimeout(() => scroller.stop(), 5000); // 5秒后停止
}
