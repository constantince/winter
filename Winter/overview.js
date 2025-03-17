function waitUntilElementIsVisible() {
  // 设置超时定时器 界面2分钟后没跑完丢弃数据
  setTimeout(() => {
    console.log("SEMRUSH: ⚠️ Timeout reached waiting for srf-skip-to-content");
    // 丢弃无用的数据
    forceUpdateCacheStatus();
  }, 2 * 60 * 1000);

  const observer = new MutationObserver((mutations) => {
    const distributionTable = document.querySelector(
      'div[data-at="country-distribution-table"]'
    );
    const selectDatabasePills = document.querySelector(
      "div[data-at='database-pills']"
    );
    if (selectDatabasePills && distributionTable) {
      // clearTimeout(timeoutId);
      observer.disconnect();
      const titleElement = distributionTable.querySelector(
        'span[data-at="db-title"]'
      );
      if (titleElement) {
        // 从extractedUrls中找到对应的enCountry
        chrome.storage.local.get(["extractedUrls"], function (result) {
          const extractedUrls = result.extractedUrls || [];
          const currentUrl = findCurrentUrl();
          const currentData = extractedUrls.find(
            (item) => item.url === currentUrl
          );
          clickTheRightCountry(
            currentData.enCountry || titleElement.textContent.trim()
          );

          setTimeout(() => {
            getOverviewData();
          }, 1000);
        });
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function getOverviewData() {
  //country-distribution-table
  console.log("SEMRUSH: 👀 Waiting for srf-skip-to-content element to render");

  // 设置超时定时器
  const timeoutId = setTimeout(() => {
    console.log("SEMRUSH: ⚠️ Timeout reached waiting for srf-skip-to-content");
    // 丢弃无用的数据
    collectDataFromKeywordsSection();
  }, 1 * 60 * 1000);

  // 创建观察者
  const observer = new MutationObserver((mutations) => {
    const fatherElement = document.querySelector(
      'div[data-at="country-distribution-table"]'
    );

    const descriptionElement = document.querySelector(
      'div[data-at="do-summary-ot"] p[data-at="description"]'
    );

    // 没有发现数据
    if (descriptionElement) {
      observer.disconnect();
      // 丢弃无用的数据
      collectDataFromKeywordsSection();
      clearTimeout(timeoutId);
      return;
    }

    // 检查元素是否已渲染
    if (fatherElement) {
      const titleElement = fatherElement.querySelector(
        'span[data-at="db-title"]'
      );
      const trafficElement = fatherElement.querySelector(
        'div[data-at="table-row"] a[data-at="value-organicTraffic"'
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
  chrome.storage.local.get(["processingTableData"], function (result) {
    const processingTableData = result.processingTableData || {};
    const currentUrl = findCurrentUrl();
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
        oberverThePrimaryData();
      }
    );
  });
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
  scrollWithPromise(120, 1000, 1 * 60 * 1000)
    .then((message) => {
      collectDataFromKeywordsSection();
    })
    .catch((error) => {
      collectDataFromKeywordsSection();
    });
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
      'section[data-at="do-organic-keywords"] a[data-at="view-full-report"]'
    );

    console.log("SEMRUSH: 📄 bottomElement", bottomElement);
    console.log("SEMRUSH: 📄 keywordsSection", keywordsSection);
    console.log("SEMRUSH: 📄 naturalElement", naturalElement);
    console.log("SEMRUSH: 📄 viewAllButton", viewAllButton);
    if (bottomElement && keywordsSection && naturalElement && viewAllButton) {
      console.log("SEMRUSH: 📄 I see you!!!!");
      collectDataFromKeywordsSection();
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

function collectDataFromKeywordsSection() {
  let businessIntent = "";
  let transactionIntent = "";
  const grantFatherElement = document.querySelector(
    'section[data-at="keywords_by_intent"]'
  );
  if (grantFatherElement) {
    console.log("SEMRUSH: 🎯 Found keywords_by_intent section");

    const fatherElement1 = grantFatherElement.querySelector(
      'div.___SRow_1hl9u-red-team[aria-rowindex="4"]'
    );
    const fatherElement2 = grantFatherElement.querySelector(
      'div.___SRow_1hl9u-red-team[aria-rowindex="5"]'
    );

    // 获取商业意图百分比
    businessIntent =
      fatherElement1
        ?.querySelector(".___SText_xheeu-red-team")
        ?.textContent.trim() || "0%";

    console.log("SEMRUSH: 商业意图百分比:", businessIntent);

    // 获取交易意图百分比
    transactionIntent =
      fatherElement2
        ?.querySelector(".___SText_xheeu-red-team")
        ?.textContent.trim() || "0%";

    console.log("SEMRUSH: 交易意图百分比:", transactionIntent);
  }

  let naturalSearchKeywords = [];
  // 获取主要自然搜索关键词
  const grantFatherElement01 = document.querySelectorAll(
    'section[data-at="do-organic-keywords"] .___SRow_1hl9u-red-team'
  );

  if (grantFatherElement01) {
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
      const intentBadge = intentBadgeElement?.textContent.trim() || "Not found";

      naturalSearchKeywords.push({ keyword, volume, intentBadge });
    });
    console.log("SEMRUSH: 主要自然搜索关键词:", naturalSearchKeywords);
  }

  let brandRatio = "";
  let nonBrandRatio = "";
  // 获取品牌与非品牌占比
  const fatherElementBrand = document.querySelector(
    'div[data-at="br-vs-nonbr-legend"]'
  );

  if (fatherElementBrand) {
    const brandElement = fatherElementBrand?.querySelector(
      'a[data-at="value-0"]'
    );
    const nonBrandElement = fatherElementBrand?.querySelector(
      'a[data-at="value-1"]'
    );

    brandRatio = brandElement?.textContent.trim() || "Not found";
    nonBrandRatio = nonBrandElement?.textContent.trim() || "Not found";

    console.log("SEMRUSH: 品牌:", brandRatio, "非品牌:", nonBrandRatio);
  }

  const overviewResult = {
    businessIntent,
    transactionIntent,
    naturalSearchKeywords,
    brandRatio,
    nonBrandRatio,
  };

  // 将overviewResult 存储到当前域名地缓存中
  chrome.storage.local.get(["processingTableData"], function (result) {
    const processingTableData = result.processingTableData || {};
    const currentUrl = findCurrentUrl();

    const currentData = processingTableData[currentUrl] || {};
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
            'section[data-at="do-organic-keywords"] a[data-at="view-full-report"]'
          );

          if (viewAllButton) {
            viewAllButton.click();
            console.log("SEMRUSH: 📄 点击查看全部报告");
          }
        }, 1300);
      }
    );
  });
}

function scrollWithPromise(scrollAmount, intervalTime, totalDuration) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let isScrollingDown = true; // 标记当前滚动方向

    const scrollInterval = setInterval(() => {
      const currentTime = Date.now();
      const elapsedTime = currentTime - startTime;

      // 如果超出总执行时长，清除定时器并 resolve
      if (elapsedTime >= totalDuration) {
        clearInterval(scrollInterval);
        resolve("滚动完成");
        return;
      }

      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const scrollTop = document.documentElement.scrollTop;

      // 判断是否到达底部
      if (isScrollingDown && scrollTop + clientHeight >= scrollHeight) {
        isScrollingDown = false; // 到达底部，改为向上滚动
      }
      // 判断是否到达顶部
      else if (!isScrollingDown && scrollTop <= 0) {
        isScrollingDown = true; // 到达顶部，改为向下滚动
      }

      // 根据滚动方向滚动页面
      if (isScrollingDown) {
        window.scrollBy(0, scrollAmount); // 向下滚动
      } else {
        window.scrollBy(0, -scrollAmount); // 向上滚动
      }
    }, intervalTime);
  });
}

function clickTheRightCountry(country) {
  const firstDatabasePills = document.querySelectorAll(
    "div[data-at='database-pills'] button"
  )[0];

  if (country.length === 2) {
    const targetButtonElement1 = document.querySelector(
      `div[data-at='database-pills'] button[value='${country.toLowerCase()}']`
    );

    if (!targetButtonElement1) {
      const alldatabasePills = document.querySelectorAll(
        "div[data-at='database-pills'] button"
      );

      const lastDatabasePills = alldatabasePills[alldatabasePills.length - 1];

      if (lastDatabasePills) {
        lastDatabasePills.click();

        setTimeout(() => {
          const dbOption = document.querySelector(
            `#list-dbs div[value='${country.toLowerCase()}']`
          );
          // the right country is found
          if (dbOption) {
            dbOption.click();
          } else {
            firstDatabasePills.click();
          }
        }, 1000);
      } else {
        firstDatabasePills.click();
      }
    } else {
      targetButtonElement1.click();
    }
  } else {
    firstDatabasePills.click();
  }
}
