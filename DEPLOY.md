# Cloudflare Pages + Google Sheet 發布步驟

這個專案建議用 Cloudflare Pages 發布前台，並用 Google Apps Script 把訂單寫進 Google Sheet。

## 1. 建立 Google Sheet API

1. 建立一份新的 Google 試算表。
2. 進入「擴充功能」>「Apps Script」。
3. 把 `google-apps-script/Code.gs` 的內容貼到 Apps Script 編輯器。
4. 儲存後按「部署」>「新增部署作業」。
5. 類型選「網頁應用程式」。
6. 執行身分選「我」。
7. 存取權選「所有人」。
8. 部署後複製 Web App URL。

## 2. 設定前台 API 網址

打開 `public/config.js`，把網址填進去：

```js
window.ORDER_API_BASE_URL = "https://script.google.com/macros/s/你的部署ID/exec";
```

## 3. 發布到 Cloudflare Pages

1. 建立 GitHub repository。
2. 上傳整個專案。
3. 到 Cloudflare > Workers & Pages > Create。
4. 選 Pages，並連接 GitHub repository。
5. 選 `OrderSystem` repository。
6. 設定如下：

```text
Production branch: main
Framework preset: None
Build command: 留空
Build output directory: public
Root directory: 留空
```

7. 按 Save and Deploy。

發布完成後，Cloudflare Pages 網址就是給客人填寫的連結。

## 注意

- 點餐頁可以公開給知道連結的人填寫。
- 訂單會存在 Google Sheet 的 `Orders` 工作表。
- `orders.html` 是簡易查看頁，不建議當成正式後台權限控管。
- 若要保護訂單資料，請直接用 Google Sheet 管理權限，或在 Apps Script 加上後台驗證。
- Cloudflare Pages 發布來源請設定為 `public/`。
