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

  if (jeraResults.length === 0 && espResults.length === 0) {
    console.log("■新規追加データがないため、通知をスキップします。");
    return;
  }

  let message = "";

  // === JERAパート ===
  if (jeraResults.length > 0) {
    message += "【JERAデイリーメールニュース】\n";

    jeraResults.forEach((data, index) => {
      // 整形ロジックを関数に委譲
      const newsList = formatJeraNewsClip(data.newsClip);

      message += `\n*発行日:* ${data.publishedDate}`;
      message += `\n*登場企業:* ${data.companies.join(", ") || "なし"}`;
      message += `\n\n*＜ニュース一覧＞*\n${newsList}`;
      message += `\n<${data.notionUrl}|Notionで開く>`;

      if (index < jeraResults.length - 1) {
        message += "\n\n---\n";
      }
    });
    message += "\n\n";
  }

  // === ESPパート ===
  if (espResults.length > 0) {
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

// //**
// * ■JERAニュースクリップのテキスト整形関数
// * テキストを受け取り、不要文字削除・リンク化・空行削除を行って返す
// * ※デバッグ用に変換前後のログを出力する
// * @param {string} rawText - 元のテキスト
// * @return {string} 整形後のテキスト
// **/
function formatJeraNewsClip(rawText) {
  // デバッグ：何が入ってきたか確認
  console.log(
    `■formatJeraNewsClip: 整形前テキスト（先頭100文字）: ${rawText.substring(
      0,
      100
    )}...`
  );

  // 1. 不要な「格納先」情報の削除
  let text = rawText.replace(/（格納先[\s\S]*?）/g, "");

  // 2. URLのリンク化処理
  // 解説：
  // （リリース ... ） の構造を探します。
  // [\s\S]*?  -> 改行を含むあらゆる文字（リリースとURLの間）
  // <?        -> URLの前の < があってもなくてもOK
  // (https?:\/\/[^\s>）]+) -> URL本体。スペース、>、全角閉じ括弧が来るまでキャプチャ
  // >?        -> URLの後ろの > があってもなくてもOK
  // [\s\S]*?  -> URLの後ろの余計な空白や改行
  const linkRegex = /（リリース[\s\S]*?<?(https?:\/\/[^\s>）]+)>?[\s\S]*?）/g;

  text = text.replace(linkRegex, (match, url) => {
    const cleanUrl = url.trim();
    console.log(`■リンク変換検出: ${cleanUrl}`);
    return `（<${cleanUrl}|リリース>）`;
  });

  // 3. 行ごとの整形（空行削除）
  const formattedText = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");

  // デバッグ：最終的にどうなったか確認
  console.log(
    `■formatJeraNewsClip: 整形後テキスト（先頭100文字）: ${formattedText.substring(
      0,
      100
    )}...`
  );

  return formattedText;
}
