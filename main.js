const properties = PropertiesService.getScriptProperties();
const SLACK_WEBHOOK_URL = properties.getProperty("SLACK_WEBHOOK_URL_TEST");
// const SLACK_WEBHOOK_URL = properties.getProperty("SLACK_WEBHOOK_URL_NEWS");
const NOTION_API_KEY = properties.getProperty("NOTION_API_KEY");
const NOTION_DATABASE_ID = properties.getProperty("NOTION_DATABASE_ID");

// ＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
// JERAとESP個別チャンネル通知用スクリプトプロパティ
// const SLACK_WEBHOOK_URL_JERA =
//   properties.getProperty("SLACK_WEBHOOK_URL_JERA");
// const SLACK_WEBHOOK_URL_EPS =
//   properties.getProperty("SLACK_WEBHOOK_URL_EPS");
// ＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝

// main.js
function Main() {
  console.log("■全体の処理を開始します。");

  // 1. JERAを実行して結果を取得
  const jeraResults = ProjJeraMain(NOTION_API_KEY, NOTION_DATABASE_ID);

  // 2. ESPを実行して結果を取得
  const espResults = EspMain(NOTION_API_KEY, NOTION_DATABASE_ID);

  // 3. まとめてレポート送信
  ReportMain(jeraResults, espResults, SLACK_WEBHOOK_URL);

  console.log("■全体の処理を終了しました。");
}
