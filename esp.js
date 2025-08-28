// esp.js

// ===============================================================
// 定数 & 設定エリア
// ===============================================================

// ▼▼▼ 変更点①: メールの検索条件を件名に変更 ▼▼▼
// メール検索条件（この件名が含まれるメールを探す）
const ESP_SEARCH_QUERY = 'subject:"【制度情報:ニュース】"';

// 処理済みメールに付けるラベル名（なければ自動で作るよ）
const ESP_PROCESSED_LABEL_NAME = "Notion連携済み";

// ===============================================================
// メイン処理
// ===============================================================

/**
 * ESPメール処理のメイン関数。main.jsから情報を受け取る。
 * ▼▼▼ 変更点②: SlackのURLを受け取る引数を追加 ▼▼▼
 * @param {string} apiKey - Notion APIキー
 * @param {string} dbId - Notion データベースID
 * @param {string} slackWebhookUrl - Slack Webhook URL
 */
function EspMain(apiKey, dbId, slackWebhookUrl) {
  try {
    console.log("ESPメールの処理を開始します。");

    // 受け取った接続情報を次の関数に渡す
    searchAndProcessEspMails(apiKey, dbId, slackWebhookUrl);

    console.log("正常にESPメールの処理が終了しました。");
  } catch (error) {
    console.error("ESPメール処理でエラーが発生しました: " + error.message);
    console.error("スタックトレース: " + error.stack);
  }
}

// ===============================================================
// Gmail関連の関数
// ===============================================================

/**
 * 条件に一致するESPメールを検索し、一件ずつ処理する
 * ▼▼▼ 変更点②: SlackのURLを受け取る引数を追加 ▼▼▼
 * @param {string} apiKey - Notion APIキー
 * @param {string} dbId - Notion データベースID
 * @param {string} slackWebhookUrl - Slack Webhook URL
 */
function searchAndProcessEspMails(apiKey, dbId, slackWebhookUrl) {
  // 処理済みラベルがなければ作成
  let label = GmailApp.getUserLabelByName(ESP_PROCESSED_LABEL_NAME);
  if (!label) {
    label = GmailApp.createLabel(ESP_PROCESSED_LABEL_NAME);
  }

  const threads = GmailApp.search(ESP_SEARCH_QUERY);
  console.log(`${threads.length}件の未処理ESPメールスレッドが見つかりました。`);

  for (const thread of threads) {
    const messages = thread.getMessages();
    const mail = messages[messages.length - 1];
    const permalink = thread.getPermalink();

    console.log(`処理中のESPメール: ${mail.getSubject()} (${mail.getDate()})`);

    // 新しい形式に対応した解析関数を呼び出す
    const pageData = parseEspMailBody(mail, permalink);
    console.log("メール本文の解析結果:", JSON.stringify(pageData, null, 2));

    if (pageData) {
      // NotionとSlackの接続情報を引き継いでページ作成関数を呼び出す
      createEspNotionPage(pageData, apiKey, dbId, slackWebhookUrl);
    }

    thread.addLabel(label);
    thread.markRead();
    console.log("メールを処理済みにしました。");
  }
}

// ===============================================================
// データ解析の関数
// ===============================================================

/**
 * ▼▼▼ 変更点③: メール本文の解析ロジックを全面的に刷新 ▼▼▼
 * メールオブジェクトから本文を解析し、新しいNotionプロパティ用のデータオブジェクトを作成する
 * @param {GoogleAppsScript.Gmail.GmailMessage} mail - Gmailのメールオブジェクト
 * @param {string} permalink - メールスレッドへのURL
 * @return {object|null} Notion登録用のデータオブジェクト
 */
function parseEspMailBody(mail, permalink) {
  const subject = mail.getSubject();
  const body = mail.getPlainBody();
  const receivedDate = mail.getDate();

  // 各セクションをマーカー（目印）を元に抽出
  const newsTopic = extractSection(body, "〇気になるニュースピック", "---");
  const background = extractSection(body, "1．背景等", "2．具体的な取組");
  const initiative = extractSection(body, "2．具体的な取組", "3．今後に向けて");
  const future = extractSection(
    body,
    "3．今後に向けて",
    "■ESP制度情報配信サービスサイト"
  );

  // 正規表現で発表日を抽出
  const releaseDateMatch = body.match(/発表日：(.+)/);
  // 発表日が見つかればその日付、なければメールの受信日をフォーマットして使う
  const publishedDate = releaseDateMatch
    ? releaseDateMatch[1].trim()
    : Utilities.formatDate(receivedDate, "JST", "yyyy-MM-dd");

  return {
    publishedDate: publishedDate, // 発行日 (Title用)
    mailTitle: subject, // メールタイトル
    newsTopic: newsTopic, // 気になるニューストピック
    background: background, // 背景等
    initiative: initiative, // 具体的な取組
    future: future, // 今後に向けて
    mailUrl: permalink, // 元のメールURL
    receivedAt: receivedDate.toISOString(), // メール受信日時
    fullBody: body, // ページ本体に書き込む用の全文
  };
}

/**
 * 本文テキストから指定されたセクション間のテキストを抽出するヘルパー関数
 * (この関数は便利なのでそのまま使います)
 * @param {string} text - 全文テキスト
 * @param {string} startMarker - セクション開始の目印
 * @param {string} endMarker - セクション終了の目印
 * @return {string} 抽出されたテキスト
 */
function extractSection(text, startMarker, endMarker) {
  try {
    let startIndex = text.indexOf(startMarker);
    if (startIndex === -1) return "";
    startIndex += startMarker.length;

    let endIndex = text.indexOf(endMarker, startIndex);
    if (endIndex === -1) {
      // 終了マーカーが見つからない場合、そこから最後までを抽出
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
// Notion API関連の関数
// ===============================================================

/**
 * ▼▼▼ 変更点④: Notion登録処理を刷新 & Slack通知を追加 ▼▼▼
 * Notionに新しいページを作成し、成功したらSlackに通知する
 * @param {object} data - Notion登録用のデータオブジェクト
 * @param {string} apiKey - Notion APIキー
 * @param {string} dbId - Notion データベースID
 * @param {string} slackWebhookUrl - Slack Webhook URL
 */
function createEspNotionPage(data, apiKey, dbId, slackWebhookUrl) {
  if (!apiKey || !dbId) {
    console.error("NotionのAPIキーまたはデータベースIDが渡されませんでした。");
    return;
  }

  const url = "https://api.notion.com/v1/pages";

  // 新しいプロパティに合わせて送信するデータ(payload)を作成
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
    // メール本文全体もページの中身として書き込む
    children: [
      {
        type: "heading_2",
        heading_2: { rich_text: [{ text: { content: "受信メール全文" } }] },
      },
      ...createTextBlocks(data.fullBody), // 2000文字制限を回避するヘルパー関数
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

  console.log("Notion APIにESPメールのデータを送信します...");
  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const responseBody = response.getContentText();

  if (responseCode === 200) {
    console.log("Notionページの作成に成功しました！🎉");

    // ▼▼▼ Slack通知処理を追加 ▼▼▼
    const notionPageInfo = JSON.parse(responseBody);
    const notionPageUrl = notionPageInfo.url;

    const message = `【ESP制度情報】\nNotionに新しいページが作成されました！\n\n*件名:* ${data.mailTitle}\n*発行日:* ${data.publishedDate}\n\n▼ Notionで確認する\n${notionPageUrl}`;

    const slackPayload = { text: message };

    // Components.jsの共通関数を呼び出し
    sendSlackNotification(slackWebhookUrl, slackPayload);
  } else {
    console.error("Notionページの作成に失敗しました...。");
    console.error(`ステータスコード: ${responseCode}`);
    console.error(`レスポンス: ${responseBody}`);
    console.error("送信したデータ:", JSON.stringify(payload, null, 2));
  }
}

/**
 * 長いテキストを2000文字ごとのブロック配列に分割するヘルパー関数
 * (この関数も便利なのでそのまま使います)
 * @param {string} text - 分割したい元のテキスト
 * @return {Array<object>} Notion APIのchildrenに渡すためのブロック配列
 */
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
