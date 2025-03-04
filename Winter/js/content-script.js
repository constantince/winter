// document.addEventListener('DOMContentLoaded', initialization);
// const URLs = window.location.href;

// inti function
function initialization() {
    //https://vip1.semrush.fun/projects/
    // const pattern = /https?:\/\/(vip\d)\.semrush\.fun\/projects\/?$/;
    // if (!pattern.test(URLs)) {
    //     console.error("Not in the relevant product page")
    //     return;
    // }
	// code excute here;
    console.log("start to geting data...")
    window.location.href = "https://vip1.semrush.fun/analytics/overview/?q=baidu.com&protocol=https&searchType=domain"
}


function pause() {
    console.log("paused...")
}


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'start') {
    // 这里编写抓取页面数据的逻辑
    initialization()
    // 将抓取的数据发送回 popup.js
    // chrome.runtime.sendMessage({ action: 'dataScraped', data: { title: pageTitle, content: pageContent } });
  }



  if (message.action === 'pause') {
    // 这里编写抓取页面数据的逻辑
    pause();
    // 将抓取的数据发送回 popup.js
    // chrome.runtime.sendMessage({ action: 'dataScraped', data: { title: pageTitle, content: pageContent } });
  }
});