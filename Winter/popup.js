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
  const resultElement = document.getElementById("result");
  const statusElement = document.getElementById("status");
  const fileInput = document.getElementById("excelFile");
  const columnInput = document.getElementById("columnName");

  // 初始化时获取处理状态
  chrome.storage.local.get(
    ['processingStatus', 'currentUrlIndex', 'extractedUrls', 'processedData'],
    function(result) {
      const { processingStatus, currentUrlIndex, extractedUrls, processedData = [] } = result;
      
      if (processingStatus === 'processing') {
        // 如果正在处理中，显示加载状态
        showProcessingStatus(currentUrlIndex, extractedUrls);
      } else if (processingStatus === 'completed') {
        // 如果处理完成，显示下载按钮
        showCompletionStatus(processedData);
      }
    }
  );

  // 监听来自content script的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨 Received message:', message);
    
    switch (message.action) {
      case 'PROGRESS_UPDATE':
        updateProcessingStatus(message.data);
        break;

      case 'PROCESSING_COMPLETE':
        handleProcessingComplete(message.data);
        break;

      case 'CONTENT_SCRIPT_ERROR':
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
      case 'idle':
      case 'error':
        console.log('📤 Starting URL processing');
        
        // 隐藏特定UI元素
        if (fileInput) fileInput.style.display = 'none';
        if (columnInput) columnInput.style.display = 'none';
        if (processButton) processButton.style.display = 'none';
        if (resultElement) resultElement.innerHTML = '';
        
        // 设置初始索引缓存和处理状态
        await chrome.storage.local.set({ 
          currentUrlIndex: 0,
          processingStatus: 'processing'
        });
        
        // 更新界面状态
        showProcessingStatus(0, await getExtractedUrls());
        
        // 发送开始处理消息
        chrome.runtime.sendMessage({ action: 'START_PROCESSING' });
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { 
              action: 'START_PROCESSING',
              message: '开始处理URLs'
            });
          }
        });
          break;
    }
  });

  // 文件上传处理
  fileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) {
      showStatus("请选择Excel文件", "error");
      return;
    }

    // 检查文件类型
    console.log('📁 File type:', file.type);
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    
    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      showStatus("请上传有效的Excel文件（.xlsx, .xls）或CSV文件", "error");
      return;
    }

    try {
      showStatus("正在处理Excel文件...", "processing");

      // 清除之前的数据
      await chrome.storage.local.remove(['extractedUrls', 'processedData', 'processingStatus', 'currentUrlIndex']);

      // 获取用户输入的列名
      const userColumnName = columnInput.value.trim();
      console.log('🔍 Looking for column:', userColumnName);

      // 处理新文件
      const urls = await extractUrlsFromExcel(file, userColumnName);

      if (urls.length === 0) {
        showStatus("未找到URL", "warning");
        resultElement.innerHTML = `
          <div class="error-message">
            <p>在指定列中没有找到任何URL。请检查：</p>
            <ul>
              <li>列名是否正确（当前：${userColumnName}）</li>
              <li>Excel文件是否包含URL数据</li>
              <li>URL单元格是否为空</li>
            </ul>
          </div>`;
      } else {
        // 显示结果并保存数据
        displayResults(urls);
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
  async function extractUrlsFromExcel(file, columnName) {
    console.log('📑 Processing Excel file:', file.name);
    console.log('🔍 Looking for column:', columnName);
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = function(e) {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // 获取第一个工作表
          const firstSheetName = workbook.SheetNames[0];
          console.log('📊 Sheet name:', firstSheetName);
          const worksheet = workbook.Sheets[firstSheetName];
          
          // 转换为JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 'A',
            raw: true,
            defval: ''
          });
          
          // 查找目标列
          let targetColumn = null;
          const firstRow = jsonData[0];
          
          for (let key in firstRow) {
            if (String(firstRow[key]).trim().toLowerCase() === columnName.toLowerCase()) {
              targetColumn = key;
              break;
            }
          }
          
          if (!targetColumn) {
            reject(new Error(`未找到列名 "${columnName}"`));
            return;
          }
          
          // 提取URLs
          const urls = jsonData.slice(1)
            .map(row => {
              const url = row[targetColumn];
              if (!url) return null;
              
              const urlStr = String(url).trim();
              try {
                if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
                  return 'https://' + urlStr;
                }
                new URL(urlStr);
                return urlStr;
              } catch (error) {
                return null;
              }
            })
            .filter(url => url !== null);
          
          if (urls.length === 0) {
            reject(new Error('未找到有效的URL'));
            return;
          }
          
          resolve(urls);
        } catch (error) {
          reject(new Error('Excel文件处理失败: ' + error.message));
        }
      };
      
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsArrayBuffer(file);
    });
  }

  // 显示结果
  function displayResults(urls) {
    console.log('📝 Displaying results for URLs:', urls.length);
    
    const urlList = urls
      .map((url, index) => `
        <div class="url-item">
            <span class="url-number">${index + 1}.</span>
            <div class="url-link">
                <a href="${url}" target="_blank" title="${url}">${url}</a>
            </div>
        </div>
      `).join('');

    resultElement.innerHTML = `
        <div class="success-message">
            <strong>提取结果（共 ${urls.length} 个URL）：</strong>
        </div>
        <div class="url-list">
            ${urlList}
      </div>
    `;

    // 保存URLs到存储
    chrome.storage.local.set({
      extractedUrls: urls,
      processingStatus: 'idle'
    }, function() {
      console.log('💾 URLs saved:', urls.length);
      processButton.style.display = 'inline-block';
      processButton.disabled = false;
      processButton.dataset.status = 'idle';
      processButton.textContent = '开始处理';
      showStatus(`已保存 ${urls.length} 个URL`, "success");
    });
  }

  // 显示状态信息
  function showStatus(message, type) {
    statusElement.innerHTML = `
      <div class="status-message ${type}">
        <span class="icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'processing' ? '⏳' : 'ℹ️'}</span>
        <span>${message}</span>
      </div>
    `;
  }

  // 显示处理状态
  function showProcessingStatus(currentIndex, urls) {
    if (!urls) return;
    
    const currentUrl = urls[currentIndex];
    
    // 隐藏特定UI元素
    if (fileInput) fileInput.style.display = 'none';
    if (columnInput) columnInput.style.display = 'none';
    if (processButton) processButton.style.display = 'none';
    if (resultElement) resultElement.innerHTML = '';
    
    // 显示处理状态
    statusElement.innerHTML = `
      <div class="processing-status">
        <div class="spinner"></div>
        <div class="status-text">
          正在处理 ${currentIndex + 1}/${urls.length}
          <div class="current-url">${currentUrl}</div>
        </div>
      </div>
    `;

    // 强制重绘界面
    statusElement.style.display = 'none';
    statusElement.offsetHeight; // 触发重排
    statusElement.style.display = 'block';
  }

  // 显示完成状态
  function showCompletionStatus(processedData) {
    // 隐藏特定UI元素
    if (fileInput) fileInput.style.display = 'none';
    if (columnInput) columnInput.style.display = 'none';
    if (processButton) processButton.style.display = 'none';
    if (resultElement) resultElement.innerHTML = '';

    statusElement.innerHTML = `
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

    // 添加下载按钮点击事件
    document.getElementById('downloadBtn').addEventListener('click', function() {
      // 创建下载文件
      const dataStr = JSON.stringify(processedData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // 创建下载链接
      const a = document.createElement('a');
      a.href = url;
      a.download = `processed_data_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    // 添加重新开始按钮点击事件
    document.getElementById('resetBtn').addEventListener('click', async function() {
      // 清除所有存储的数据
      await chrome.storage.local.clear();
      
      // 重置UI
      if (fileInput) {
        fileInput.style.display = 'block';
        fileInput.value = '';
      }
      if (columnInput) {
        columnInput.style.display = 'block';
        columnInput.value = '';
      }
      if (resultElement) resultElement.innerHTML = '';
      if (statusElement) statusElement.innerHTML = '';
      
      // 重置按钮状态
      if (processButton) {
        processButton.style.display = 'none';
        processButton.disabled = false;
        processButton.dataset.status = 'idle';
        processButton.textContent = '开始处理';
      }
    });
  }

  // 处理错误
  function handleProcessingError(error) {
    statusElement.innerHTML = `
      <div class="error-status">
        <div class="error-icon">❌</div>
        <div class="error-text">处理出错: ${error}</div>
      </div>
    `;
    
    // 启用文件输入和处理按钮
    fileInput.disabled = false;
    processButton.disabled = false;
    processButton.dataset.status = 'error';
  }

  // 更新处理状态
  function updateProcessingStatus(data) {
    const { currentIndex, totalUrls, currentUrl, stage, status } = data;
    console.log('🔄 Updating progress:', currentIndex + 1, '/', totalUrls, 'Stage:', stage);
    
    // 隐藏特定UI元素
    if (fileInput) fileInput.style.display = 'none';
    if (columnInput) columnInput.style.display = 'none';
    if (processButton) processButton.style.display = 'none';
    if (resultElement) resultElement.innerHTML = '';

    // 更新进度显示
    statusElement.innerHTML = `
      <div class="processing-status">
        <div class="spinner"></div>
        <div class="status-text">
          正在处理 ${currentIndex + 1}/${totalUrls}
          <div class="stage-info">${status}</div>
          <div class="current-url">${currentUrl}</div>
        </div>
      </div>
    `;

    // 强制重绘界面
    statusElement.style.display = 'none';
    statusElement.offsetHeight; // 触发重排
    statusElement.style.display = 'block';
  }

  // 处理完成
  function handleProcessingComplete(data) {
    chrome.storage.local.set({ 
      processingStatus: 'completed'
    }, function() {
      showCompletionStatus(data.finalData);
    });
  }

  // 获取已提取的URLs
  async function getExtractedUrls() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['extractedUrls'], function(result) {
        resolve(result.extractedUrls || []);
      });
    });
  }

  // 添加必要的CSS样式
  const style = document.createElement('style');
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
