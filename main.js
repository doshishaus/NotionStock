// const SLACK_WEBHOOK_URL = PropertiesService.getScriptProperties().getProperty("SLACK_WEBHOOK_URL");
const SLACK_WEBHOOK_URL = PropertiesService.getScriptProperties().getProperty(
  "SLACK_WEBHOOK_URL_TEST"
);
const properties = PropertiesService.getScriptProperties();
const apiKey = properties.getProperty('NOTION_API_KEY');
const dbId = properties.getProperty('NOTION_DATABASE_ID');

function Main() {
  console.log("proj-Jeraの処理を開始します。");
  projJeraMain();
  console.log("proj-Jeraの処理を終了しました。");

  console.log("ESPメールの処理を開始します。");
  EspMain();
  console.log("ESPメールの処理を終了しました。");
}
