// const SLACK_WEBHOOK_URL = PropertiesService.getScriptProperties().getProperty("SLACK_WEBHOOK_URL");
const SLACK_WEBHOOK_URL = PropertiesService.getScriptProperties().getProperty(
  "SLACK_WEBHOOK_URL_TEST"
);

// 処理済みメールに付けるラベル名（なければ作成してね）
const PROCESSED_LABEL_NAME = "Notion連携済み";

function Main() {
  console.log("proj-Jeraの処理を開始します。");
  projJeraMain();
  console.log("proj-Jeraの処理を終了しました。");
  console.log("ESPの処理を開始します。");
  EspMain();
  console.log("ESPの処理を終了しました。");
}
