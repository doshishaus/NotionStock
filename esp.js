// esp.js

// ===============================================================
// 定数 & 設定エリア
// ===============================================================

// 処理済みメールに付けるラベル名（なければ自動で作るよ）
const ESP_PROCESSED_LABEL_NAME = "Notion連携済み";

// メール検索条件（この件名が含まれ、"Notion連携済み"ラベルがないメールを探す）
const ESP_SEARCH_QUERY = `subject:"【制度情報:ニュース】" -label:"${ESP_PROCESSED_LABEL_NAME}"`;

// ===============================================================
// メイン処理
// ===============================================================

/**
 * ▼▼▼ 変更点 ▼▼▼
 * ESPメール処理のメイン関数。
 * 内部でメール処理とSlack通知を完結させる。
 * @param {string} apiKey - Notion APIキー
 * @param {string} dbId - Notion データベースID
 * @param {string} slackWebhookUrl - Slack Webhook URL
 */
function EspMain(apiKey, dbId, slackWebhookUrl) {
  try {
    console.log("ESPメールの処理を開始します。");
    // メールを検索・処理し、結果を受け取る
    const results = searchAndProcessEspMails(apiKey, dbId);

    // 受け取った結果を元にサマリーレポートを送信する
    sendEspSummaryReport(results, slackWebhookUrl);

    console.log("ESPメールの処理を完了しました。");
  } catch (error) {
    console.error("ESPメール処理でエラーが発生しました: " + error.message);
    console.error("スタックトレース: " + error.stack);
  }
}

// ===============================================================
// Slack通知関数
// ===============================================================

/**
 * ▼▼▼ 新しく移動した関数 ▼▼▼
 * ESPメールの結果だけをまとめてSlackに通知する
 * @param {Array<object>} espResults - ESPメールの処理結果
 * @param {string} slackWebhookUrl - Slack Webhook URL
 */
function sendEspSummaryReport(espResults, slackWebhookUrl) {
  // 処理結果が0件の場合は通知しない
  if (espResults.length === 0) {
    console.log("通知対象の新規ESPメールはありませんでした。");
    return;
  }

  // ESPメールの結果をメッセージに整形
  let message = "📧 NotionへのESPメール登録が完了しました。\n\n";
  message += "--- *ESP制度情報* ---\n";
  espResults.forEach((r) => {
    message += `・<${r.url}|${r.title}>\n`;
  });

  const payload = {
    text: message,
  };

  // Components.jsの共通関数を呼び出して通知
  sendSlackNotification(slackWebhookUrl, payload);
}

// ===============================================================
// Gmail関連の関数
// ===============================================================

/**
 * 条件に一致するESPメールを検索し、一件ずつ処理する
 * @param {string} apiKey - Notion APIキー
 * @param {string} dbId - Notion データベースID
 * @return {Array<object>} 処理結果の配列
 */
function searchAndProcessEspMails(apiKey, dbId) {
  let label = GmailApp.getUserLabelByName(ESP_PROCESSED_LABEL_NAME);
  if (!label) {
    label = GmailApp.createLabel(ESP_PROCESSED_LABEL_NAME);
  }

  const processedResults = [];
  const threads = GmailApp.search(ESP_SEARCH_QUERY);
  console.log(`${threads.length}件の未処理ESPメールスレッドが見つかりました。`);

  for (const thread of threads) {
    const messages = thread.getMessages();
    const mail = messages[messages.length - 1];
    const permalink = thread.getPermalink();

    console.log(`処理中のESPメール: ${mail.getSubject()} (${mail.getDate()})`);

    const pageData = parseEspMailBody(mail, permalink);

    if (pageData) {
      const result = createEspNotionPage(pageData, apiKey, dbId);
      if (result) {
        processedResults.push(result);
      }
    }

    thread.addLabel(label);
    thread.markRead();
    console.log("メールを処理済みにしました。");
  }
  return processedResults;
}

// ===============================================================
// データ解析の関数 (変更なし)
// ===============================================================

function parseEspMailBody(mail, permalink) {
  const subject = mail.getSubject();
  const body = mail.getPlainBody();
  const receivedDate = mail.getDate();

  const newsTopic = extractSection(body, "〇気になるニュースピック", "---");
  const background = extractSection(body, "1．背景等", "2．具体的な取組");
  const initiative = extractSection(body, "2．具体的な取組", "3．今後に向けて");
  const future = extractSection(
    body,
    "3．今後に向けて",
    "■ESP制度情報配信サービスサイト"
  );

  const releaseDateMatch = body.match(/発表日：(.+)/);
  const publishedDate = releaseDateMatch
    ? releaseDateMatch[1].trim()
    : Utilities.formatDate(receivedDate, "JST", "yyyy-MM-dd");

  return {
    publishedDate: publishedDate,
    mailTitle: subject,
    newsTopic: newsTopic,
    background: background,
    initiative: initiative,
    future: future,
    mailUrl: permalink,
    receivedAt: receivedDate.toISOString(),
    fullBody: body,
  };
}

function extractSection(text, startMarker, endMarker) {
  try {
    let startIndex = text.indexOf(startMarker);
    if (startIndex === -1) return "";
    startIndex += startMarker.length;

    let endIndex = text.indexOf(endMarker, startIndex);
    if (endIndex === -1) {
      return text.substring(startIndex).trim();
    }
    return text.substring(startIndex, endIndex).trim();
  } catch (e) {
    console.warn(
      `「${startMarker}」から「${endMarker}」の抽出に失敗しました。`
    );
    return "";
  }
}

// ===============================================================
// Notion API関連の関数 (変更なし)
// ===============================================================

function createEspNotionPage(data, apiKey, dbId) {
  if (!apiKey || !dbId) {
    console.error("NotionのAPIキーまたはデータベースIDが渡されませんでした。");
    return null;
  }

  const url = "https://api.notion.com/v1/pages";

  const payload = {
    parent: { database_id: dbId },
    properties: {
      発行日: {
        title: [{ text: { content: data.publishedDate } }],
      },
      メールタイトル: {
        rich_text: [{ text: { content: data.mailTitle.substring(0, 2000) } }],
      },
      気になるニューストピック: {
        rich_text: [{ text: { content: data.newsTopic.substring(0, 2000) } }],
      },
      背景等: {
        rich_text: [{ text: { content: data.background.substring(0, 2000) } }],
      },
      具体的な取組: {
        rich_text: [{ text: { content: data.initiative.substring(0, 2000) } }],
      },
      今後に向けて: {
        rich_text: [{ text: { content: data.future.substring(0, 2000) } }],
      },
      元のメールURL: {
        url: data.mailUrl,
      },
      メール受信日時: {
        date: { start: data.receivedAt },
      },
      種類: {
        select: { name: "ESP" },
      },
    },
    children: [
      {
        type: "heading_2",
        heading_2: { rich_text: [{ text: { content: "受信メール全文" } }] },
      },
      ...createTextBlocks(data.fullBody),
    ],
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Notion-Version": "2022-06-28",
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const responseBody = response.getContentText();

  if (responseCode === 200) {
    const notionPageInfo = JSON.parse(responseBody);
    return {
      title: data.mailTitle,
      url: notionPageInfo.url,
    };
  } else {
    console.error("Notionページの作成に失敗しました...。");
    console.error(`ステータスコード: ${responseCode}`);
    console.error(`レスポンス: ${responseBody}`);
    return null;
  }
}

function createTextBlocks(text) {
  if (!text) return [];
  const MAX_LENGTH = 2000;
  const blocks = [];
  let remainingText = text;

  while (remainingText.length > 0) {
    const chunk = remainingText.substring(0, MAX_LENGTH);
    remainingText = remainingText.substring(MAX_LENGTH);
    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ type: "text", text: { content: chunk } }],
      },
    });
  }
  return blocks;
}
