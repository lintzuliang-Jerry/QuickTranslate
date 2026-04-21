var selectedText = "";
var tooltipEl = null;
var mouseX = 0;
var mouseY = 0;
var isTranslating = false;

var MAX_TEXT_LENGTH = 5000;

document.addEventListener("mouseup", function (event) {
  mouseX = event.clientX;
  mouseY = event.clientY;

  var sel = window.getSelection().toString().trim();
  if (sel) {
    selectedText = sel;
  }
}, true);

var isCtrlPressed = false;
var otherKeyPressed = false;
var lastTranslatedText = "";

document.addEventListener("keydown", function (event) {
  if (event.code === "ControlLeft") {
    isCtrlPressed = true;
  } else if (event.code === "Space" && isCtrlPressed && !isTranslating && selectedText) {
    event.preventDefault();
    if (selectedText === lastTranslatedText) return;

    isTranslating = true;
    lastTranslatedText = selectedText;
    var textToTranslate = selectedText;
    var truncated = false;

    if (textToTranslate.length > MAX_TEXT_LENGTH) {
      textToTranslate = textToTranslate.substring(0, MAX_TEXT_LENGTH);
      truncated = true;
    }

    showTooltip();

    var runtimeOk = false;
    try { runtimeOk = !!chrome.runtime.id; } catch (e) {}
    if (!runtimeOk) {
      isTranslating = false;
      updateTooltip({ success: false, error: "擴充功能已更新，請重新整理頁面（F5）後再試。" }, false);
      return;
    }

    try {
      chrome.runtime.sendMessage(
        { action: "translate", text: textToTranslate },
        function (result) {
          if (chrome.runtime.lastError) {
            isTranslating = false;
            updateTooltip({ success: false, error: "連線異常，請重整這頁。" }, false);
            return;
          }
          isTranslating = false;
          if (result) {
            updateTooltip(result, truncated);
          } else {
            updateTooltip({ success: false, error: "翻譯失敗，請確認網路連線。" }, false);
          }
        }
      );
    } catch (e) {
      isTranslating = false;
      updateTooltip({ success: false, error: "無法聯繫背景程式，請重整這頁。" }, false);
    }
  }
}, true);

document.addEventListener("keyup", function (event) {
  if (event.code === "ControlLeft") {
    isCtrlPressed = false;
    otherKeyPressed = false;
  }
}, true);

document.addEventListener("click", function (event) {
  if (tooltipEl && !tooltipEl.contains(event.target)) {
    removeTooltip();
  }
}, true);

function showTooltip() {
  removeTooltip();

  tooltipEl = document.createElement("div");
  tooltipEl.id = "qt-tooltip";

  var closeBtn = document.createElement("button");
  closeBtn.className = "qt-close";
  closeBtn.textContent = "\u00d7";
  closeBtn.addEventListener("click", function () {
    removeTooltip();
  });

  var loading = document.createElement("span");
  loading.className = "qt-loading";
  loading.textContent = "翻譯中...";

  tooltipEl.appendChild(closeBtn);
  tooltipEl.appendChild(loading);
  document.body.appendChild(tooltipEl);

  var left, top;
  var selection = window.getSelection();
  if (selection && selection.rangeCount > 0 && selectedText) {
    try {
      var selRect = selection.getRangeAt(0).getBoundingClientRect();
      if (selRect.width > 0 || selRect.height > 0) {
        left = selRect.left + window.scrollX;
        top = selRect.bottom + window.scrollY + 8;
      } else {
         left = mouseX + window.scrollX;
         top = mouseY + window.scrollY + 16;
      }
    } catch(e) {
      left = mouseX + window.scrollX;
      top = mouseY + window.scrollY + 16;
    }
  } else {
    left = mouseX + window.scrollX;
    top = mouseY + window.scrollY + 16;
  }

  tooltipEl.style.left = left + "px";
  tooltipEl.style.top = top + "px";

  var rect = tooltipEl.getBoundingClientRect();
  var viewW = window.innerWidth;
  var viewH = window.innerHeight;

  if (rect.right > viewW) {
    tooltipEl.style.left = Math.max(0, left - (rect.right - viewW) - 8) + "px";
  }

  if (rect.bottom > viewH) {
    var aboveTop = (top - 8) - rect.height - 16;
    if (aboveTop >= 0) {
      tooltipEl.style.top = aboveTop + "px";
    }
  }
}

function updateTooltip(result, truncated) {
  if (!tooltipEl) return;

  var content = tooltipEl.querySelector(".qt-loading");
  if (content) {
    tooltipEl.removeChild(content);
  }

  if (result.success) {
    var resultEl = document.createElement("span");
    resultEl.className = "qt-result";
    resultEl.textContent = result.translation;
    tooltipEl.appendChild(resultEl);

    var speakerEl = document.createElement("span");
    speakerEl.className = "qt-speaker";
    speakerEl.textContent = " 🔊";
    speakerEl.title = "朗讀原文";
    speakerEl.addEventListener("click", function (e) {
      e.stopPropagation();
      window.speechSynthesis.cancel();
      var msg = new SpeechSynthesisUtterance(lastTranslatedText);
      msg.lang = 'en-US';
      window.speechSynthesis.speak(msg);
    });
    tooltipEl.appendChild(speakerEl);

    if (truncated) {
      var note = document.createElement("div");
      note.className = "qt-truncated";
      note.textContent = "(文字已截斷)";
      tooltipEl.appendChild(note);
    }
  } else {
    var errorEl = document.createElement("span");
    errorEl.className = "qt-error";
    errorEl.textContent = result.error;
    tooltipEl.appendChild(errorEl);
  }
}

function removeTooltip() {
  if (tooltipEl) {
    tooltipEl.remove();
    tooltipEl = null;
    lastTranslatedText = "";
  }
}
