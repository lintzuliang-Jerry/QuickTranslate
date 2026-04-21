chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action !== "translate") return;

  var url =
    "https://api.mymemory.translated.net/get?q=" +
    encodeURIComponent(request.text) +
    "&langpair=en|zh-TW";

  fetch(url)
    .then(function (res) {
      if (!res.ok) {
        throw new Error("翻譯失敗（HTTP " + res.status + "）");
      }
      return res.json();
    })
    .then(function (data) {
      if (
        data.responseStatus === 200 &&
        data.responseData &&
        data.responseData.translatedText
      ) {
        sendResponse({
          success: true,
          translation: data.responseData.translatedText
        });
      } else {
        var errorMsg =
          (data.responseDetails) ? data.responseDetails : "回應格式異常";
        sendResponse({
          success: false,
          error: "翻譯失敗：" + errorMsg
        });
      }
    })
    .catch(function (err) {
      sendResponse({
        success: false,
        error: err.message || "翻譯失敗，請確認網路連線。"
      });
    });

  return true;
});
