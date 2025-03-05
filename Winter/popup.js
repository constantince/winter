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

  let urls = [];

  // 初始化时获取当前状态
  chrome.runtime.sendMessage({ action: 'GET_STATUS' }, function(response) {
    updateUI(response);
  });

  // 设置消息监听器
  setupMessageListeners();

  // 监听来自background的进度更新
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨 Received message:', message);
    
    switch (message.action) {
        case 'PROGRESS_UPDATE':
            // 只处理进行中的状态更新
            if (message.data.status === 'processing') {
                updateUI(message.data);
            }
            break;

        case 'processingComplete':
            console.log('✅ Processing complete, enabling upload button');
            // 处理完成，启用所有按钮
            showStatus(`处理完成 ${message.data.total} 个URL`, "success");
            fileInput.disabled = false;
            fileInput.value = ''; // 清空文件输入
            processButton.disabled = false;
            processButton.dataset.status = 'completed';
            processButton.textContent = '重新开始';

            // 添加打印缓存按钮
            const printCacheButton = document.createElement('button');
            printCacheButton.id = 'printCache';
            printCacheButton.className = 'button-primary';
            printCacheButton.innerHTML = `
                <span class="icon">🖨️</span>
                <span>打印缓存</span>
            `;
            
            // 移除已存在的打印缓存按钮（如果有）
            const existingPrintButton = document.getElementById('printCache');
            if (existingPrintButton) {
                existingPrintButton.remove();
            }
            
            // 添加新按钮到状态元素后面
            statusElement.parentNode.insertBefore(printCacheButton, statusElement.nextSibling);

            // 添加点击事件处理
            printCacheButton.addEventListener('click', async () => {
                try {
                    // 获取缓存的URLs
                    const result = await chrome.storage.local.get(['extractedUrls']);
                    const urls = result.extractedUrls;
                    
                    if (!urls || urls.length === 0) {
                        showStatus('缓存中没有找到URLs', 'error');
                        return;
                    }

                    // 设置初始索引
                    await chrome.storage.local.set({ currentUrlIndex: 0 });
                    
                    console.log('📋 Cached URLs:', urls);
                    console.log('🔍 Current index set to: 0');
                    
                    showStatus(`已打印 ${urls.length} 个缓存的URLs，当前索引: 0`, 'success');
                } catch (error) {
                    console.error('❌ Error accessing cache:', error);
                    showStatus('访问缓存时出错', 'error');
                }
            });
            break;

        case 'processingError':
            console.log('❌ Processing error, enabling upload button');
            // 处理出错，启用所有按钮
            showStatus(`处理出错: ${message.error}`, "error");
            fileInput.disabled = false;
            fileInput.value = ''; // 清空文件输入
            processButton.disabled = false;
            processButton.dataset.status = 'error';
            // 更新UI显示
            updateUI(message.data);
            break;
    }
  });

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
    resultElement.innerHTML = "";

    // 更新状态显示
    showStatus("准备开始上传", "info");
  }

  // 处理按钮点击事件
  processButton.addEventListener("click", async () => {
    const currentStatus = processButton.dataset.status;
    
    switch (currentStatus) {
      case 'idle':
      case 'error':
        console.log('📤 Notifying background to start processing');
        
        // 设置初始索引缓存
        await chrome.storage.local.set({ currentUrlIndex: 0 });
        console.log('📍 Set initial URL index to 0');
        
        // 向 background 发送开始处理消息
        chrome.runtime.sendMessage({ action: 'START_PROCESSING' });
        
        // 向当前标签页的 content script 发送开始消息
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { 
              action: 'START_PROCESSING',
              message: '开始处理URLs'
            });
            console.log('📤 Sent start message to content script');
          }
        });
        break;

      case 'processing':
        chrome.runtime.sendMessage({ action: 'PAUSE_PROCESSING' });
        break;

      case 'paused':
        chrome.runtime.sendMessage({ action: 'RESUME_PROCESSING' });
        break;

      case 'completed':
        chrome.runtime.sendMessage({ action: 'RESET_PROCESSING' });
        break;
    }
  });

  // 设置消息监听器
  function setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('📨 Received message:', message); // 添加日志
        
        switch (message.action) {
            case "processingProgress":
                // 更新进度显示
                const { current, total } = message.data;
                showStatus(`正在处理: ${current}/${total}`, "processing");
                // 处理中禁用上传按钮和处理按钮
                fileInput.disabled = true;
                processButton.disabled = true;
                break;

            case "processingComplete":
                console.log('✅ Processing complete, enabling upload button'); // 添加日志
                // 处理完成，启用所有按钮
                showStatus(`处理完成 ${message.data.total} 个URL`, "success");
                fileInput.disabled = false;
                fileInput.value = ''; // 清空文件输入
                processButton.disabled = false;
                processButton.dataset.status = 'completed';
                processButton.textContent = '重新开始';
                break;

            case "processingError":
                console.log('❌ Processing error, enabling upload button'); // 添加日志
                // 处理出错，启用所有按钮
                showStatus(`处理出错: ${message.error}`, "error");
                fileInput.disabled = false;
                fileInput.value = ''; // 清空文件输入
                processButton.disabled = false;
                processButton.dataset.status = 'error';
                break;
        }
    });
  }

  // 显示状态信息
  function showStatus(message, type) {
    statusElement.innerHTML = `
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
                    header: 'A',  // 使用字母作为标题
                    raw: true,    // 保持原始值
                    defval: ''    // 空单元格的默认值
                });
                
                console.log('📋 First row:', jsonData[0]);
                console.log('📊 Total rows:', jsonData.length);

                // 尝试找到正确的列
                let targetColumn = null;
                const firstRow = jsonData[0];
                
                // 打印所有列的内容
                console.log('📑 All columns in first row:', firstRow);
                
                // 查找匹配的列（不区分大小写）
                for (let key in firstRow) {
                    const cellValue = String(firstRow[key]).trim();
                    console.log(`Column ${key}:`, cellValue);
                    if (cellValue.toLowerCase() === columnName.toLowerCase()) {
                        targetColumn = key;
                        break;
                    }
                }
                
                if (!targetColumn) {
                    console.error('❌ Column not found:', columnName);
                    console.log('Available columns:', Object.values(firstRow));
                    reject(new Error(`未找到列名 "${columnName}"。可用的列名: ${Object.values(firstRow).join(', ')}`));
                    return;
                }

                console.log('✅ Found target column:', targetColumn);
                
                // 提取并验证URL（从第二行开始）
                const urls = jsonData.slice(1)
                    .map(row => {
                        const url = row[targetColumn];
                        if (!url) {
                            console.log('⚠️ Empty cell found');
                            return null;
                        }
                        
                        // 确保URL是字符串类型
                        const urlStr = String(url).trim();
                        
                        // 验证URL格式
                        try {
                            if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
                                console.log('❌ Invalid URL format (missing protocol):', urlStr);
                                return null;
                            }
                            new URL(urlStr);
                            console.log('✅ Valid URL found:', urlStr);
                            return urlStr;
                        } catch (error) {
                            console.log('❌ Invalid URL found:', urlStr);
                            return null;
                        }
                    })
                    .filter(url => url !== null);
                
                console.log('🔍 Total valid URLs found:', urls.length);
                
                if (urls.length === 0) {
                    reject(new Error(`在"${columnName}"列中未找到有效的URL。\n请确保：\n1. URL格式正确（以http://或https://开头）\n2. 单元格不为空\n3. 列名大小写正确`));
                    return;
                }
                
                resolve(urls);
            } catch (error) {
                console.error('❌ Error processing Excel file:', error);
                reject(new Error('Excel文件处理失败: ' + error.message));
            }
        };
        
        reader.onerror = function(error) {
            console.error('❌ Error reading file:', error);
            reject(new Error('文件读取失败'));
        };
        
        reader.readAsArrayBuffer(file);
    });
  }

  // 文件输入处理
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
      startButton.disabled = true;

      // 清除之前的数据
      window.extractedUrls = null;
      await chrome.storage.local.remove(['extractedUrls', 'extractionTime']);

      // 获取用户输入的列名
      const userColumnName = columnInput.value.trim();
      console.log('🔍 Looking for column:', userColumnName);

      // 处理新文件
      const urls = await extractUrlsFromExcel(file, userColumnName);
      
      if (urls.length === 0) {
        showStatus("未找到URL", "warning");
        startButton.disabled = false;
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
      startButton.disabled = false;
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

  function displayResults(urls) {
    console.log('📝 Displaying results for URLs:', urls.length);
    
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

    resultElement.innerHTML = resultsHtml;

    // 添加虚拟滚动处理
    const urlListElement = resultElement.querySelector(".url-list");
    if (urls.length > 100) {
      implementVirtualScroll(urlListElement, urls);
    }

    // 将URLs保存到Chrome存储中，并更新全局变量
    window.extractedUrls = urls;  // 保存到全局变量
    chrome.storage.local.set({ 
      extractedUrls: urls,
      extractionTime: new Date().toISOString()
    }).then(() => {
      console.log('💾 URLs saved to storage:', urls.length);
      
      // 更新处理按钮状态
      processButton.style.display = 'inline-block';
      processButton.disabled = false;
      processButton.dataset.status = 'idle';
      processButton.textContent = '开始处理';
      
      showStatus(`已保存 ${urls.length} 个URL`, "success");
    }).catch(error => {
      console.error('❌ Error saving URLs:', error);
      showStatus("保存URL时出错", "error");
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

  // 更新UI显示
  function updateUI(data) {
    if (!data) return;

    const { status, progress, processed, failed, total, error } = data;
    console.log('🔄 Updating UI with status:', status); // 添加日志

    // 更新状态显示
    switch (status) {
        case 'idle':
            statusElement.textContent = '准备就绪';
            processButton.textContent = '开始';
            processButton.dataset.status = 'idle';
            fileInput.disabled = false; // 确保文件上传按钮启用
            break;
        case 'processing':
            statusElement.textContent = `处理中... ${Math.round(progress)}%`;
            processButton.textContent = '暂停';
            processButton.dataset.status = 'processing';
            fileInput.disabled = true; // 禁用文件上传
            break;
        case 'paused':
            statusElement.textContent = '已暂停';
            processButton.textContent = '继续';
            processButton.dataset.status = 'paused';
            fileInput.disabled = true; // 保持文件上传禁用
            break;
        case 'completed':
            statusElement.textContent = '处理完成';
            processButton.textContent = '重新开始';
            processButton.dataset.status = 'completed';
            fileInput.disabled = false; // 启用文件上传
            fileInput.value = ''; // 清空文件输入
            break;
        case 'error':
            statusElement.textContent = `错误: ${error}`;
            processButton.textContent = '重试';
            processButton.dataset.status = 'error';
            fileInput.disabled = false; // 启用文件上传
            fileInput.value = ''; // 清空文件输入
            break;
    }

    // 更新结果显示
    if (total > 0) {
        resultElement.innerHTML = `
            <div class="progress-bar">
                <div class="progress" style="width: ${progress}%"></div>
            </div>
            <div class="stats">
                <div>总计: ${total}</div>
                <div>已处理: ${processed}</div>
                <div>失败: ${failed}</div>
            </div>
        `;
    }
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
