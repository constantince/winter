// 提取主域名的辅助函数
function extractMainDomain(url) {
  try {
    // 确保URL有协议
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = 'https://' + url;
    }
    
    const urlObj = new URL(fullUrl);
    let domain = urlObj.hostname;
    
    // 移除 www. 前缀
    domain = domain.replace(/^www\./, '');
    
    // 获取主域名（最后两个部分）
    const parts = domain.split('.');
    if (parts.length > 2) {
      return parts.slice(-2).join('.');
    }
    return domain;
  } catch (error) {
    console.error('域名提取失败:', url, error);
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
              country: String(country).trim()
            });
          }
        });

        // 第二次遍历：为每个域名选择最合适的URL
        domainToUrls.forEach((urls, domain) => {
          console.log(`处理域名 ${domain} 的 ${urls.length} 个URL:`);
          
          // 选择最短的URL作为代表（通常是主域名）
          const selectedEntry = urls.reduce((shortest, current) => {
            // 移除协议和末尾斜杠，便于比较长度
            const cleanUrl = current.url.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
            const shortestClean = shortest.url.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
            
            return cleanUrl.length < shortestClean.length ? current : shortest;
          }, urls[0]);

          // 确保URL格式正确
          let finalUrl = selectedEntry.url;
          if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
            finalUrl = 'https://' + finalUrl;
          }

          processedDomains.set(domain, {
            url: finalUrl,
            country: selectedEntry.country
          });

          console.log(`✅ 选择URL: ${finalUrl} (共 ${urls.length} 个URL)`);
        });

        // 转换Map为数组
        const entries = Array.from(processedDomains.values());

        if (entries.length === 0) {
          reject(new Error("未找到有效的URL和country数据"));
          return;
        }

        console.log("SEMRUSH: 🔍 处理前数据条数:", jsonData.length);
        console.log("SEMRUSH: ✨ 去重后数据条数:", entries.length);
        console.log("SEMRUSH: 📝 去重后的域名列表:", Array.from(processedDomains.keys()));

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