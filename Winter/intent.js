function getIntentData() {
  console.log("SEMRUSH: 📄 getIntentData");

  var observer = new MutationObserver(function (mutations) {
    const triggerElement = document.getElementById("igc-ui-kit-ri-trigger");
    const dataCurrentElement = document.querySelector(
      'div[data-at="display-currency"]'
    );
    if (triggerElement && dataCurrentElement) {
      observer.disconnect();

      triggerElement.click();

      setTimeout(() => {
        startToSelectOptions();
      }, 1000);
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

function startToSelectOptions() {
  var observer = new MutationObserver(function (mutations) {
    const applyBtn = document.querySelector('button[data-at="qf-apply"]');
    const businessIntentBtn = document.getElementById("igc-ui-kit-ri-option-2");
    const transactionIntentBtn = document.getElementById(
      "igc-ui-kit-ri-option-3"
    );
    if (applyBtn && businessIntentBtn && transactionIntentBtn) {
      sequentialClick([businessIntentBtn, transactionIntentBtn, applyBtn]).then(
        () => {
          setTimeout(() => {
            startGetDom();
          }, 1000);
        }
      );

      console.log("SEMRUSH: 📄 点击应用按钮");

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

function startGetDom() {
  var observer = new MutationObserver(function (mutations) {
    // 检查是否存在目标元素集合
    const fatherElements = document.querySelectorAll(
      "h3.___SRow_a2h7d-red-team"
    );

    if (fatherElements && fatherElements.length > 0) {
      console.log("SEMRUSH: 🎯 Found target elements:", fatherElements.length);
      observer.disconnect();
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

        console.log("SEMRUSH: 📄 keywords", keywords);
        saveDataToStorage(keywords);
      }, 2000);
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

function saveDataToStorage(data) {
  // 将overviewResult 存储到当前域名地缓存中
  chrome.storage.local.get(
    ["processingTableData", "currentUrl", "extractedUrls", "usingDomain"],
    function (result) {
      const processingTableData = result.processingTableData || {};
      const currentUrl = result.currentUrl || "";
      const extractedUrls = result.extractedUrls || [];
      const usingDomain = result.usingDomain || "";

      const currentData = processingTableData[currentUrl];
      chrome.storage.local.set(
        {
          extractedUrls: extractedUrls.map((item) =>
            item.url === currentUrl ? { ...item, status: "processed" } : item
          ),
          processingTableData: {
            ...processingTableData,
            [`${currentUrl}`]: {
              ...currentData,
              commercialIntentKeywords: data,
            },
          },
        },
        function () {
          // 获取extractedUrls中已经处理的数量
          const processedCount = extractedUrls.filter(
            (item) => item.status === "processed"
          ).length;
          // 如果processedCount是10的倍数，则跳转到projects页面
          if (processedCount > 0) {
            let delayTime = processedCount % 10 === 0 ? 60 * 1000 : 10 * 1000;

            // 如果是五十的倍数，则延迟五分钟
            if (processedCount % 50 === 0 && processedCount > 0) {
              delayTime = 5 * 60 * 1000;
            }

            console.log("SEMRUSH: 📄 跳转到projects页面", delayTime);

            setTimeout(() => {
              window.location.href = `${usingDomain}/projects/`;
            }, delayTime);
          } else {
            setTimeout(() => {
              window.location.href = `${usingDomain}/projects/`;
            }, 10 * 1000);
          }
        }
      );
    }
  );
}

/**
 * 顺序点击函数 - 按顺序依次点击元素，每次点击之间有延迟
 * @param {Array} elements - 要点击的元素数组，可以是DOM元素、选择器字符串或获取元素的函数
 * @param {number} delayBetweenClicks - 每次点击之间的延迟时间（毫秒）
 * @param {Object} options - 配置选项
 * @param {boolean} options.stopOnError - 是否在遇到错误时停止（默认：false）
 * @param {boolean} options.verbose - 是否输出详细日志（默认：true）
 * @returns {Promise} 点击序列完成后的Promise
 */
function sequentialClick(elements, delayBetweenClicks = 1000, options = {}) {
  // 默认选项
  const config = {
    stopOnError: false, // 遇到错误时是否停止
    verbose: true, // 是否输出详细日志
    ...options,
  };

  // 日志函数
  const log = (message) => {
    if (config.verbose) {
      console.log(`SEMRUSH: 🔄 ${message}`);
    }
  };

  // 点击单个元素的函数
  const clickElement = async (elementOrSelector, index) => {
    try {
      // 解析元素（可以是DOM元素、选择器字符串或函数）
      let element = elementOrSelector;

      // 如果是函数，执行函数获取元素
      if (typeof elementOrSelector === "function") {
        element = elementOrSelector();
      }

      // 如果是选择器字符串，查找元素
      if (typeof element === "string") {
        element = document.querySelector(element);
      }

      // 检查元素是否存在
      if (!element) {
        throw new Error(`元素不存在: ${elementOrSelector}`);
      }

      // 检查元素是否可点击
      if (element.disabled) {
        throw new Error(`元素已禁用: ${elementOrSelector}`);
      }

      // 记录点击前的日志
      log(
        `点击元素 #${index + 1}: ${element.id || element.tagName || "未知元素"}`
      );

      // 执行点击
      element.click();

      // 记录成功日志
      log(`元素 #${index + 1} 点击成功`);

      return true;
    } catch (error) {
      // 记录错误日志
      console.error(`SEMRUSH: ❌ 点击元素 #${index + 1} 失败:`, error.message);

      // 如果设置了遇到错误停止，则抛出错误
      if (config.stopOnError) {
        throw error;
      }

      return false;
    }
  };

  // 创建延迟函数
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // 开始执行点击序列
  log(`开始顺序点击 ${elements.length} 个元素，间隔 ${delayBetweenClicks}ms`);

  // 使用reduce构建Promise链
  return elements
    .reduce((chain, element, index) => {
      return chain
        .then(() => clickElement(element, index))
        .then(() => {
          // 最后一个元素点击后不需要延迟
          if (index < elements.length - 1) {
            log(`等待 ${delayBetweenClicks}ms 后点击下一个元素...`);
            return delay(delayBetweenClicks);
          }
        });
    }, Promise.resolve())
    .then(() => {
      log(`所有 ${elements.length} 个元素点击完成`);
      return true;
    })
    .catch((error) => {
      console.error(`SEMRUSH: ❌ 顺序点击过程中出错:`, error.message);
      throw error;
    });
}
