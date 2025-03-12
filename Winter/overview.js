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
          const databasePills = document.querySelector(
            `div[data-at='database-pills'] button[value='${country.toLowerCase()}']`
          );
          if (databasePills) {
            databasePills.click();
            console.log("SEMRUSH: 📄 点击数据库按钮");
            afterClickDatabasePills();
          }
        }
      );
    }
  );
}

function afterClickDatabasePills() {
  // 创建观察者
  const observer = new MutationObserver((mutations) => {
    const fatherElement = document.querySelector('div[data-at="primary-data"]');

    // 检查元素是否已渲染
    if (fatherElement) {
      // 开始滚动
      scrollingToBottom();
      const bottomElement = document.querySelector(
        'div[data-at="br-vs-nonbr-legend"]'
      );
      const keywordsSection = document.querySelector(
        'section[data-at="keywords_by_intent"]'
      );

      const naturalElement = document.querySelector(
        'div[data-at="top-keywords-table"]'
      );
      if (bottomElement && keywordsSection && naturalElement) {
        console.log("SEMRUSH: 📄 I see you!!!!");
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
}

function scrollingToBottom() {
  // 开始滚动过程
  let scrollAttempts = 0;
  const maxScrollAttempts = 10000;
  const scrollStep = 120;
  let isScrollingDown = true; // 控制滚动方向

  const isAtBottom = () => {
    return (
      window.innerHeight + window.pageYOffset >=
      document.documentElement.scrollHeight - 10
    );
  };

  const isAtTop = () => {
    return window.pageYOffset <= 10;
  };

  const performScroll = () => {
    if (shouldStopScroll) {
      if (scrollIntervalId) {
        clearInterval(scrollIntervalId);
      }
      return;
    }

    // 检查是否达到最大滚动次数
    if (scrollAttempts >= maxScrollAttempts) {
      console.log("SEMRUSH: ⚠️ Max scroll attempts reached");
      if (scrollIntervalId) {
        clearInterval(scrollIntervalId);
      }
      return;
    }

    // 根据当前位置决定滚动方向
    if (isScrollingDown && isAtBottom()) {
      // 到达底部，改变方向
      isScrollingDown = false;
      console.log("SEMRUSH: 🔄 Reached bottom, scrolling up");
    } else if (!isScrollingDown && isAtTop()) {
      // 到达顶部，改变方向
      isScrollingDown = true;
      console.log("SEMRUSH: 🔄 Reached top, scrolling down");
    }

    // 执行滚动
    window.scrollBy({
      top: isScrollingDown ? scrollStep : -scrollStep,
      behavior: "instant", // 使用 instant 来确保立即滚动
    });

    scrollAttempts++;
    console.log(
      `SEMRUSH: 📜 Scroll attempt ${scrollAttempts}/${maxScrollAttempts} (${
        isScrollingDown ? "⬇️" : "⬆️"
      })`
    );
  };

  // 开始定时滚动
  console.log("SEMRUSH: 🔄 Starting scroll interval");
  scrollIntervalId = setInterval(performScroll, 2000);
}
