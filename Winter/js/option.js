$(document).ready(function() {

    chrome.storage.local.get(["review", "bullets"], function(item) {
        console.log("success!!", item)
        if(item.review) {
            $('input[name="review"]').prop('checked', true);
            $('input[name="rating"]').filter(function() {
                return $(this).val() === item.review.rating.join(",");
            }).prop('checked', true);
            $('input[name="reviews"]').filter(function() {
                return $(this).val() === item.review.reviews;
            }).prop('checked', true);
        }

        if(item.bullets) {
            $('input[name="bullets"]').prop('checked', true);
            $('input[name="product"]').val(item.bullets.products)
            $('input[name="kw"]').val(item.bullets.kw)
            $('input[name="brand"]').val(item.bullets.brand)

        }
    });

    $("#toggle-button").click(function() {
      $("#content-container").toggle();
    });
  
    $(".tab").click(function() {
      $(".active").removeClass("active");
      $(this).addClass("active");
      let index = $(".tab").index(this);
      $(".content").eq(index).addClass("active");
    });

    // 点击保存
    $("#optons-form").submit(function(e){
        e.preventDefault();
        const user_data = {
            review: this.review.checked ? {
                reviews: this.reviews.value,
                rating: this.rating.value.split(',')
            } : null,
            // question: this.question.checked ? {
            //     qna: this.qna.value
            // } : null,
            bullets: this.bullets.checked ? {
                products: this.product.value,
                kw: this.kw.value,
                brand: this.brand.value
            } : null
        }
        console.log(user_data);
        // 保存数据
        chrome.storage.local.set(user_data, function() {
            alert("Successed!")
            console.log("success!!")
        });
    })
    
  });