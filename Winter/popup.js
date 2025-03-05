document.addEventListener("DOMContentLoaded", function () {
  // 首先检查当前标签页是否在允许的域名下
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const currentUrl = tabs[0].url;
    const allowedDomains = ["www.semrush.fun", ".semrush.fun"];

    const isAllowedDomain = allowedDomains.some((domain) =>
      currentUrl.includes(domain)
    );

    if (!isAllowedDomain) {
      // 如果不在允许的域名下，显示提示信息
      document.body.innerHTML = `
        <div class="container">
          <div class="header-section">
            <div class="logo-section">
              <span class="material-symbols-outlined">warning</span>
              <h1>访问受限</h1>
            </div>
            <div class="status-message error">
              此扩展程序仅在 semrush.fun 域名下可用
            </div>
          </div>
        </div>`;
      return;
    }

    // 原有的初始化代码
    initializeExtension();
  });
});

function initializeExtension() {
  const startButton = document.getElementById("start");
  const processButton = document.getElementById("process");
  const result = document.getElementById("result");
  const status = document.getElementById("status");
  const fileInput = document.getElementById("excelFile");
  const columnInput = document.getElementById("columnName");

  // 重置所有按钮状态
  function resetButtons() {
    startButton.disabled = false;
    processButton.style.display = "none";
    fileInput.value = ""; // 清空文件输入
    columnInput.value = "URL"; // 重置列名
  }

  // 清理所有数据
  async function cleanupAllData() {
    try {
      // 清除存储的数据
      await chrome.storage.local.clear();

      // 重置按钮状态，但保留URL列表显示
      resetButtonsOnly();

      console.log("所有数据已清理完成");
    } catch (error) {
      console.error("清理数据时出错:", error);
      showStatus("清理数据时出错", "error");
    }
  }

  // 只重置按钮状态
  function resetButtonsOnly() {
    // 重置按钮状态
    startButton.disabled = false;
    processButton.style.display = "none";
    processButton.disabled = false;

    // 检查是否已存在下载按钮，如果存在则不重复创建
    if (!document.getElementById("downloadBtn")) {
      // 显示下载按钮
      const downloadButton = document.createElement("button");
      downloadButton.id = "downloadBtn";
      downloadButton.className = "button-primary";
      downloadButton.innerHTML = `
            <span class="icon">📥</span>
            <span>下载</span>
        `;

      // 添加下载按钮到状态区域后面
      const statusElement = document.getElementById("status");
      statusElement.parentNode.insertBefore(
        downloadButton,
        statusElement.nextSibling
      );

      // 添加下载按钮点击事件
      downloadButton.addEventListener("click", () => {
        console.log("download");
      });
    }

    // 更新状态显示
    showStatus("处理完成，可以开始新的上传", "success");
  }

  // 完全重置UI（仅在新文件上传时调用）
  function resetUIComplete() {
    // 重置按钮状态
    startButton.disabled = false;
    processButton.style.display = "none";
    processButton.disabled = false;

    // 移除下载按钮（如果存在）
    const downloadBtn = document.getElementById("downloadBtn");
    if (downloadBtn) {
      downloadBtn.remove();
    }

    // 重置输入
    columnInput.value = "URL";

    // 清空结果区域
    result.innerHTML = "";

    // 更新状态显示
    showStatus("准备开始上传", "info");
  }

  // 处理按钮点击事件
  processButton.addEventListener("click", async () => {
    try {
      processButton.disabled = true;
      showStatus("正在开始处理...", "processing");

      const result = await chrome.storage.local.get(["extractedUrls"]);
      const urls = result.extractedUrls;

      if (!urls || urls.length === 0) {
        showStatus("没有找到存储的URL数据", "error");
        processButton.disabled = false;
        return;
      }

      // 设置消息监听器
      setupMessageListeners();

      // 发送处理请求到content script
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tabs[0]) {
        throw new Error("无法获取当前标签页");
      }

      await chrome.tabs.sendMessage(tabs[0].id, {
        action: "startProcessing",
        data: {
          urls: urls,
          total: urls.length,
          timestamp: new Date().getTime(),
        },
      });

      showStatus(`正在处理 ${urls.length} 个URL...`, "processing");
    } catch (error) {
      console.error("处理失败:", error);
      showStatus("处理失败: " + error.message, "error");
      processButton.disabled = false;
    }
  });

  // 设置消息监听器
  function setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case "processingProgress":
          // 更新进度显示
          const { current, total } = message.data;
          showStatus(`正在处理: ${current}/${total}`, "processing");
          break;

        case "processingComplete":
          // 处理完成，只清理数据和重置按钮，保留URL列表
          showStatus(`处理完成 ${message.data.total} 个URL`, "success");
          cleanupAllData();
          break;

        case "processingError":
          // 处理出错
          showStatus(`处理出错: ${message.error}`, "error");
          processButton.disabled = false;
          break;
      }
    });
  }

  // 显示状态信息
  function showStatus(message, type) {
    status.innerHTML = `
        <div class="status-message ${type}">
            <span class="icon">${getStatusIcon(type)}</span>
            <span>${message}</span>
        </div>`;
  }

  // 获取状态图标
  function getStatusIcon(type) {
    switch (type) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "processing":
        return "⏳";
      default:
        return "ℹ️";
    }
  }

  // 文件选择变化时的处理
  fileInput.addEventListener("change", () => {
    // 当选择新文件时，完全重置UI
    resetUIComplete();
  });

  // 开始上传按钮点击事件
  startButton.addEventListener("click", async () => {
    if (!fileInput.files || fileInput.files.length === 0) {
      showStatus("请选择Excel文件", "error");
      return;
    }

    try {
      showStatus("正在处理...", "processing");
      startButton.disabled = true;

      const urls = await extractUrlsFromExcel(
        fileInput.files[0],
        columnInput.value
      );

      if (urls.length === 0) {
        showStatus("未找到URL", "warning");
        startButton.disabled = false;
        result.innerHTML = `
          <div class="error-message">
            <p>在指定列中没有找到任何URL。请检查：</p>
            <ul>
              <li>列名是否正确（当前：${columnInput.value}）</li>
              <li>Excel文件是否包含URL数据</li>
              <li>URL单元格是否为空</li>
            </ul>
          </div>`;
      } else {
        // 显示结果
        showStatus(`成功提取 ${urls.length} 个URL`, "success");
        displayResults(urls);

        // 存储URL数据
        await chrome.storage.local.set({
          extractedUrls: urls,
          extractionTime: new Date().getTime(),
        });

        // 显示处理按钮
        processButton.style.display = "inline-block";
        processButton.disabled = false;
      }
    } catch (error) {
      console.error("处理错误:", error);
      showStatus("处理出错", "error");
      startButton.disabled = false;
      result.innerHTML = `
        <div class="error-message">
          <p>错误信息：${error.message}</p>
          <p>请检查：</p>
          <ul>
            <li>Excel文件格式是否正确</li>
            <li>列名是否与Excel中的完全匹配（区分大小写）</li>
            <li>文件是否损坏</li>
          </ul>
        </div>`;
    }
  });

  function displayResults(urls) {
    const urlList = urls
      .map(
        (url, index) =>
          `<div class="url-item">
            <span class="url-number">${index + 1}.</span>
            <div class="url-link">
                <a href="${url}" target="_blank" title="${url}">${url}</a>
            </div>
        </div>`
      )
      .join("");

    const resultsHtml = `
        <div class="success-message">
            <strong>提取结果（共 ${urls.length} 个URL）：</strong>
        </div>
        <div class="url-list">
            ${urlList}
        </div>`;

    result.innerHTML = resultsHtml;

    // 添加虚拟滚动处理
    const urlListElement = result.querySelector(".url-list");
    if (urls.length > 100) {
      implementVirtualScroll(urlListElement, urls);
    }

    // 将URLs保存到Chrome存储中
    chrome.storage.local.set({ extractedUrls: urls }, function () {
      console.log("URLs已保存到存储中");

      // 通知content-script.js
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "urlsExtracted",
          count: urls.length,
        });
      });
    });
  }

  // 虚拟滚动实现
  function implementVirtualScroll(container, urls) {
    let currentIndex = 0;
    const batchSize = 50; // 每次加载的数量

    // 滚动事件处理
    container.addEventListener("scroll", () => {
      if (
        container.scrollHeight - container.scrollTop <=
        container.clientHeight + 100
      ) {
        // 距离底部100px时加载更多
        loadMoreItems();
      }
    });

    function loadMoreItems() {
      if (currentIndex >= urls.length) return;

      const fragment = document.createDocumentFragment();
      const endIndex = Math.min(currentIndex + batchSize, urls.length);

      for (let i = currentIndex; i < endIndex; i++) {
        const div = document.createElement("div");
        div.className = "url-item";
        div.innerHTML = `
                <span class="url-number">${i + 1}.</span>
                <div class="url-link">
                    <a href="${urls[i]}" target="_blank" title="${urls[i]}">${
          urls[i]
        }</a>
                </div>`;
        fragment.appendChild(div);
      }

      container.appendChild(fragment);
      currentIndex = endIndex;
    }

    // 初始加载
    loadMoreItems();
  }
}

function tabState(action) {
  if (action === "Start") {
    startButton.innerText = "Pause";
  } else {
    startButton.innerText = "Start";
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "dataScraped") {
    const data = message.data;
    console.log("Scraped Data:", data);
    // 在这里处理抓取到的数据，例如显示在 popup 页面上
  }
});

function changeBackgroundColor() {
  document.body.style.backgroundColor = "#ffcc00";
}
