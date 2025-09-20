const SLACK_WEBHOOK_URL_JERA =
  PropertiesService.getScriptProperties().getProperty("SLACK_WEBHOOK_URL_JERA");
const SLACK_WEBHOOK_URL_ESP =
  PropertiesService.getScriptProperties().getProperty("SLACK_WEBHOOK_URL_ESP");
// const SLACK_WEBHOOK_URL_JERA =
//   PropertiesService.getScriptProperties().getProperty("SLACK_WEBHOOK_URL_TEST");
// const SLACK_WEBHOOK_URL_ESP =
//   PropertiesService.getScriptProperties().getProperty("SLACK_WEBHOOK_URL_TEST");
const properties = PropertiesService.getScriptProperties();
const NOTION_API_KEY = properties.getProperty("NOTION_API_KEY");
const NOTION_DATABASE_ID = properties.getProperty("NOTION_DATABASE_ID");

function Main() {
  console.log("proj-Jeraの処理を開始します。");
  ProjJeraMain(NOTION_API_KEY, NOTION_DATABASE_ID, SLACK_WEBHOOK_URL_JERA);
  console.log("proj-Jeraの処理を終了しました。");

  console.log("ESPメールの処理を開始します。");
  EspMain(NOTION_API_KEY, NOTION_DATABASE_ID, SLACK_WEBHOOK_URL_ESP);
  console.log("ESPメールの処理を終了しました。");

  console.log("レポートを開始します");
  // ReportMain();
  console.log("レポートを終了しました");
}
