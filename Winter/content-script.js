function handleTimeout(observer) {
  console.log("SEMRUSH: ⚠️ Observer timeout reached");
  if (observer) {
    observer.disconnect();
  }

  // 获取当前尝试次数并递增
  chrome.storage.local.get(["attemptCount"], function (result) {
    const currentAttemptCount = Number(result.attemptCount || 0);
    const newAttemptCount = currentAttemptCount + 1;

    // 更新尝试次数
    chrome.storage.local.set({ attemptCount: newAttemptCount }, function () {
      console.log("SEMRUSH: 🔄 Updated attempt count to:", newAttemptCount);
      // 更新完尝试次数后再跳转，保持processingUrl参数
      window.location.href = `${FALLBACK_URL}${
        processingUrl ? `?processingUrl=${processingUrl}` : ""
      }`;
    });
  });
}

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
          window.location.href = `${domain}/analytics/organic/positions/?filter={"search":"","volume":"","positions":"","positionsType":"all","serpFeatures":null,"intent":["commercial","transactional"],"kd":"","advanced":{}}&db=${countryCode}&q=${processedUrl}&searchType=domain&processingUrl=${processingUrl}`;
        });
      });
    }
  );
}

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
            window.location.href = `${domain}/analytics/organic/positions/?filter={"search":"","volume":"","positions":"","positionsType":"all","serpFeatures":null,"intent":["commercial","transactional"],"kd":"","advanced":{}}&db=${countryCode}&q=${processedUrl}&searchType=domain&processingUrl=${processingUrl}`;
          });
        });
      }
    );
  } catch (error) {
    console.error("SEMRUSH: ❌ Error getting DOM elements:", error);
    return null;
  }
}

function stepTwoGetDom() {
  // ... existing code ...
  const nextEntry = extractedUrls[nextIndex];
  //读取缓存中的usingDomain开始跳转界面
  chrome.storage.local.get(["usingDomain"], function (result) {
    const usingDomain = result.usingDomain;
    if (!usingDomain) {
      throw new Error("No domain found in cache");
    }
    window.location.href = `${domain}/analytics/overview/?q=${nextEntry.url}&protocol=https&searchType=domain&processingUrl=${nextIndex}`;
  });
  // ... existing code ...
}

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
          window.location.href = `${usingDomain}/analytics/overview/?q=${currentEntry.url}&protocol=https&searchType=domain&processingUrl=${currentUrlIndex}`;
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
    // 向background发送错误消息
    chrome.runtime.sendMessage({
      action: "CONTENT_SCRIPT_ERROR",
      error: error.message,
    });
  }
}

function initMenyAndJump() {
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

        window.location.href = `${domain}/analytics/overview/?q=${currentEntry.url}&protocol=https&searchType=domain&processingUrl=${currentUrlIndex}`;
      } else {
        // 有对应的编码 开始第二部
        console.log("SEMRUSH: 🔗 有对应的编码", countryCode);
        setCountyAndUrlIntoStorage(countryCode);
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
}
