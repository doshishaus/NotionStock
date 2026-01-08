// proj-jera.js
// JERAの蓄積ロジック（通知はReportMainに委譲）

// ===============================================================
// 定数 & 設定エリア
// ===============================================================

const PROCESSED_LABEL_NAME = "Notion連携済み";
const SEARCH_QUERY = `subject:"デイリーメールニュース配信" -label:"${PROCESSED_LABEL_NAME}"`;

const TARGET_COMPANIES = [
  "日本製鉄",
  "JFEスチール",
  "神戸製鋼",
  "三菱ケミカル",
  "住友化学",
  "三井化学",
  "東ソー",
  "トクヤマ",
  "旭化成",
  "丸善石油化学",
  "東燃ゼネラル石油",
  "JSR",
  "ダイセル",
  "富士フイルム",
  "東レ",
  "出光興産",
  "コスモ石油",
  "ENEOS",
  "富士石油",
  "東亜石油",
  "王子HD",
  "日本製紙",
  "大王製紙",
  "北越コーポレーション",
  "レンゴー",
  "太平洋セメント",
  "UBE三菱セメント",
  "住友大阪セメント",
  "東日本旅客鉄道",
  "豊田自動織機",
  "AGC",
  "トヨタ自動車",
  "さくらインターネット",
  "ソフトバンク",
  "NTTグローバルデータセンター",
  "関西電力",
  "サイラスワン",
  "三井不動産",
  "大和ハウス工業",
  "東急不動産",
  "住友商事",
  "Equinix",
  "Air Trunk",
  "Colt",
  "日本GLP",
  "Asia Pacific Land",
  "信越科学",
  "産業PAGGIP",
  "アジリティ・アセット・アドバイザ―ズ",
];

// ===============================================================
// メイン処理
// ===============================================================

/**
 * ■JERAメール処理のメイン関数
 * Notion登録を行い、その結果データを配列で返す
 * @return {Array} 処理結果オブジェクトの配列
 */
function ProjJeraMain(apiKey, dbId) {
  try {
    console.log("■JERAメールの処理を開始します。");
    const results = searchAndProcessMails(apiKey, dbId);
    console.log(`■JERAメールの処理終了: ${results.length}件処理しました。`);
    return results;
  } catch (error) {
    console.error("■エラーが発生しました: " + error.message);
    console.error(error.stack);
    return [];
  }
}

// ===============================================================
// Gmail関連
// ===============================================================

function searchAndProcessMails(apiKey, dbId) {
  let label = GmailApp.getUserLabelByName(PROCESSED_LABEL_NAME);
  if (!label) {
    label = GmailApp.createLabel(PROCESSED_LABEL_NAME);
  }

  const threads = GmailApp.search(SEARCH_QUERY);
  const results = [];

  for (const thread of threads) {
    const messages = thread.getMessages();
    const mail = messages[messages.length - 1];
    const permalink = thread.getPermalink();

    console.log(`■処理中のメール: ${mail.getSubject()}`);

    const pageData = parseMailBody(mail, permalink);

    if (pageData) {
      const notionUrl = createNotionPage(pageData, apiKey, dbId);
      if (notionUrl) {
        // 結果セットに追加（通知に必要な情報だけを詰める）
        results.push({
          publishedDate: pageData.publishedDate,
          companies: pageData.companies,
          newsClip: pageData.newsClip,
          notionUrl: notionUrl,
        });
      }
    }

    thread.addLabel(label);
    thread.markRead();
  }
  return results;
}

// ===============================================================
// データ解析
// ===============================================================

function parseMailBody(mail, permalink) {
  const body = mail.getPlainBody();
  const receivedDate = mail.getDate();

  const insight = extractSection(
    body,
    "＜マーケティングインサイト＞",
    "＜マーケット情報＞"
  );
  const market = extractSection(
    body,
    "＜マーケット情報＞",
    "＜ニュースクリップ＞"
  );
  const newsClip = extractSection(
    body,
    "＜ニュースクリップ＞",
    "＜戦略ターゲット企業動向＞"
  );
  const targetCompany = extractSection(
    body,
    "＜戦略ターゲット企業動向＞",
    "各情報についての"
  );

  const foundCompanies = TARGET_COMPANIES.filter((company) =>
    body.includes(company)
  );
  const companies = [...new Set(foundCompanies)];
  const publishedDate = Utilities.formatDate(receivedDate, "JST", "yyyy-MM-dd");

  return {
    publishedDate: publishedDate,
    companies: companies,
    insight: insight,
    newsClip: newsClip,
    targetCompany: targetCompany,
    marketInfo: market,
    mailUrl: permalink,
    receivedAt: receivedDate.toISOString(),
    fullBody: body,
  };
}

function extractSection(text, startMarker, endMarker) {
  try {
    const startIndex = text.indexOf(startMarker) + startMarker.length;
    const endIndex = text.indexOf(endMarker);
    if (startIndex === -1 || endIndex === -1) return "";
    return text.substring(startIndex, endIndex).trim();
  } catch (e) {
    return "";
  }
}

// ===============================================================
// Notion API
// ===============================================================

function createNotionPage(data, apiKey, dbId) {
  // バリデーション省略（mainから呼ばれる前提）
  const url = "https://api.notion.com/v1/pages";

  const payload = {
    parent: { database_id: dbId },
    properties: {
      種類: { select: { name: "JERA" } },
      発行日: { title: [{ text: { content: data.publishedDate } }] },
      登場企業: {
        multi_select: data.companies.map((name) => ({ name: name })),
      },
      インサイト: {
        rich_text: [{ text: { content: data.insight.substring(0, 2000) } }],
      },
      ニュースクリップ: {
        rich_text: [{ text: { content: data.newsClip.substring(0, 2000) } }],
      },
      戦略ターゲット企業動向: {
        rich_text: [
          { text: { content: data.targetCompany.substring(0, 2000) } },
        ],
      },
      マーケット情報: {
        rich_text: [{ text: { content: data.marketInfo.substring(0, 2000) } }],
      },
      元のメールURL: { url: data.mailUrl },
      メール受信日時: { date: { start: data.receivedAt } },
    },
    children: [
      {
        object: "block",
        type: "heading_2",
        heading_2: { rich_text: [{ text: { content: "受信メール本文" } }] },
      },
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ text: { content: data.fullBody.substring(0, 2000) } }],
        },
      },
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
    console.log("■Notion作成成功");
    return JSON.parse(response.getContentText()).url;
  } else {
    console.error(`■Notion作成失敗: ${response.getResponseCode()}`);
    return null;
  }
}
