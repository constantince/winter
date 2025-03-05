/**
 * 从Excel文件中提取URL字段数组
 * @param {File} file - Excel文件对象
 * @param {string} urlColumnName - 包含URL的列名
 * @returns {Promise<string[]>} URL数组
 */
function extractUrlsFromExcel(file, urlColumnName) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function (e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {
          type: "array",
          codepage: 65001, // 使用 UTF-8 编码
        });

        // 获取第一个工作表
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // 将工作表转换为JSON对象数组
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          raw: false, // 返回格式化的字符串
          defval: "", // 空单元格的默认值
        });

        // 调试信息
        console.log("Excel数据:", jsonData);
        console.log("查找的列名:", urlColumnName);

        // 查找匹配的列名（忽略大小写）
        const targetColumnName = Object.keys(jsonData[0] || {}).find(
          (key) => key.toLowerCase() === urlColumnName.toLowerCase()
        );

        if (!targetColumnName) {
          throw new Error(`未找到列名为 "${urlColumnName}" 的列（忽略大小写）`);
        }

        console.log("找到的列名:", targetColumnName);

        // 提取URL字段
        const urls = jsonData
          .map((row) => {
            const url = row[targetColumnName];
            return url ? url.toString().toLowerCase().trim() : "";
          })
          .filter((url) => url); // 过滤掉空值

        console.log("提取的URLs:", urls);

        resolve(urls);
      } catch (error) {
        console.error("处理Excel文件时出错:", error);
        reject(error);
      }
    };

    reader.onerror = function (error) {
      console.error("读取文件时出错:", error);
      reject(error);
    };

    reader.readAsArrayBuffer(file);
  });
}
