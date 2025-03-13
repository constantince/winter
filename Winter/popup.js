// 全局UI元素
let resultElement;
let statusElement;
let fileInput;
let columnInput;

document.addEventListener("DOMContentLoaded", function () {
  // 首先检查当前标签页是否在允许的域名下
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const currentUrl = tabs[0].url;
    const allowedDomains = [
      "www.semrush.fun",
      ".semrush.fun",
      "zh.trends.fast.wmxpro.com",
    ];

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

    // 添加消息监听器，用于接收来自background.js和content-script.js的消息
    setupMessageListeners();
  });
});

function initializeExtension() {
  console.log("🚀 Initializing extension");

  // 初始化全局UI元素
  resultElement = document.getElementById("result");
  statusElement = document.getElementById("status");
  fileInput = document.getElementById("excelFile");
  columnInput = document.getElementById("columnName");

  // 验证必要的UI元素
  if (!resultElement || !statusElement || !fileInput) {
    console.error("❌ Required UI elements not found:", {
      resultElement: !!resultElement,
      statusElement: !!statusElement,
      fileInput: !!fileInput,
    });
    return;
  }

  console.log("✅ All required UI elements found");

  // 检查缓存状态并更新界面
  checkCacheStatusAndUpdateUI();

  // 文件上传处理
  fileInput.addEventListener("change", handleFileUpload);
}

// 设置消息监听器
function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("📨 Popup received message:", message);

    // 根据不同的消息类型更新界面
    switch (message.action) {
      case "PROGRESS_UPDATE":
        // 处理进度更新消息
        updateProcessingStatus(message.data);
        break;

      case "PROCESSING_COMPLETE":
        // 处理完成消息
        if (message.data && message.data.finalData) {
          showCompletionStatus(message.data.finalData);
        } else {
          // 如果没有提供finalData，重新检查缓存状态
          checkCacheStatusAndUpdateUI();
        }
        break;

      case "CONTENT_SCRIPT_ERROR":
        // 处理错误消息
        handleProcessingError(message.error);
        break;

      case "CONTENT_SCRIPT_READY":
      case "ENTRY_URLS_SAVED":
        // 这些消息可能表示状态已更改，重新检查缓存
        checkCacheStatusAndUpdateUI();
        break;

      default:
        // 对于其他消息，也重新检查缓存状态
        checkCacheStatusAndUpdateUI();
        break;
    }

    // 返回true表示异步处理消息
    return true;
  });
}

// 检查缓存状态并更新界面
function checkCacheStatusAndUpdateUI() {
  console.log("🔍 Checking cache status and updating UI");

  chrome.storage.local.get(
    [
      "processingStatus",
      "currentUrlIndex",
      "extractedUrls",
      "processedData",
      "currentProcessingState",
      "processingTableData",
    ],
    function (result) {
      const {
        processingStatus,
        currentUrlIndex,
        extractedUrls = [],
        processedData = [],
        currentProcessingState,
        processingTableData = {},
      } = result;

      console.log("💾 Cache status:", {
        processingStatus,
        currentUrlIndex,
        extractedUrlsCount: extractedUrls.length,
        processedDataCount: processedData.length,
        processingTableDataCount: Object.keys(processingTableData).length,
        currentState: currentProcessingState,
      });

      // 检查是否所有URL都已处理完成
      const allProcessed =
        extractedUrls.length > 0 &&
        extractedUrls.every((url) => url.status === "processed");

      // 检查是否有正在处理中的URL
      const hasProcessingUrls = extractedUrls.some(
        (url) => url.status === "processing"
      );

      // 检查processingTableData是否为空
      const hasProcessingTableData =
        Object.keys(processingTableData).length > 0;

      console.log("处理状态检查:", {
        allProcessed,
        hasProcessingUrls,
        extractedUrlsLength: extractedUrls.length,
        processedDataLength: processedData.length,
      });

      // 根据不同状态更新界面
      if (allProcessed && extractedUrls.length > 0) {
        // 所有URL都已处理完成
        console.log("✅ All URLs processed, showing completion status");

        // 如果processedData为空但所有URL都已处理，则使用extractedUrls作为processedData
        if (processedData.length === 0) {
          console.log(
            "⚠️ processedData is empty, using extractedUrls as processed data"
          );
          showCompletionStatus(extractedUrls);
        } else {
          showCompletionStatus(processedData);
        }
      } else if (hasProcessingUrls) {
        // 有URL正在处理中
        console.log("⏳ URLs are being processed");
        if (currentProcessingState) {
          updateProcessingStatus(currentProcessingState);
        } else {
          showProcessingStatus(currentUrlIndex || 0, extractedUrls);
        }
        showStatus("处理中...", "processing");
      } else if (!hasProcessingTableData && extractedUrls.length === 0) {
        // 没有任何数据，显示准备开始状态
        console.log("🔄 Ready to start");
        if (fileInput) fileInput.style.display = "block";
        if (columnInput) columnInput.style.display = "block";
        const headerSection = document.querySelector(".header-section");
        if (headerSection) headerSection.style.display = "block";
        showStatus("准备开始，请上传文件", "info");
      } else if (extractedUrls.length > 0) {
        // 有已提取的URL但尚未开始处理
        console.log("📋 URLs extracted but not processed");
        // 不显示URL列表，只显示准备处理状态
        showReadyToProcess(extractedUrls.length);
      }
    }
  );
}

// 显示准备处理状态
function showReadyToProcess(urlCount) {
  console.log("🔄 Ready to process URLs:", urlCount);

  if (!resultElement || !statusElement) {
    console.error("❌ Required UI elements not found");
    return;
  }

  // 清空结果区域，不显示URL列表
  resultElement.innerHTML = "";

  // 显示状态信息
  showStatus(`已提取 ${urlCount} 条数据`, "success");

  // 不再自动开始处理
  // startProcessing();
}

// 开始处理函数 (保留以备将来使用)
async function startProcessing() {
  console.log("📤 Starting URL processing");

  // 隐藏特定UI元素
  if (fileInput) fileInput.style.display = "none";
  if (columnInput) columnInput.style.display = "none";
  if (resultElement) resultElement.innerHTML = "";

  // 设置初始索引缓存和处理状态
  await chrome.storage.local.set({
    processingStatus: "processing",
  });

  // 发送开始处理消息到background script
  chrome.runtime.sendMessage({
    action: "START_BATCH_PROCESSING",
    data: {
      message: "开始批量处理URLs",
    },
  });

  // 更新界面状态
  showStatus("正在处理中...", "processing");
}

// 显示处理状态
function showProcessingStatus(currentIndex, entries) {
  if (!entries || entries.length === 0) {
    console.error("❌ No entries provided to showProcessingStatus");
    return;
  }

  if (currentIndex >= entries.length) {
    console.error(
      "❌ Current index out of bounds:",
      currentIndex,
      "entries length:",
      entries.length
    );
    currentIndex = 0; // 重置为0以防止错误
  }

  const currentEntry = entries[currentIndex];
  console.log(
    "显示处理状态:",
    currentIndex + 1,
    "/",
    entries.length,
    "当前URL:",
    currentEntry.url
  );

  // 从缓存中获取已处理的URL数量
  chrome.storage.local.get(["extractedUrls"], function (result) {
    const extractedUrls = result.extractedUrls || [];
    const processedCount = extractedUrls.filter(
      (url) => url.status === "processed"
    ).length;

    console.log(
      "已处理URL数量:",
      processedCount,
      "总URL数量:",
      extractedUrls.length
    );

    // 隐藏特定UI元素
    hideUIElements();

    // 显示处理状态
    statusElement.innerHTML = `
      <div class="processing-status">
        <div class="spinner"></div>
        <div class="status-text">
          <div class="progress-info">正在处理 ${currentIndex + 1}/${
      entries.length
    }</div>
          <div class="processed-count">已处理: ${processedCount} 条数据</div>
          <div class="current-url">当前URL: ${currentEntry.url}</div>
          <div class="current-country">国家: ${
            currentEntry.country || "未知"
          }</div>
          ${
            processedCount > 0
              ? `
          <div class="download-section">
            <button id="downloadCurrentBtn" class="button-small">下载已处理数据</button>
          </div>`
              : ""
          }
        </div>
      </div>
    `;

    // 如果有已处理的数据，添加下载按钮事件
    if (processedCount > 0) {
      document
        .getElementById("downloadCurrentBtn")
        .addEventListener("click", function () {
          // 获取已处理的URL
          const processedUrls = extractedUrls.filter(
            (url) => url.status === "processed"
          );
          // 下载已处理的数据
          downloadProcessingData(processedUrls);
        });
    }
  });
}

// 显示完成状态
function showCompletionStatus(processedData) {
  // 隐藏特定UI元素
  hideUIElements();

  // 确保processedData是数组
  const dataArray = Array.isArray(processedData) ? processedData : [];
  console.log("显示完成状态，数据条数:", dataArray.length);

  // 更新整个container的内容
  const container = document.querySelector(".container");
  if (container) {
    container.innerHTML = `
      <div class="completion-status">
        <div class="success-icon">✅</div>
        <div class="status-text">
          处理完成！共处理 ${dataArray.length} 条数据
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

    // 添加按钮事件监听器
    addCompletionButtonListeners(dataArray);
  }
}

// 隐藏UI元素的辅助函数
function hideUIElements() {
  // 使用全局变量
  if (fileInput) fileInput.style.display = "none";
  if (columnInput) columnInput.style.display = "none";
  if (resultElement) resultElement.style.display = "none";

  // 仍然需要查询 header-section，因为它不是全局变量
  const headerSection = document.querySelector(".header-section");
  if (headerSection) headerSection.style.display = "none";
}

// 文件上传处理
async function handleFileUpload(event) {
  console.log("📁 File upload started");
  const file = event.target.files[0];
  if (!file) {
    console.log("❌ No file selected");
    showStatus("请选择Excel文件", "error");
    return;
  }

  // 检查文件类型
  console.log("📁 File type:", file.type, "File name:", file.name);
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
}

// 提取主域名的辅助函数
function extractMainDomain(url) {
  try {
    // 确保URL有协议
    let fullUrl = url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      fullUrl = "https://" + url;
    }

    const urlObj = new URL(fullUrl);
    let domain = urlObj.hostname;

    // 移除 www. 前缀
    domain = domain.replace(/^www\./, "");

    // 获取主域名（最后两个部分）
    const parts = domain.split(".");
    if (parts.length > 2) {
      return parts.slice(-2).join(".");
    }
    return domain;
  } catch (error) {
    console.error("域名提取失败:", url, error);
    return null;
  }
}

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

        // 用于存储已处理的域名
        const processedDomains = new Map();
        const domainToUrls = new Map(); // 存储每个域名对应的所有URL

        // 第一次遍历：收集每个域名的所有URL
        jsonData.forEach((row, index) => {
          const url = row[urlColumn];
          const country = row[countryColumn];

          if (!url || !country) return;

          const urlStr = String(url).trim();
          const mainDomain = extractMainDomain(urlStr);

          if (mainDomain) {
            if (!domainToUrls.has(mainDomain)) {
              domainToUrls.set(mainDomain, []);
            }
            domainToUrls.get(mainDomain).push({
              url: urlStr,
              country: String(country).trim(),
            });
          }
        });

        // 第二次遍历：为每个域名选择最合适的URL
        domainToUrls.forEach((urls, domain) => {
          console.log(`处理域名 ${domain} 的 ${urls.length} 个URL:`);

          // 选择最短的URL作为代表（通常是主域名）
          const selectedEntry = urls.reduce((shortest, current) => {
            // 移除协议和末尾斜杠，便于比较长度
            const cleanUrl = current.url
              .replace(/^(https?:\/\/)?(www\.)?/, "")
              .replace(/\/$/, "");
            const shortestClean = shortest.url
              .replace(/^(https?:\/\/)?(www\.)?/, "")
              .replace(/\/$/, "");

            return cleanUrl.length < shortestClean.length ? current : shortest;
          }, urls[0]);

          // 确保URL格式正确
          let finalUrl = selectedEntry.url
            .replace(/^(https?:\/\/)?(www\.)?/, "")
            .replace(/\/$/, "");

          processedDomains.set(domain, {
            enCountry: getCountryCode(selectedEntry.country),
            url: finalUrl,
            country: selectedEntry.country,
            status: "unprocessed",
          });

          console.log(`✅ 选择URL: ${finalUrl} (共 ${urls.length} 个URL)`);
        });

        // 转换Map为数组，确保包含status字段
        const entries = Array.from(processedDomains.values()).map((entry) => ({
          enCountry: entry.enCountry,
          url: entry.url,
          country: entry.country,
          status: entry.status || "unprocessed", // 确保status字段被包含
        }));

        if (entries.length === 0) {
          reject(new Error("未找到有效的URL和country数据"));
          return;
        }

        console.log("SEMRUSH: 🔍 处理前数据条数:", jsonData.length);
        console.log("SEMRUSH: ✨ 去重后数据条数:", entries.length);
        console.log(
          "SEMRUSH: 📝 去重后的域名列表:",
          Array.from(processedDomains.keys())
        );

        // 保存去重后的URL和country组合到缓存中
        chrome.storage.local.set(
          {
            extractedUrls: entries,
            processingStatus: "idle",
          },
          function () {
            console.log("SEMRUSH: 💾 去重后的数据已保存:", entries);
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
  console.log("📝 Starting to display results for entries:", entries.length);

  if (!resultElement || !statusElement) {
    console.error("❌ Required UI elements not found:", {
      resultElement: !!resultElement,
      statusElement: !!statusElement,
    });
    return;
  }

  // 不显示URL列表，直接调用showReadyToProcess
  showReadyToProcess(entries.length);
}

// 显示状态信息
function showStatus(message, type) {
  console.log(`🔔 Showing status: ${message} (${type})`);

  if (!statusElement) {
    console.error("❌ Status element not found");
    return;
  }

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
  console.log("✅ Status updated successfully");
}

// 添加完成状态按钮的事件监听器
function addCompletionButtonListeners(processedData) {
  // 添加下载按钮点击事件
  document.getElementById("downloadBtn").addEventListener("click", function () {
    // 检查数据是否来自extractedUrls
    const isExtractedUrlsData =
      processedData.length > 0 && processedData[0].hasOwnProperty("status");

    // 如果是extractedUrls数据，则需要获取完整的处理数据
    if (isExtractedUrlsData) {
      chrome.storage.local.get(["processedData"], function (result) {
        const fullProcessedData = result.processedData || [];

        if (fullProcessedData.length > 0) {
          // 如果有完整的处理数据，则使用它
          console.log("使用完整的处理数据下载:", fullProcessedData.length);
          downloadProcessedData(fullProcessedData);
        } else {
          // 否则使用简化的数据格式
          console.log("使用简化的数据格式下载:", processedData.length);
          downloadSimplifiedData(processedData);
        }
      });
    } else {
      // 使用正常的处理数据
      downloadProcessedData(processedData);
    }
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

      // 显示重置成功消息
      showStatus("已重置，请重新上传文件", "success");
    });
}

// 下载完整处理数据
function downloadProcessedData(processedData) {
  const processedDataOne = Object.values(processedData) || [];
  // 转换数据为表格格式
  const excelData = processedDataOne.map((item) => {
    // 处理商务和交易关键词数据
    const commercialKeywords = item.commercialAndTransactionalKeywords || [];
    const commercialData = {
      keywords: commercialKeywords.map((k) => k.keyword).join(" | "),
      intents: commercialKeywords.map((k) => k.intent).join(" | "),
      traffic: commercialKeywords.map((k) => k.traffic).join(" | "),
      volume: commercialKeywords.map((k) => k.volume).join(" | "),
      kd: commercialKeywords.map((k) => k.kd).join(" | "),
    };

    // 处理自然搜索关键词数据
    const naturalKeywords = item.naturalSearchKeywords || [];
    const naturalData = {
      keywords: naturalKeywords.map((k) => k.keyword).join(" | "),
      volume: naturalKeywords.map((k) => k.volume).join(" | "),
      intentBadge: naturalKeywords.map((k) => k.intentBadge).join(" | "),
    };

    // 返回完整的行数据，使用引号包裹中文键名
    return {
      官网链接: item.url,
      查询国家: (item.actualCountry || "").toUpperCase(),
      联盟源数据国家: item.expectedCountry.toUpperCase(),
      品牌流量占比: item.brandRatio,
      非品牌流量占比: item.nonBrandRatio,
      流量: item.trafficValue,
      交易类关键词占比: item.transactionIntent,
      商务类关键词占比: item.businessIntent,
      商务和交易关键词: commercialData.keywords,
      商务和交易意图: commercialData.intents,
      商务和交易流量: commercialData.traffic,
      商务和交易搜索量: commercialData.volume,
      商务和交易关键词难度系数: commercialData.kd,
      自然关键词: naturalData.keywords,
      自然搜索量: naturalData.volume,
      自然关键词意图: naturalData.intentBadge,
    };
  });

  // 创建工作簿
  const wb = XLSX.utils.book_new();
  // 转换数据为工作表
  const ws = XLSX.utils.json_to_sheet(excelData);
  // 将工作表添加到工作簿
  XLSX.utils.book_append_sheet(wb, ws, "数据导出");

  // 生成Excel文件并下载
  XLSX.writeFile(
    wb,
    `semrush_data_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

// 下载简化数据
function downloadSimplifiedData(extractedUrls) {
  // 转换数据为表格格式
  const excelData = extractedUrls.map((item) => {
    return {
      网址: item.url,
      国家: item.country,
      状态: item.status,
    };
  });

  // 创建工作簿
  const wb = XLSX.utils.book_new();
  // 转换数据为工作表
  const ws = XLSX.utils.json_to_sheet(excelData);
  // 将工作表添加到工作簿
  XLSX.utils.book_append_sheet(wb, ws, "数据导出");

  // 生成Excel文件并下载
  XLSX.writeFile(
    wb,
    `semrush_urls_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

// 处理错误
function handleProcessingError(error) {
  console.error("❌ Processing error:", error);

  // 保存错误状态
  chrome.storage.local.set(
    {
      processingStatus: "error",
      currentProcessingState: {
        status: "error",
        error: error,
      },
    },
    function () {
      // 保存完成后重新检查缓存状态
      checkCacheStatusAndUpdateUI();
    }
  );

  statusElement.innerHTML = `
    <div class="error-status">
      <div class="error-icon">❌</div>
      <div class="error-text">处理出错: ${error}</div>
    </div>
  `;

  // 启用文件输入
  if (fileInput) {
    fileInput.disabled = false;
    fileInput.style.display = "block";
  }
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
    stage,
    "Status:",
    status,
    "URL:",
    currentUrl
  );

  // 保存当前处理状态到storage
  chrome.storage.local.set({ currentProcessingState: data });

  // 从缓存中获取已处理的URL数量
  chrome.storage.local.get(
    ["extractedUrls", "processedData"],
    function (result) {
      const extractedUrls = result.extractedUrls || [];
      const processedData = result.processedData || [];
      const processedCount = extractedUrls.filter(
        (url) => url.status === "processed"
      ).length;

      console.log(
        "已处理URL数量:",
        processedCount,
        "总URL数量:",
        extractedUrls.length
      );

      // 隐藏特定UI元素
      hideUIElements();

      // 显示处理状态
      statusElement.innerHTML = `
      <div class="processing-status">
        <div class="spinner"></div>
        <div class="status-text">
          <div class="progress-info">正在处理 ${
            currentIndex + 1
          }/${totalUrls}</div>
          <div class="processed-count">已处理: ${processedCount} 条数据</div>
          ${status ? `<div class="stage-info">当前状态: ${status}</div>` : ""}
          <div class="current-url">当前URL: ${currentUrl || "无"}</div>
          ${
            processedCount > 0
              ? `
          <div class="download-section">
            <button id="downloadCurrentBtn" class="button-small">下载已处理数据</button>
          </div>`
              : ""
          }
        </div>
      </div>
    `;

      // 如果有已处理的数据，添加下载按钮事件
      if (processedCount > 0) {
        document
          .getElementById("downloadCurrentBtn")
          .addEventListener("click", function () {
            // 优先使用processedData，如果为空则使用已处理的extractedUrls
            if (processedData.length > 0) {
              downloadProcessedData(processedData);
            }
          });
      }
    }
  );
}

// 下载处理中的数据
function downloadProcessingData(processedUrls) {
  console.log("下载处理中的数据:", processedUrls.length);

  // 从缓存中获取processedData
  chrome.storage.local.get(["processedData"], function (result) {
    const processedData = Object.values(result.processedData) || [];

    if (processedData.length > 0) {
      // 如果有processedData，使用它
      console.log("使用processedData下载:", processedData.length);
      downloadProcessedData(processedData);
    } else {
      // 否则使用简化的数据格式
      console.log("使用简化的数据格式下载:", processedUrls.length);
      downloadSimplifiedData(processedUrls);
    }
  });
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
    align-items: flex-start;
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
    margin-top: 3px;
  }
  .status-text {
    flex: 1;
  }
  .progress-info {
    font-size: 14px;
    font-weight: bold;
    margin-bottom: 5px;
  }
  .current-url {
    font-size: 12px;
    color: #666;
    margin-top: 5px;
    word-break: break-all;
  }
  .current-country {
    font-size: 12px;
    color: #666;
    margin-top: 3px;
  }
  .stage-info {
    font-size: 14px;
    color: #333;
    margin-top: 5px;
  }
  .processed-count {
    font-size: 14px;
    color: #4CAF50;
    margin-top: 5px;
    font-weight: bold;
  }
  .download-section {
    margin-top: 10px;
  }
  .button-small {
    background-color: #4CAF50;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
  }
  .button-small:hover {
    opacity: 0.9;
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
  .button-primary:hover, .button-secondary:hover, .button-small:hover {
    opacity: 0.9;
  }
`;
document.head.appendChild(style);
