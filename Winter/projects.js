function searchInput() {
  console.log("SEMRUSH: 👀 Waiting for srf-skip-to-content element to render");

  //设置超时定时器 界面2分钟后没跑完丢弃数据
  setTimeout(() => {
    console.log("SEMRUSH: ⚠️ Timeout reached waiting for srf-skip-to-content");
    forceUpdateCacheStatus();
  }, 2 * 60 * 1000);

  // 创建观察者
  const observer = new MutationObserver((mutations) => {
    const targetElement = document.getElementById("srf-skip-to-content");
    const searchInput = document.querySelector(
      'input[data-test="searchbar_input"]'
    );
    const searchButton = document.querySelector(
      'button[data-test="searchbar_search_submit"]'
    );
    const checkUI = document.querySelector("div[data-ui-name='Card.Body']");
    // 检查元素是否已渲染
    if (targetElement && searchInput && searchButton && checkUI) {
      // 清除超时定时器
      // clearTimeout(timeoutId);
      // 处理找到的元素
      processSkipToContentElement(searchInput, searchButton);

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
  setTimeout(() => {
    observer.observe(document.body, config);
    console.log(
      "SEMRUSH: 🔄 Started observing DOM for srf-skip-to-content element"
    );
  }, 1000);
}

// 处理找到的元素
function processSkipToContentElement(searchInput, searchButton) {
  if (searchInput && searchButton) {
    console.log("SEMRUSH: ✅ Found search input element");

    // 从缓存中获取 extractedUrls
    chrome.storage.local.get(
      ["extractedUrls", "processingTableData"],
      function (result) {
        const extractedUrls = result.extractedUrls || [];
        console.log(
          "SEMRUSH: 📋 Retrieved extractedUrls from cache:",
          extractedUrls
        );

        if (extractedUrls.length > 0) {
          // 获取第一个 status 为 unprocessed 的  URL
          let firstUrlObj = extractedUrls.find(
            (url) => url.status === "unprocessed"
          );
          console.log("SEMRUSH: 🔗 First URL from cache:", firstUrlObj);
          if (!firstUrlObj) {
            // 取状态为processing的url
            firstUrlObj = extractedUrls.find(
              (url) => url.status === "processing"
            );
            if (!firstUrlObj) {
              // 设置缓存状态为done
              chrome.storage.local.set(
                { processingStatus: "done" },
                function () {
                  console.log("SEMRUSH: ✅  congrats! all urls are processed");
                }
              );
              return;
            }
          }
          const firstUrl = handleUrl(firstUrlObj.url);
          // 填充到搜索输入框
          searchInput.value = firstUrl;
          // 触发 input 事件，确保值变化被检测到
          searchInput.dispatchEvent(new Event("input", { bubbles: true }));
          console.log("SEMRUSH: 🔗 Filled search input with URL:", firstUrl);

          //更新缓存
          chrome.storage.local.set(
            {
              extractedUrls: extractedUrls.map((url) =>
                url.url === firstUrl ? { ...url, status: "processing" } : url
              ),
              processingStatus: "processing",
              usingDomain: "https://" + window.location.hostname,
              processingTableData: {
                ...result.processingTableData,
                [`${firstUrl}`]: {
                  url: firstUrl,
                },
              },
            },
            function () {
              setTimeout(() => {
                // 触发搜索按钮点击
                searchButton.click();
                console.log(
                  "SEMRUSH: ✅ Clicked search button, start the process"
                );
              }, 2000);
            }
          );
        } else {
          console.log("SEMRUSH: ⚠️ No URLs found in extractedUrls cache");
        }
      }
    );
  } else {
    console.log("SEMRUSH: ⚠️ Search input element not found");
    // window.location.reload();
  }
}

function findCurrentUrl() {
  var input = document.querySelector("input[data-test='searchbar_input']");
  if (input) {
    return handleUrl(input.value);
  }
  reStartTheProcess();
}

function reStartTheProcess() {
  // 本条数据作为处理状态，暂时作废。等待后一并处理processing的数据
  // 获取useingDomain
  chrome.storage.local.get("usingDomain", function (result) {
    const usingDomain = result.usingDomain || "";
    window.location.href = `${usingDomain}/projects/`;
  });
}

//处理url字符串，只留域名，不留路径
function handleUrl(url) {
  return url.split("/")[0];
}

//强制更新缓存状态
function forceUpdateCacheStatus() {
  chrome.storage.local.get(
    ["processingTableData", "extractedUrls", "usingDomain"],
    function (result) {
      const processingTableData = result.processingTableData || {};
      const currentUrl = findCurrentUrl();
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
              commercialIntentKeywords: [],
              auselessData: true,
            },
          },
        },
        function () {
          setTimeout(() => {
            window.location.href = `${usingDomain}/projects/`;
          }, 3 * 1000);
        }
      );
    }
  );
}
