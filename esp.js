// esp.js

// ===============================================================
// 定数 & 設定エリア
// ===============================================================

// メール検索条件（この送信者からの未読メールを探す）
const ESP_SEARCH_QUERY = "from:seido-joho@solution-esp.com is:unread";

// 処理済みメールに付けるラベル名（なければ自動で作るよ）
const ESP_PROCESSED_LABEL_NAME = "Notion連携済み";

// ===============================================================
// メイン処理
// ===============================================================

/**
 * ESPメール処理のメイン関数。ここから全ての処理が始まるよ。
 * main.jsから呼び出されることを想定している。
 */
function EspMain() {
  try {
    console.log("ESPメールの処理を開始します。");

    // Notion接続情報をここで一括取得！
    const properties = PropertiesService.getScriptProperties();
    const apiKey = properties.getProperty("NOTION_API_KEY");
    const dbId = properties.getProperty("NOTION_DATABASE_ID");

    // 取得した接続情報を引数で渡す
    searchAndProcessEspMails(apiKey, dbId);

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
 * @param {string} apiKey - Notion APIキー
 * @param {string} dbId - Notion データベースID
 */
function searchAndProcessEspMails(apiKey, dbId) {
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

    const pageData = parseEspMailBody(mail, permalink);
    console.log("メール本文の解析結果:", JSON.stringify(pageData, null, 2));

    if (pageData) {
      // Notion接続情報を引き継いでページ作成関数を呼び出す
      createEspNotionPage(pageData, apiKey, dbId);
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
 * メールオブジェクトから本文を解析し、Notion登録用のデータオブジェクトを作成する
 * @param {GoogleAppsScript.Gmail.GmailMessage} mail - Gmailのメールオブジェクト
 * @param {string} permalink - メールスレッドへのURL
 * @return {object|null} Notion登録用のデータオブジェクト
 */
function parseEspMailBody(mail, permalink) {
  const subject = mail.getSubject();
  const body = mail.getPlainBody();
  const receivedDate = mail.getDate();

  const newsUrl = body.match(/---(https?:\/\/[^\s]+)/);
  const releaseDate = body.match(/発表日：(.+)/);
  const publisher = body.match(/発表者：(.+)/);
  const titleInBody = body.match(/件名：\s*([\s\S]*?)【加藤コメント】/);
  const katoComment = extractSection(body, "【加藤コメント】", "---");

  return {
    subject: subject,
    receivedAt: receivedDate.toISOString(),
    newsUrl: newsUrl ? newsUrl[1].trim() : "",
    releaseDate: releaseDate ? releaseDate[1].trim() : "",
    publisher: publisher ? publisher[1].trim() : "",
    titleInBody: titleInBody ? titleInBody[1].trim() : "",
    katoComment: katoComment,
    fullBody: body,
    mailUrl: permalink,
  };
}

/**
 * 本文テキストから指定されたセクション間のテキストを抽出するヘルパー関数
 * @param {string} text - 全文テキスト
 * @param {string} startMarker - セクション開始の目印
 * @param {string} endMarker - セクション終了の目印
 * @return {string} 抽出されたテキスト
 */
function extractSection(text, startMarker, endMarker) {
  try {
    const startIndex = text.indexOf(startMarker);
    if (startIndex === -1) return "";
    const endIndex = text.indexOf(endMarker, startIndex + startMarker.length);
    if (endIndex === -1) {
      return text.substring(startIndex + startMarker.length).trim();
    }
    return text.substring(startIndex + startMarker.length, endIndex).trim();
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
 * Notionに新しいページを作成する
 * @param {object} data - Notion登録用のデータオブジェクト
 * @param {string} apiKey - Notion APIキー
 * @param {string} dbId - Notion データベースID
 */
function createEspNotionPage(data, apiKey, dbId) {
  // 引数で受け取ったキーとIDをチェック
  if (!apiKey || !dbId) {
    console.error("NotionのAPIキーまたはデータベースIDが渡されませんでした。");
    throw new Error("EspMainからの引数を確認してください。");
  }

  const url = "https://api.notion.com/v1/pages";

  const payload = {
    parent: { database_id: dbId },
    properties: {
      発行日: {
        // Titleプロパティ
        title: [{ text: { content: data.publishedDate } }],
      },
      メールタイトル: {
        rich_text: [{ text: { content: data.subject.substring(0, 2000) } }],
      },
      気になるニューストピック: {
        rich_text: [{ text: { content: data.newsTopic.substring(0, 2000) } }],
      },
      加藤コメント: {
        rich_text: [{ text: { content: data.katoComment.substring(0, 2000) } }],
      },
      種類: {
        select: { name: "ESP" },
      },
    },
    // ▼▼▼ 変更点: ページ本体にも分割したテキストを書き込む ▼▼▼
    children: [
      {
        type: "heading_2",
        heading_2: { rich_text: [{ text: { content: "受信メール全文" } }] },
      },
      // 2000文字制限を回避するため、メール本文をブロックに分割して渡す
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

  console.log("Notion APIにESPメールのデータを送信します...");
  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const responseBody = response.getContentText();

  if (responseCode === 200) {
    console.log("Notionページの作成に成功しました！🎉");
  } else {
    console.error("Notionページの作成に失敗しました...。");
    console.error(`ステータスコード: ${responseCode}`);
    console.error(`レスポンス: ${responseBody}`);
    console.error("送信したデータ:", JSON.stringify(payload, null, 2));
  }
}

// ▼▼▼ 新機能: 2000文字制限を回避するヘルパー関数 ▼▼▼
/**
 * 長いテキストを2000文字ごとのブロック配列に分割する
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
        rich_text: [
          {
            type: "text",
            text: { content: chunk },
          },
        ],
      },
    });
  }
  return blocks;
}
