function ReportMain() {
  try {
    if (!SLACK_WEBHOOK_URL) {
      console.error("SLACK_WEBHOOK_URLがセットされていません。");
      return;
    }

    const payload = {
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "SLack送信テスト",
          },
        },
      ],
    };

    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    };
    const response = UrlFetchApp.fetch(SLACK_WEBHOOK_URL, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode === 200) {
      console.log("Slackへの通知が成功しました。");
    } else {
      console.error(
        `❌ Slackへの通知に失敗しました。 ステータス: ${responseCode}, 応答: ${responseBody}`
      );
    }
  } catch (error) {
    console.error(`❌ Slackへの通知中にエラーが発生しました: ${error.message}`);
  }
  console.log("ReportMainの処理を終了しました。");
}
