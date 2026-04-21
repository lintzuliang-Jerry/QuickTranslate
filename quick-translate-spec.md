# QuickTranslate Chrome Extension — 完整開發規格文件

## 專案概述

一個 Chrome Extension（Manifest V3），讓使用者在瀏覽器中框選英文文字後，按下 `Ctrl` 鍵即可在選取文字附近彈出浮動視窗，顯示繁體中文翻譯結果。翻譯由 Gemini API 提供。

---

## 技術規格

- **Manifest 版本**：Manifest V3
- **翻譯 API**：Google Gemini API（`gemini-2.0-flash`）
- **語言**：純 Vanilla JavaScript（無框架）
- **API Key 儲存**：`chrome.storage.sync`

---

## 檔案結構

```
quick-translate/
├── manifest.json
├── background.js
├── content_script.js
├── content_style.css
├── popup.html
├── popup.js
├── options.html
├── options.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 各檔案規格

### `manifest.json`

```json
{
  "manifest_version": 3,
  "name": "QuickTranslate",
  "version": "1.0.0",
  "description": "框選英文文字，按 Ctrl 即時翻譯為繁體中文",
  "permissions": [
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "https://generativelanguage.googleapis.com/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content_script.js"],
      "css": ["content_style.css"]
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "options_ui": {
    "page": "options.html",
    "open_in_tab": true
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

---

### `background.js`（Service Worker）

**職責**：接收來自 content script 的翻譯請求，讀取 API Key，呼叫 Gemini API，回傳結果。

**邏輯流程**：

1. 監聽 `chrome.runtime.onMessage`，接受訊息格式：
   ```js
   { action: "translate", text: "Hello world" }
   ```

2. 從 `chrome.storage.sync` 讀取 `apiKey`。

3. 若 `apiKey` 不存在，回傳：
   ```js
   { success: false, error: "尚未設定 API Key，請點擊擴充功能圖示並前往設定頁面。" }
   ```

4. 呼叫 Gemini API：
   - Endpoint：`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
   - Method：POST
   - Headers：`Content-Type: application/json`
   - Body：
     ```json
     {
       "contents": [{
         "parts": [{
           "text": "請將以下英文翻譯為繁體中文，只需回傳翻譯結果，不需要任何解釋或前綴文字：\n\n{使用者選取的文字}"
         }]
       }]
     }
     ```

5. 解析回應，取出 `response.candidates[0].content.parts[0].text`。

6. 成功時回傳：
   ```js
   { success: true, translation: "翻譯後的文字" }
   ```

7. API 呼叫失敗或解析失敗時回傳：
   ```js
   { success: false, error: "翻譯失敗，請確認 API Key 是否正確。（錯誤：{錯誤訊息}）" }
   ```

8. 必須使用 `return true` 讓 `sendResponse` 支援非同步回應。

---

### `content_script.js`

**職責**：監聽使用者的文字選取與 Ctrl 按鍵，觸發翻譯並顯示浮動視窗。

#### 狀態變數

```js
let selectedText = "";       // 目前選取的文字
let tooltipEl = null;        // 浮動視窗 DOM element
let mouseX = 0;              // 最後一次 mouseup 的 X 座標
let mouseY = 0;              // 最後一次 mouseup 的 Y 座標
```

#### 事件監聽

**`mouseup` 事件**：
- 記錄 `event.clientX`、`event.clientY` 到 `mouseX`、`mouseY`。
- 讀取 `window.getSelection().toString().trim()`。
- 若選取內容不為空，儲存到 `selectedText`。
- 若選取內容為空，不做任何事（不要關閉已開啟的視窗）。

**`keydown` 事件**：
- 判斷條件：`event.key === "Control"` 且 `selectedText` 不為空字串。
- 觸發：呼叫 `showTooltip()`，並向 background 發送翻譯請求。
- 收到回應後，呼叫 `updateTooltip(result)`。

**`click` 事件（document）**：
- 若點擊目標不在 tooltip 內部（使用 `tooltipEl.contains(event.target)` 判斷），則關閉 tooltip。

#### 浮動視窗（Tooltip）行為

**`showTooltip()`**：
- 若已有 tooltip 存在，先移除舊的。
- 建立新的 `div#qt-tooltip` 元素，加入 DOM（`document.body`）。
- 初始內容：顯示 loading 狀態文字「翻譯中...」。
- 位置計算：
  - `left = mouseX + window.scrollX`
  - `top = mouseY + window.scrollY + 16`（在游標下方 16px）
  - 設定 `position: absolute`。
  - 視窗出現後，需判斷是否超出螢幕右邊或下方，若超出則調整位置。
- 在 tooltip 右上角加入關閉按鈕（`×`），點擊後移除 tooltip。

**`updateTooltip(result)`**：
- 若 `result.success` 為 `true`，顯示翻譯文字。
- 若 `result.success` 為 `false`，以錯誤樣式顯示 `result.error`。

**Tooltip 消失條件**：
1. 點擊 tooltip 內的 `×` 按鈕。
2. 點擊 tooltip 以外的任意區域。

---

### `content_style.css`

浮動視窗樣式需求：

```css
#qt-tooltip {
  /* 定位 */
  position: absolute;
  z-index: 2147483647; /* 最高層級，避免被頁面元素遮住 */

  /* 尺寸 */
  max-width: 320px;
  min-width: 160px;

  /* 外觀 */
  background: #ffffff;
  color: #1a1a1a;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  padding: 12px 14px;
  font-size: 14px;
  line-height: 1.6;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;

  /* 動畫 */
  animation: qt-fadein 0.15s ease;
}

@keyframes qt-fadein {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* 關閉按鈕 */
#qt-tooltip .qt-close {
  position: absolute;
  top: 6px;
  right: 8px;
  cursor: pointer;
  font-size: 16px;
  color: #999;
  line-height: 1;
  background: none;
  border: none;
  padding: 0;
}

#qt-tooltip .qt-close:hover {
  color: #333;
}

/* 翻譯中狀態 */
#qt-tooltip .qt-loading {
  color: #888;
  font-style: italic;
}

/* 錯誤狀態 */
#qt-tooltip .qt-error {
  color: #d32f2f;
  font-size: 13px;
}

/* 翻譯結果 */
#qt-tooltip .qt-result {
  color: #1a1a1a;
  word-break: break-word;
}

/* Dark mode 支援 */
@media (prefers-color-scheme: dark) {
  #qt-tooltip {
    background: #2c2c2c;
    color: #e0e0e0;
    border-color: #444;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  }
  #qt-tooltip .qt-result {
    color: #e0e0e0;
  }
  #qt-tooltip .qt-close {
    color: #aaa;
  }
  #qt-tooltip .qt-close:hover {
    color: #eee;
  }
}
```

---

### `popup.html` + `popup.js`

**UI 內容**：

```
┌─────────────────────────────┐
│  🌐 QuickTranslate           │
│                             │
│  框選文字後按 Ctrl 即可翻譯    │
│                             │
│  [ ⚙ 開啟設定 ]              │
└─────────────────────────────┘
```

**行為**：
- 點擊「開啟設定」按鈕，呼叫 `chrome.runtime.openOptionsPage()`。

**樣式要求**：
- 寬度：280px
- 簡潔現代風格，與 Chrome 內建 UI 一致
- 按鈕使用藍色主色（`#1a73e8`）

---

### `options.html` + `options.js`

**UI 內容**：

```
┌──────────────────────────────────────┐
│  QuickTranslate 設定                  │
│                                      │
│  Gemini API Key                       │
│  [__________________________________] │
│                                      │
│  [儲存]          ✓ 已儲存             │
│                                      │
│  如何取得 API Key？                   │
│  → https://aistudio.google.com/      │
└──────────────────────────────────────┘
```

**行為**：

1. 頁面載入時，從 `chrome.storage.sync` 讀取 `apiKey`，若存在則填入 input（顯示為遮蔽，type="password"）。

2. 點擊「儲存」按鈕：
   - 取得 input 的值（`.trim()`）。
   - 呼叫 `chrome.storage.sync.set({ apiKey: value })`。
   - 顯示「✓ 已儲存」成功提示（綠色，顯示 2 秒後消失）。
   - 若 input 為空，顯示「請輸入 API Key」警告。

3. 提供連結導向 `https://aistudio.google.com/` 讓使用者取得 API Key。

---

## 完整資料流說明

```
使用者框選文字
    ↓
[mouseup] → 儲存 selectedText + 記錄滑鼠座標
    ↓
使用者按下 Ctrl
    ↓
[keydown] → 檢查 selectedText 不為空
    ↓
content_script 呼叫 showTooltip()（顯示「翻譯中...」）
    ↓
chrome.runtime.sendMessage({ action: "translate", text: selectedText })
    ↓
background.js 接收
    ↓
chrome.storage.sync.get("apiKey")
    ↓ (有 API Key)
fetch Gemini API
    ↓
回傳 { success: true, translation: "..." }
    ↓
content_script 呼叫 updateTooltip()，顯示翻譯結果
```

---

## 注意事項與邊界情況

| 情況 | 處理方式 |
|------|---------|
| API Key 未設定 | Tooltip 顯示錯誤提示，引導用戶前往設定 |
| Gemini API 回應失敗（網路錯誤） | Tooltip 顯示「翻譯失敗，請確認網路連線」 |
| Gemini API Key 無效（401/403） | Tooltip 顯示「API Key 無效，請至設定頁面重新輸入」 |
| 選取文字超過 5000 字元 | content_script 截斷後送出，並在 tooltip 下方顯示「(文字已截斷)」提示 |
| Tooltip 超出螢幕右邊界 | 調整 `left` 使視窗靠左移動 |
| Tooltip 超出螢幕下邊界 | 改為顯示在選取文字上方（`top = mouseY - tooltipHeight - 8`） |
| 使用者快速連續觸發 | 每次顯示新 tooltip 前先移除舊的，不會重疊 |

---

## Icons 說明

需要在 `icons/` 資料夾提供三個尺寸的 PNG 圖示：
- `icon16.png`（16×16）
- `icon48.png`（48×48）
- `icon128.png`（128×128）

若暫時沒有圖示，可用純色佔位圖，之後替換即可。建議使用藍色系設計，代表翻譯功能。

---

## 本地開發與測試步驟

1. 在 Chrome 網址列輸入 `chrome://extensions/`
2. 開啟右上角「開發人員模式」
3. 點擊「載入未封裝項目」，選取專案資料夾
4. 前往任意英文網頁測試：框選文字 → 按 Ctrl → 應出現翻譯浮動視窗
5. 點擊 Extension 圖示 → 開啟設定 → 輸入 Gemini API Key → 儲存

---

## 給 Claude Code 的補充說明

- 所有 JS 請使用 **ES Module 以外的寫法**（Service Worker 和 content script 不支援 import/export）
- background.js 中的 `onMessage` listener 必須 `return true` 支援非同步
- content_style.css 使用 `#qt-tooltip` 作為根選擇器，避免與頁面樣式衝突
- 所有 class 名稱加上 `qt-` 前綴以避免衝突
- Tooltip 元素請直接附加到 `document.body`，不要用 Shadow DOM（避免額外複雜度）
- 圖示可以先用 canvas 或任意工具產生純色 PNG 佔位
