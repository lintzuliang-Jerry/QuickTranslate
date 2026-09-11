# QuickTranslate

框選英文後按下 `Ctrl + Space`，直接在原網頁旁顯示繁體中文翻譯，不必再複製、切換分頁和貼上。

## 為什麼做這個專案

閱讀網頁時，我通常只想查一個單字或一句短句，卻得在頁面和翻譯工具之間反覆切換。QuickTranslate 把這個流程縮成一個快捷鍵，讓查字不打斷閱讀。

## 功能

- 框選文字後按 `Ctrl + Space` 即時翻譯
- 翻譯結果顯示在選取文字附近
- 按喇叭圖示朗讀英文原文
- `Esc` 或點擊提示框外即可關閉
- 避開中文輸入法組字期間的快捷鍵誤觸
- 不需要 API Key

## 安裝

1. 下載或 clone 此專案。
2. 在 Chrome 開啟 `chrome://extensions`。
3. 開啟右上角「開發人員模式」。
4. 選擇「載入未封裝項目」，並選取此專案資料夾。

## 使用方式

1. 在任意一般網頁框選英文單字或短句。
2. 按下 `Ctrl + Space`。
3. 查看翻譯；需要時可按喇叭朗讀原文。

## 隱私與限制

- 選取的文字會傳送到 [MyMemory Translation API](https://mymemory.translated.net/) 取得翻譯，請勿用來翻譯機密內容。
- 目前固定支援英文翻譯成繁體中文，單次最多處理 5,000 個字元。
- Chrome 系統頁、擴充功能商店等受限制頁面不允許內容腳本執行。
- 翻譯品質與可用性取決於第三方服務。

## 技術

Chrome Extension Manifest V3、Vanilla JavaScript、MyMemory API、Web Speech API。

## 授權

[MIT](LICENSE)
