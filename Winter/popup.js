var start = document.getElementById('start');
var end = document.getElementById('stop');

start.addEventListener('click', async () => {
    const status = start.innerText;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0].id;
    chrome.tabs.sendMessage(activeTab, { action: status === "Start" ? 'start' : "pause" });
    tabState(status)

  });
});

function tabState(action) {
  if(action === "Start") {
    start.innerText = "Pause";
  } else {
   start.innerText = "Start";
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'dataScraped') {
    const data = message.data;
    console.log('Scraped Data:', data);
    // 在这里处理抓取到的数据，例如显示在 popup 页面上
  }
});

function changeBackgroundColor() {
  document.body.style.backgroundColor = '#ffcc00';
}