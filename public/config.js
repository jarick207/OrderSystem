// localhost 會使用同一台 server 的 /api；正式網站會使用 Google Apps Script。
const isLocalServer = ["localhost", "127.0.0.1"].includes(window.location.hostname);

window.ORDER_API_BASE_URL = isLocalServer
  ? ""
  : "https://script.google.com/macros/s/AKfycbx06NwSj-ZbRFWNKNHXgZqk8MHw-4Yva474UFaWamLEbbliwZBlBEVPkeIwDY6wLU-7nA/exec";
