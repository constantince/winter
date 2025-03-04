// // // web请求监听，最后一个参数表示阻塞式，需单独声明权限：webRequestBlocking
// chrome.webRequest.onBeforeRequest.addListener(details => {
// 	// cancel 表示取消本次请求
// 	// if(!showImage && details.type == 'image') return {cancel: true};
// 	// 简单的音视频检测
// 	console.log(details);
// }, {urls: ["https://www.amazon.com/hz/reviews-render/ajax/reviews/get/ref=cm_cr_getr_d_paging_btm_next_*"]}, []);
// console.log(XLSX);
// 监听来自content-script的消息
chrome.runtime.onMessage.addListener(async function (
  request,
  sender,
  sendResponse
) {
  // console.log('收到来自content-script的消息：');
  // console.log(request, sender, sendResponse);
  // sendResponse('我是后台，我已收到你的消息：');
  if (request.callName === "browse_plugin:getpageinfo") {
    let messageData = {
      type: "ajax",
      content: "ok",
    };
    fetch("https://www.amamiya.cc/amz/api/pageinfo", {
      method: "post",
      body: JSON.stringify(request.data),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (json) {
        if (json.status !== "ok") {
          messageData.content = "failed";
        }

        // Send a message to the currently active tab's content.js script
        chrome.tabs.query(
          { active: true, currentWindow: true },
          function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, messageData);
          }
        );
      })
      .catch(function (ex) {
        let messageData = {
          type: "ajax",
          content: "failed",
        };
        chrome.tabs.query(
          { active: true, currentWindow: true },
          function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, messageData);
          }
        );
      });

    sendResponse("data sending in background.....");
  }

  if (request.callName === "browse_plugin:loginbadagesettle") {
    chrome.action.setBadgeText({ text: "please login" });
    chrome.action.setBadgeBackgroundColor({ color: [255, 0, 0, 255] });
  }

  if (request.callName === "browse_plugin:loged") {
    chrome.action.setBadgeText({ text: request.data });
  }

  if (request.callName === "browse_plugin:test") {
  }
});

// web请求监听，最后一个参数表示阻塞式，需单独声明权限：webRequestBlocking
// chrome.webRequest.onBeforeRequest.addListener(details => {
//     log("paged...")
// }, {urls: ["https://www.amazon.com/*"]});
