// esp.js
// ESPの蓄積ロジック（通知はReportMainに委譲）

const ESP_PROCESSED_LABEL_NAME = "Notion連携済み";
const ESP_SEARCH_QUERY = `subject:"【制度情報:ニュース】" -label:"${ESP_PROCESSED_LABEL_NAME}"`;

// ===============================================================
// メイン処理
// ===============================================================

/**
 * ■ESPメール処理のメイン関数
 * @return {Array} 処理結果オブジェクトの配列
 */
function EspMain(apiKey, dbId) {
  try {
    console.log("■ESPメールの処理を開始します。");
    const results = searchAndProcessEspMails(apiKey, dbId);
    console.log(`■ESPメールの処理終了: ${results.length}件処理しました。`);
    return results;
  } catch (error) {
    console.error("■ESPエラー: " + error.message);
    return [];
  }
}

// ===============================================================
// Gmail関連
// ===============================================================

function searchAndProcessEspMails(apiKey, dbId) {
  let label = GmailApp.getUserLabelByName(ESP_PROCESSED_LABEL_NAME);
  if (!label) {
    label = GmailApp.createLabel(ESP_PROCESSED_LABEL_NAME);
  }

  const processedResults = [];
  const threads = GmailApp.search(ESP_SEARCH_QUERY);

  for (const thread of threads) {
    const messages = thread.getMessages();
    const mail = messages[messages.length - 1];
    const permalink = thread.getPermalink();

    console.log(`■処理中のESPメール: ${mail.getSubject()}`);

    const pageData = parseEspMailBody(mail, permalink);

    if (pageData) {
      const result = createEspNotionPage(pageData, apiKey, dbId);
      if (result) {
        processedResults.push(result);
      }
    }

    thread.addLabel(label);
    thread.markRead();
  }
  return processedResults;
}

// ===============================================================
// データ解析（変更なし）
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
    return endIndex === -1
      ? text.substring(startIndex).trim()
      : text.substring(startIndex, endIndex).trim();
  } catch (e) {
    return "";
  }
}

// ===============================================================
// Notion API（変更なし）
// ===============================================================

function createEspNotionPage(data, apiKey, dbId) {
  const url = "https://api.notion.com/v1/pages";

  const payload = {
    parent: { database_id: dbId },
    properties: {
      発行日: { title: [{ text: { content: data.publishedDate } }] },
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
      元のメールURL: { url: data.mailUrl },
      メール受信日時: { date: { start: data.receivedAt } },
      種類: { select: { name: "ESP" } },
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
  if (response.getResponseCode() === 200) {
    return {
      title: data.mailTitle,
      url: JSON.parse(response.getContentText()).url,
    };
  } else {
    console.error(`■ESP Notion作成失敗: ${response.getResponseCode()}`);
    return null;
  }
}

function createTextBlocks(text) {
  if (!text) return [];
  const MAX_LENGTH = 2000;
  const blocks = [];
  let remainingText = text;
  while (remainingText.length > 0) {
    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: { content: remainingText.substring(0, MAX_LENGTH) },
          },
        ],
      },
    });
    remainingText = remainingText.substring(MAX_LENGTH);
  }
  return blocks;
}
