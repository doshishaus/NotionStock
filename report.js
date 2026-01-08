// report.js
// 処理結果を集約して通知する

/**
 * ■レポートメイン関数
 * JERAとESPの結果を受け取り、まとめてSlackに通知する
 * @param {Array} jeraResults - JERAの処理結果配列
 * @param {Array} espResults - ESPの処理結果配列
 * @param {string} webhookUrl - 通知先のSlack Webhook URL
 */
function ReportMain(jeraResults, espResults, webhookUrl) {
  console.log("■レポート処理を開始します。");

  // どちらも更新がない場合は何もしない（あるいは「更新なし」と送るかはお好みで）
  if (jeraResults.length === 0 && espResults.length === 0) {
    console.log("■新規追加データがないため、通知をスキップします。");
    return;
  }

  let message = "";

  // === JERAパート ===
  if (jeraResults.length > 0) {
    message += "【JERAデイリーメールニュース】\n";

    jeraResults.forEach((data, index) => {
      // ニュースクリップの整形（空行削除）
      const newsList = data.newsClip
        .replace(/（格納先[\s\S]*?）/g, "")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join("\n");

      message += `\n*発行日:* ${data.publishedDate}`;
      message += `\n*登場企業:* ${data.companies.join(", ") || "なし"}`;
      message += `\n\n*＜ニュース一覧＞*\n${newsList}`;
      message += `\n<${data.notionUrl}|Notionで開く>`;

      // 複数ある場合は区切り線
      if (index < jeraResults.length - 1) {
        message += "\n\n---\n";
      }
    });
    message += "\n\n";
  }

  // === ESPパート ===
  if (espResults.length > 0) {
    // もしJERAがあったなら区切り線を入れる
    if (jeraResults.length > 0) {
      message += "================================\n\n";
    }

    message += "【ESP制度情報】\n";
    espResults.forEach((r) => {
      message += `・<${r.url}|${r.title}>\n`;
    });
  }

  // Slack送信
  const payload = { text: message };
  sendSlackNotification(webhookUrl, payload);

  console.log("■レポート処理を終了しました。");
}
