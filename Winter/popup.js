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
  const processButton = document.getElementById("process");
  const resultElement = document.getElementById("result");
  const statusElement = document.getElementById("status");
  const fileInput = document.getElementById("excelFile");
  const columnInput = document.getElementById("columnName");

  // 初始化时获取处理状态
  chrome.storage.local.get(
    [
      "processingStatus",
      "currentUrlIndex",
      "extractedUrls",
      "processedData",
      "currentProcessingState",
    ],
    function (result) {
      const {
        processingStatus,
        currentUrlIndex,
        extractedUrls,
        processedData = [],
        currentProcessingState,
      } = result;

      console.log("💾 Restored state:", {
        processingStatus,
        currentUrlIndex,
        urlsCount: extractedUrls?.length,
        processedCount: processedData.length,
        currentState: currentProcessingState,
      });

      // 根据不同的处理状态恢复界面
      switch (processingStatus) {
        case "processing":
          // 如果正在处理中，显示最新的处理状态
          if (currentProcessingState) {
            updateProcessingStatus(currentProcessingState);
          } else {
            // 如果没有当前处理状态，则使用基本信息显示
            showProcessingStatus(currentUrlIndex, extractedUrls);
          }
          break;

        case "completed":
          // 如果处理完成，显示完成状态和下载按钮
          showCompletionStatus(processedData);
          break;

        case "idle":
          // 如果是空闲状态，但有已提取的URL，显示URL列表
          if (extractedUrls && extractedUrls.length > 0) {
            displayResults(extractedUrls);
          }
          break;

        case "error":
          // 如果之前发生错误，显示错误状态
          if (currentProcessingState?.error) {
            handleProcessingError(currentProcessingState.error);
          }
          break;

        default:
          // 默认显示初始状态
          if (fileInput) fileInput.style.display = "block";
          if (columnInput) columnInput.style.display = "block";
          const headerSection = document.querySelector(".header-section");
          if (headerSection) headerSection.style.display = "block";
          break;
      }
    }
  );

  // 监听来自content script的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("📨 Received message:", message);

    switch (message.action) {
      case "PROGRESS_UPDATE":
        updateProcessingStatus(message.data);
        break;

      case "PROCESSING_COMPLETE":
        handleProcessingComplete(message.data);
        break;

      case "CONTENT_SCRIPT_ERROR":
        handleProcessingError(message.error);
        break;
    }

    // 返回true表示会异步发送响应
    return true;
  });

  // 处理按钮点击事件
  processButton.addEventListener("click", async () => {
    const currentStatus = processButton.dataset.status;

    switch (currentStatus) {
      case "idle":
      case "error":
        console.log("📤 Starting URL processing");

        // 隐藏特定UI元素
        if (fileInput) fileInput.style.display = "none";
        if (columnInput) columnInput.style.display = "none";
        if (processButton) processButton.style.display = "none";
        if (resultElement) resultElement.innerHTML = "";

        // 设置初始索引缓存和处理状态
        await chrome.storage.local.set({
          currentUrlIndex: 0,
          processingStatus: "processing",
        });

        // 更新界面状态
        const entries = await getExtractedUrls();
        showProcessingStatus(0, entries);

        // 发送开始处理消息
        chrome.runtime.sendMessage({ action: "START_PROCESSING" });
        chrome.tabs.query(
          { active: true, currentWindow: true },
          function (tabs) {
            if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: "START_PROCESSING",
                message: "开始处理URLs",
              });
            }
          }
        );
        break;
    }
  });

  // 文件上传处理
  fileInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) {
      showStatus("请选择Excel文件", "error");
      return;
    }

    // 检查文件类型
    console.log("📁 File type:", file.type);
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "text/csv", // .csv
    ];

    if (
      !validTypes.includes(file.type) &&
      !file.name.endsWith(".xlsx") &&
      !file.name.endsWith(".xls") &&
      !file.name.endsWith(".csv")
    ) {
      showStatus("请上传有效的Excel文件（.xlsx, .xls）或CSV文件", "error");
      return;
    }

    try {
      showStatus("正在处理Excel文件...", "processing");

      // 清除之前的数据
      await chrome.storage.local.remove([
        "extractedUrls",
        "processedData",
        "processingStatus",
        "currentUrlIndex",
      ]);

      // 自定义列名
      const columnNames = {
        url: ["url", "URL", "Url", "网址", "域名"],
        country: ["country", "Country", "COUNTRY", "国家", "地区"],
      };
      console.log("🔍 Looking for columns:", columnNames);

      // 处理新文件
      const entries = await extractUrlsFromExcel(file, columnNames);

      if (entries.length === 0) {
        showStatus("未找到URL", "warning");
        resultElement.innerHTML = `
          <div class="error-message">
            <p>在指定列中没有找到任何URL。请检查：</p>
            <ul>
              <li>列名是否正确（当前URL列名可选：${columnNames.url.join(
                ", "
              )}）</li>
              <li>Excel文件是否包含URL数据</li>
              <li>URL单元格是否为空</li>
            </ul>
          </div>`;
      } else {
        // 显示结果并保存数据
        displayResults(entries);
      }
    } catch (error) {
      console.error("❌ Error processing file:", error);
      showStatus(error.message, "error");
      resultElement.innerHTML = `
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

  // Excel文件处理函数
  async function extractUrlsFromExcel(file, columnNames) {
    console.log("📑 Processing Excel file:", file.name);
    console.log("🔍 Looking for columns:", columnNames);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = function (e) {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });

          // 获取第一个工作表
          const firstSheetName = workbook.SheetNames[0];
          console.log("📊 Sheet name:", firstSheetName);
          const worksheet = workbook.Sheets[firstSheetName];

          // 转换为JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          // 查找目标列
          let urlColumn = null;
          let countryColumn = null;

          // 获取第一行的所有列名
          if (jsonData.length > 0) {
            const firstRow = jsonData[0];
            const headers = Object.keys(firstRow);

            // 查找URL列
            urlColumn = headers.find((header) =>
              columnNames.url.some(
                (name) =>
                  String(header).trim().toLowerCase() === name.toLowerCase()
              )
            );

            // 查找country列
            countryColumn = headers.find((header) =>
              columnNames.country.some(
                (name) =>
                  String(header).trim().toLowerCase() === name.toLowerCase()
              )
            );
          }

          if (!urlColumn || !countryColumn) {
            reject(
              new Error(
                `未找到必要的列名。需要URL列（${columnNames.url.join(
                  ", "
                )}）和country列（${columnNames.country.join(", ")}）`
              )
            );
            return;
          }

          console.log("Found columns:", { urlColumn, countryColumn });

          // 提取数据
          const entries = jsonData
            .map((row) => {
              const url = row[urlColumn];
              const country = row[countryColumn];

              if (!url || !country) return null;

              const urlStr = String(url).trim();
              try {
                const processedUrl =
                  !urlStr.startsWith("http://") &&
                  !urlStr.startsWith("https://")
                    ? "https://" + urlStr
                    : urlStr;
                new URL(processedUrl); // 验证URL格式
                return {
                  url: processedUrl,
                  country: String(country).trim(),
                };
              } catch (error) {
                return null;
              }
            })
            .filter((entry) => entry !== null);

          if (entries.length === 0) {
            reject(new Error("未找到有效的URL和country数据"));
            return;
          }

          // 保存URL和country组合到缓存中
          chrome.storage.local.set(
            {
              extractedUrls: entries,
              processingStatus: "idle",
            },
            function () {
              console.log("💾 Entries saved:", entries.length);
              resolve(entries);
            }
          );
        } catch (error) {
          reject(new Error("Excel文件处理失败: " + error.message));
        }
      };

      reader.onerror = () => reject(new Error("文件读取失败"));
      reader.readAsArrayBuffer(file);
    });
  }

  // 显示结果
  function displayResults(entries) {
    console.log("📝 Displaying results for entries:", entries.length);

    const entriesList = entries
      .map(
        (entry, index) => `
        <div class="url-item">
            <span class="url-number">${index + 1}.</span>
            <div class="url-info">
                <a href="${entry.url}" target="_blank" title="${entry.url}">${
          entry.url
        }</a>
                <span class="country-tag">${entry.country}</span>
            </div>
        </div>
      `
      )
      .join("");

    resultElement.innerHTML = `
        <div class="success-message">
            <strong>提取结果（共 ${entries.length} 条数据）：</strong>
        </div>
        <div class="url-list">
            ${entriesList}
        </div>
    `;

    processButton.style.display = "inline-block";
    processButton.disabled = false;
    processButton.dataset.status = "idle";
    processButton.textContent = "开始处理";
    showStatus(`已保存 ${entries.length} 条数据`, "success");
  }

  // 显示状态信息
  function showStatus(message, type) {
    statusElement.innerHTML = `
      <div class="status-message ${type}">
        <span class="icon">${
          type === "success"
            ? "✅"
            : type === "error"
            ? "❌"
            : type === "processing"
            ? "⏳"
            : "ℹ️"
        }</span>
        <span>${message}</span>
      </div>
    `;
  }

  // 显示处理状态
  function showProcessingStatus(currentIndex, entries) {
    if (!entries) return;

    const currentEntry = entries[currentIndex];

    // 隐藏特定UI元素
    if (fileInput) fileInput.style.display = "none";
    if (columnInput) columnInput.style.display = "none";
    if (processButton) processButton.style.display = "none";
    if (resultElement) resultElement.innerHTML = "";

    // 隐藏header-section
    const headerSection = document.querySelector(".header-section");
    if (headerSection) {
      headerSection.style.display = "none";
    }

    // 显示处理状态
    statusElement.innerHTML = `
      <div class="processing-status">
        <div class="spinner"></div>
        <div class="status-text">
          正在处理 ${currentIndex + 1}/${entries.length}
          <div class="current-url">${currentEntry.url}</div>
          <div class="current-country">${currentEntry.country}</div>
        </div>
      </div>
    `;

    // 强制重绘界面
    statusElement.style.display = "none";
    statusElement.offsetHeight; // 触发重排
    statusElement.style.display = "block";
  }

  // 显示完成状态
  function showCompletionStatus(processedData) {
    // 隐藏特定UI元素
    if (fileInput) fileInput.style.display = "none";
    if (columnInput) columnInput.style.display = "none";
    if (processButton) processButton.style.display = "none";
    if (resultElement) resultElement.innerHTML = "";

    // 隐藏header-section
    const headerSection = document.querySelector(".header-section");
    if (headerSection) {
      headerSection.style.display = "none";
    }

    // 更新整个container的内容
    const container = document.querySelector(".container");
    if (container) {
      container.innerHTML = `
        <div class="completion-status">
          <div class="success-icon">✅</div>
          <div class="status-text">
            处理完成！共处理 ${processedData.length} 条数据
          </div>
          <div class="button-group">
            <button id="downloadBtn" class="button-primary">
              <span class="icon">📥</span>
              <span>下载数据</span>
            </button>
            <button id="resetBtn" class="button-secondary">
              <span class="icon">🔄</span>
              <span>重新开始</span>
            </button>
          </div>
        </div>
      `;

      // 重新添加按钮事件监听器
      addCompletionButtonListeners(processedData);
    }
  }

  // 添加完成状态按钮的事件监听器
  function addCompletionButtonListeners(processedData) {
    // 添加下载按钮点击事件
    document
      .getElementById("downloadBtn")
      .addEventListener("click", function () {
        const dataStr = JSON.stringify(processedData, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `processed_data_${new Date()
          .toISOString()
          .slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });

    // 添加重新开始按钮点击事件
    document
      .getElementById("resetBtn")
      .addEventListener("click", async function () {
        // 清除所有存储的数据
        await chrome.storage.local.clear();

        // 显示初始界面元素
        const headerSection = document.querySelector(".header-section");
        if (headerSection) {
          headerSection.style.display = "block";
        }

        // 显示输入元素
        if (fileInput) {
          fileInput.style.display = "block";
          fileInput.value = ""; // 清除已选择的文件
        }
        if (columnInput) {
          columnInput.style.display = "block";
          columnInput.value = ""; // 清除输入的列名
        }

        // 隐藏进度状态和完成状态
        const processingStatus = document.querySelector(".processing-status");
        if (processingStatus) {
          processingStatus.style.display = "none";
        }
        const completionStatus = document.querySelector(".completion-status");
        if (completionStatus) {
          completionStatus.style.display = "none";
        }

        // 重置结果区域
        if (resultElement) {
          resultElement.innerHTML = "";
        }

        // 重置状态区域
        if (statusElement) {
          statusElement.innerHTML = "";
        }

        // 重置处理按钮
        if (processButton) {
          processButton.style.display = "none";
          processButton.disabled = false;
          processButton.dataset.status = "idle";
          processButton.textContent = "开始处理";
        }

        // 显示重置成功消息
        showStatus("已重置，请重新上传文件", "success");
      });

    // 文件上传处理函数
    async function handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) {
        showStatus("请选择Excel文件", "error");
        return;
      }

      // 检查文件类型
      console.log("📁 File type:", file.type);
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
      ];

      if (
        !validTypes.includes(file.type) &&
        !file.name.endsWith(".xlsx") &&
        !file.name.endsWith(".xls") &&
        !file.name.endsWith(".csv")
      ) {
        showStatus("请上传有效的Excel文件（.xlsx, .xls）或CSV文件", "error");
        return;
      }

      try {
        showStatus("正在处理Excel文件...", "processing");
        const userColumnName = columnInput.value.trim();
        const entries = await extractUrlsFromExcel(file, userColumnName);
        displayResults(entries);
      } catch (error) {
        console.error("❌ Error processing file:", error);
        showStatus(error.message, "error");
      }
    }

    // 处理按钮点击处理函数
    async function handleProcessButtonClick() {
      const currentStatus = processButton.dataset.status;
      if (currentStatus === "idle" || currentStatus === "error") {
        console.log("📤 Starting URL processing");
        await startProcessing();
      }
    }
  }

  // 处理错误
  function handleProcessingError(error) {
    // 保存错误状态
    chrome.storage.local.set({
      processingStatus: "error",
      currentProcessingState: {
        status: "error",
        error: error,
      },
    });

    statusElement.innerHTML = `
      <div class="error-status">
        <div class="error-icon">❌</div>
        <div class="error-text">处理出错: ${error}</div>
      </div>
    `;

    // 启用文件输入和处理按钮
    fileInput.disabled = false;
    processButton.disabled = false;
    processButton.dataset.status = "error";
  }

  // 更新处理状态
  function updateProcessingStatus(data) {
    const { currentIndex, totalUrls, currentUrl, stage, status } = data;
    console.log(
      "🔄 Updating progress:",
      currentIndex + 1,
      "/",
      totalUrls,
      "Stage:",
      stage
    );

    // 保存当前处理状态到storage
    chrome.storage.local.set({ currentProcessingState: data });

    // 隐藏特定UI元素
    if (fileInput) fileInput.style.display = "none";
    if (columnInput) columnInput.style.display = "none";
    if (processButton) processButton.style.display = "none";
    if (resultElement) resultElement.innerHTML = "";

    // 隐藏header-section
    const headerSection = document.querySelector(".header-section");
    if (headerSection) {
      headerSection.style.display = "none";
    }

    // 更新整个container的内容
    const container = document.querySelector(".container");
    if (container) {
      container.innerHTML = `
        <div class="processing-status">
          <div class="spinner"></div>
          <div class="status-text">
            正在处理 ${currentIndex + 1}/${totalUrls}
            <div class="stage-info">${status}</div>
            <div class="current-url">${currentUrl}</div>
          </div>
        </div>
      `;
    }
  }

  // 处理完成
  function handleProcessingComplete(data) {
    chrome.storage.local.set(
      {
        processingStatus: "completed",
        processedData: data.finalData,
        currentProcessingState: {
          status: "completed",
          data: data.finalData,
        },
      },
      function () {
        showCompletionStatus(data.finalData);
      }
    );
  }

  // 获取已提取的URLs
  async function getExtractedUrls() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["extractedUrls"], function (result) {
        resolve(result.extractedUrls || []);
      });
    });
  }

  // 添加必要的CSS样式
  const style = document.createElement("style");
  style.textContent = `
    .processing-status {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
    }
    .spinner {
      width: 20px;
      height: 20px;
      border: 3px solid #f3f3f3;
      border-top: 3px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    .current-url {
      font-size: 12px;
      color: #666;
      margin-top: 5px;
      word-break: break-all;
    }
    .stage-info {
      font-size: 14px;
      color: #333;
      margin-top: 5px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .completion-status {
      text-align: center;
      padding: 10px;
    }
    .success-icon {
      font-size: 24px;
      margin-bottom: 10px;
    }
    .error-status {
      color: #ff0000;
      padding: 10px;
    }
    .button-group {
      display: flex;
      gap: 10px;
      justify-content: center;
      margin-top: 15px;
    }
    .button-primary {
      background-color: #4CAF50;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .button-secondary {
      background-color: #2196F3;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .button-primary:hover, .button-secondary:hover {
      opacity: 0.9;
    }
  `;
  document.head.appendChild(style);
}
