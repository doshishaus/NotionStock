/**
 * ===============================================================
 * 共通コンポーネント
 * ===============================================================
 */

/**
 * Slackに通知を送信する汎用関数
 * @param {string} webhookUrl - SlackのIncoming Webhook URL
 * @param {object} payload - Slackに送信するペイロードオブジェクト（例: { "text": "メッセージ" }）
 */
function sendSlackNotification(webhookUrl, payload) {
  // Webhook URLが設定されていなかったら、エラーログを出して処理を中断
  if (!webhookUrl) {
    console.error("SlackのWebhook URLが渡されませんでした。処理を中断します。");
    return;
  }

  // Slack APIに送信するための設定
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true, // エラー時にGASの実行を止めないため
  };

  try {
    console.log("Slackへの通知を試みます...");
    const response = UrlFetchApp.fetch(webhookUrl, options);
    const responseCode = response.getResponseCode();

    // レスポンスコードが200（成功）かどうかをチェック
    if (responseCode === 200) {
      console.log("Slackへの通知に成功しました！🎉");
    } else {
      // 失敗した場合は、ステータスコードとエラー内容を詳しくログに出力
      console.error(
        `❌ Slackへの通知に失敗しました...。ステータス: ${responseCode}, 応答: ${response.getContentText()}`
      );
    }
  } catch (error) {
    // 予期せぬエラーが発生した場合のログ
    console.error(
      `❌ Slack通知中に予期せぬエラーが発生しました: ${error.message}`
    );
  }
}
