console.log("welcome to amazon online shopping store");
chrome.storage.sync.clear();
let MAXREVIEWMUN,STARINDEX;
const URLs = window.location.href;
let _review, _question, _bullets; // 来自用户的设置参数
let ASIN;
var Btn = document.createElement("button"); // 界面右上角按钮
// console.log(ASIN); // 输出 B08KJQG2M8
//
chrome.storage.local.get(["review", "question", "bullets"], function (items) {
  _review = items.review;
  _question = items.question;
  _bullets = items.bullets;
});

// ask and answer list
//https://www.amazon.com/ask/questions/inline/B01H6GUCCQ/3

// class for virtual dom
function DomCreator() {
  this.body = document.body;
  this.fakeDiv = null;

  this.init();
}
// 判断好评、差评或者中评
function ratingClassify() {
  if(_review.rating[0] == 1) return 'Negative'
  if(_review.rating[0] == 3) return 'Moderate'
  if(_review.rating[0] == 4) return 'Positive'
  return false;
}

DomCreator.prototype.init = function () {
  this.fakeDiv = this.createFakeDiv();
  this.createInitBtn();
  // this.getBulletsBtn();
  // this.createBadgeInReview();
};

DomCreator.prototype.createBadgeInReview = function () {
  var badge = document.createElement("span");
  badge.className = "ai-amz-summary";
  badge.innerHTML = "summary this comment";
  var review_wrapper = $(".review-text-content");
  review_wrapper.append(badge);
  $("body .ai-amz-summary").on("click", function () {
    var el = $(this);
    var siblings = el.siblings();
    var raw = siblings.html();
    console.log(raw);
    // if( el.hasClass("ai-amz-transformed-span") ) {
    //     siblings.attr("data-raw", raw).html(res.result).removeClass("ai-amz-transformed-span");
    //     return;
    // }
    // sendDataToServer(undefined, {message: raw}).then(res => {
    //     siblings.attr("data-raw", raw).html(res.result).addClass("ai-amz-transformed-span");
    //     // console.log(siblings.html().length,res.result);
    // });
    // console.log(siblings.html());
  });
};

DomCreator.prototype.createFakeDiv = function () {
  var div = document.createElement("div");
  div.className = "fake-div-wrapper";
  div.style.block = "none";
  this.body.appendChild(div);
  return $(div);
};

DomCreator.prototype.getBulletsBtn = function () {
  var Btn = document.createElement("button");
  Btn.innerHTML = "Bullets";
  Btn.className = "ai-amz-bullets-btn";
  document.body.appendChild(Btn);
  var bullets = "";
  $("body .ai-amz-bullets-btn").on("click", function () {
    console.log(Collector.getBullets());
  });
};

DomCreator.prototype.all = (done) => {
    if(_review.rating.length === 2) {
      Collector.getReviews(function(r1){
        Collector.getReviews(function(r2){
            done(r2);
        }, _review.rating[1]);
      }, _review.rating[0]);
    } else {
      Collector.getReviews(function(r1){
        done(r1)
      }, _review.rating[0]);
    }
}

DomCreator.prototype.createInitBtn = function () {
    var _self = this;
    chrome.storage.sync.get({collections: null }, function (items) {
        if( items.collections && items.collections.indexOf(URLs) > -1 ) { // 界面获取过数据了
            Btn.className = "ai-amz-init-btn";
            Btn.innerHTML = "Loaded";
            Btn.disabled = true;
        } else { // 界面没有被获取过数据
            Btn.className = "ai-amz-init-btn";
            Btn.innerHTML = "Load";
        }
        document.body.appendChild(Btn);
        var send = _self.sendToBackground;
        $("body .ai-amz-init-btn").on("click", function () {
            // chrome.storage.sync.get({ user: "" }, function (items) {
              // if (items.user) {
                // 已经登录
                // get reviews
                Btn.disabled = true;
                Btn.innerHTML = "Loading...";
                // this.all().then((...jsons) => {
                //    const json = jsons.reduce((prev, next) => {
                //       return prev.contact(next);
                //    },[]);
                   
                // })
                _self.all(function (res) {
                  // console.log(res);
                  
                  const workbook = XLSX.utils.book_new();
                 
                  //配置参数
                  workbook.SheetNames.push("params");
                  const worksheet0 = XLSX.utils.json_to_sheet([{
                    rating: ratingClassify(),
                    bullets: !!_bullets

                  }]);
                  workbook.Sheets["params"] = worksheet0;

                  //1. reviews
                  // XLSX.utils.book_append_sheet(workbook, worksheet, 'reviews');
                  workbook.SheetNames.push("reviews");
                  const worksheet = XLSX.utils.json_to_sheet(res);
                  workbook.Sheets["reviews"] = worksheet;
                  


                  //2. list
                  if( _bullets ) {
                    // const workbook1 = XLSX.utils.book_new();
                    workbook.SheetNames.push("bullets");
                    const worksheet1 = XLSX.utils.json_to_sheet(Collector.getBullets());
                    workbook.Sheets["bullets"] = worksheet1;

                    // XLSX.utils.book_append_sheet(workbook1, worksheet1, 'bullets');
                  }
                 




                  // 将工作簿保存到文件并进行下载
                  XLSX.writeFile(workbook, 'amazon_review.xlsx');
                  
                  
                  
                  Btn.innerHTML = "Check";
                  Btn.disabled = false;
                  Btn.onclick = function() {
                    window.location.href = "https://aiamzplus.com/excel-upload.html";
                  }
                  // var data = {
                  //   product: "gaming keyboard",
                  //   //   product: $(".prodDetAttrValue")
                  //   user: items.user,
                  //   title: $("#productTitle").text(),
                  //   url: window.location.href,
                  //   reviews: res,
                  //   bullets: Collector.getBullets(),
                  // };
                  // console.log("sending data", data);
                  // send(data);
                });
              // } else {
              //   // 未登录
              // }
            // });
        
            // get bullets list
            // console.log(Collector.getBullets());
          });
    })
 
  
 


};

DomCreator.prototype.sendToBackground = function (data) {
  chrome.runtime.sendMessage(
    {
      callName: "browse_plugin:getpageinfo",
      data: data,
    },
    function (response) {
      console.log(response);
    }
  );
};

// class for page content
function ContentCollector() {
  this.allReviews = [];
  this.reviewLiks =
    "https://www.amazon.com/hz/reviews-render/ajax/reviews/get/ref=cm_cr_arp_d_paging_btm_next_";
  this.regex = new RegExp(
    /<span\s[^>].*review-text-content\">[\n\s]*\<span\s*\>\s*(.*)<\/span>[\n\s]*<\/span>/gm
  );
}

ContentCollector.prototype.getReivewsHttpLink = function () {
  var view_all_reviews = $("a[data-hook*='see-all-reviews-link-foot']");
  var links = view_all_reviews.attr("href");
  return links;
};

let process;
const type = [null, "one_star", "two_star", "three_star", "four_star", "five_star"]
// get all review
ContentCollector.prototype.getReviews = function (cb, star = 1, page ) {
  page = page ? page  : 1;
  var _self = this;
  Btn.innerHTML = (_self.allReviews.length / _review.reviews) * 100 + '%';
  // TODO 
  if (process === "done" || _self.allReviews.length >= _review.reviews ) {
    process = null;
    cb(_self.allReviews);
    return;
  }

  console.log("sending request...", "page:", page, "max page:", _review.reviews);
  // return;
  const params = new URLSearchParams({
    sortBy: "",
    reviewerType: "all_reviews",
    formatType: "",
    mediaType: "",
    filterByStar: type[star],
    filterByAge: "",
    pageNumber: page,
    filterByLanguage: "",
    filterByKeyword: "",
    shouldAppend: undefined,
    deviceType: "desktop",
    canShowIntHeader: undefined,
    reftag: "cm_cr_arp_d_paging_btm_next_" + page,
    pageSize: 10,
    asin: ASIN,
    scope: "reviewsAjax0",
  });

  fetch(_self.reviewLiks + page, {
    method: "POST",
    headers: {
      Accept: "text/html,*/*",
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    credentials: "include", //表示请求是否携带cookie
    body: params.toString(),
  })
    .then(function (response) {
      return response.text();
    })
    .then(function (html) {
      // console.log(html);
      var srcipts = html.split(/\n&{3}/g);
      // console.log(srcipts.lenth, process);
      var targetContent = srcipts.filter((v) => {
        return /cm_cr-review_list/.test(v) && /review-body/g.test(v);
      });

      // console.log(targetContent.length);
      if( targetContent.length == 0) {
         process = "done";
      }
      targetContent.forEach((v) => {
        var cleaning_data = v.replace(/^\n+/g, "");
        var json = JSON.parse(cleaning_data);
        var str_without_script = json[2].replace(
          /<script>[^<]+<\/script>/g,
          ""
        );
        Creator.fakeDiv.html(str_without_script);
        var f_div = Creator.fakeDiv;
        var content = f_div
          .find(".review-text-content")
          .text()
          .trim()
          .replace(/\n/gm, "");
        var star = f_div
          .find('[data-hook$="review-star-rating"]')
          .text()
          .trim()
          .match(/\d/)[0];
        var title = f_div.find(".review-title-content").text().trim();
        //    var author = f_div.find('.a-profile-content').text().trim();
        var asin = f_div.find('[data-hook="review"]').attr("id");

        //    Creator.fakeDiv.html('');
        _self.allReviews.push({
          content,
          star,
          title,
          asin,
        });
      });
      // console.log(_self.allReviews);
      // console.log(page, " done");
      // var reviews = html.match(_self.regex);
      // reviews.map(v => {

      //     Creator.fakeDiv.html(v);
      //     // get review date
      //     // var date = fakeDiv.find('.review-date').text();
      //     // get review content
      //     var content = Creator.fakeDiv.find('.review-text-content').text().trim().replace(/\n/gm, '');
      //     // REVIEWS.push(v.replace())
      //     Creator.fakeDiv.html('');
      //     _self.allReviews.push(content);
      //     // recure the method;

      // })
      // console.log(page, " done");
      _self.getReviews(cb, star, page+1);
      // console.log(reviews);
    })
    .catch(function (ex) {
      console.log(ex);
    });
};

ContentCollector.prototype.parseRawText = function () {};

ContentCollector.prototype.getBullets = function () {
  var list = [];
  var bullets = $("#feature-bullets ul li");
  bullets.each(function (el, i) {
    var text = $(this).find("span").html();
    if (/replacementPartsFitmentBulletInner/g.test(text) == false) {
      list.push({list:text,..._bullets});
    }
  });
  // console.log("bullet list:", list);
  return list;
};
