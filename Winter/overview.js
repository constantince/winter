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
    const fatherElement = document.querySelector('div[data-at="country-distribution-table"]');
   
      // 检查元素是否已渲染
      if (fatherElement ) {

        const titleElement = fatherElement.querySelector('span[data-at="db-title"]')
        const trafficElement = fatherElement.querySelector('div[data-at="table-row"] div[name="organicTraffic"]')
        if(titleElement && trafficElement) {
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
      attributes: true
    };
    
    // 开始观察
    observer.observe(document.body, config);
    console.log("SEMRUSH: 📄 getOverviewData");
}


function processSkipToContentElementInOverview(titleElement,trafficElement) {
    console.log("SEMRUSH: 📄 processSkipToContentElement");
    
    const title = titleElement.textContent || "No title";
    const traffic = trafficElement.textContent || "No traffic";
    // 给使用css 使用console的内嵌语法 %c 给 console打印出来的title和traffic标红
    console.log( "%cSEMRUSH: 📄 国家 " + title, "color: red;");
    console.log( "%cSEMRUSH: 📄 流量 " + traffic, "color: red;");
}

