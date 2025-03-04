// document.getElementById("login-btn").addEventListener("click", login, false);
// 是否登录 未登录要设置badage
chrome.storage.sync.get({user: ''}, function(items) {
    if(items.user) { // loged out;
        document.body.innerHTML = `<a href="javascript:void(0);">查看后台</a>`;
    }
});

document.body.addEventListener("click", (event) => {
    if(event.target.tagName === "A") {
        chrome.tabs.create({ url: "https://www.example.com" })
    }

    if( event.target.id === "login-btn") {
        login() 
    }
   
}, false);

function login() {
    var email = document.getElementById("email").value;
    var password = document.getElementById("password").value;
    console.log("email:", email, "password:", password);
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'login.php');
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onload = function() {
      if (xhr.status === 200) {
        // handle success response
      } else {
        // handle error response
      }
    };
  
      // 保存数据
      chrome.storage.sync.set({user: email}, function() {
          console.log("loged...");
          document.body.innerHTML = `<a href="javascript:void(0);">查看后台</a>`;
          chrome.action.setBadgeText({text: email});
      });
  
     
  
  //   xhr.send('email=' + encodeURIComponent(email) + '&password=' + encodeURIComponent(password));
}