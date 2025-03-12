function searchInput() {
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
      const targetElement = document.getElementById("srf-skip-to-content");
    const searchInput = document.querySelector('input[data-test="searchbar_input"]');
    const searchButton = document.querySelector('button[data-test="searchbar_search_submit"]');
      // 检查元素是否已渲染
      if (targetElement && searchInput && searchButton) {
        // 清除超时定时器
        clearTimeout(timeoutId);
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
      attributes: true
    };
    
    // 开始观察
    observer.observe(document.body, config);
    console.log("SEMRUSH: 🔄 Started observing DOM for srf-skip-to-content element");
  }
  
  // 处理找到的元素
  function processSkipToContentElement(searchInput, searchButton) {
    if (searchInput && searchButton) {
      console.log("SEMRUSH: ✅ Found search input element");
      
      // 从缓存中获取 extractedUrls
      chrome.storage.local.get(['extractedUrls'], function(result) {
        const extractedUrls = result.extractedUrls || [];
        console.log("SEMRUSH: 📋 Retrieved extractedUrls from cache:", extractedUrls);
        
        if (extractedUrls.length > 0) {
          // 获取第一个 URL
          const firstUrl = extractedUrls[0].url;
          console.log("SEMRUSH: 🔗 First URL from cache:", firstUrl);
          
          // 填充到搜索输入框
          searchInput.value = firstUrl;
          // 触发 input 事件，确保值变化被检测到
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          console.log("SEMRUSH: ✅ Filled search input with URL:", firstUrl);
  
          // 触发搜索按钮点击
          searchButton.click();
          console.log("SEMRUSH: ✅ Clicked search button");
        } else {
          console.log("SEMRUSH: ⚠️ No URLs found in extractedUrls cache");
        }
        
        // 设置固定的URL和必要的缓存
        const fixedUrl = "https://zh.trends.fast.wmxpro.com/";
        const urlsArray = [fixedUrl];
        
        // 存储到缓存
        chrome.storage.local.set(
          {
            semrushEntryUrls: urlsArray,
            usingDomain: fixedUrl
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
      });
    } else {
      console.log("SEMRUSH: ⚠️ Search input element not found");
      
      // 如果找不到搜索输入框，仍然设置缓存
      const fixedUrl = "https://zh.trends.fast.wmxpro.com/";
      const urlsArray = [fixedUrl];
      
      chrome.storage.local.set(
        {
          semrushEntryUrls: urlsArray,
          usingDomain: fixedUrl
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
  }
  
  
  