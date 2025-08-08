// proj-jeraの蓄積ロジック

// ===============================================================
// 定数 & 設定エリア
// ===============================================================

// メール検索条件（件名にこの文字が含まれるメールを探す）
const SEARCH_QUERY = 'subject:"デイリーメールニュース配信" is:unread';

// 処理済みメールに付けるラベル名（なければ作成してね）
const PROCESSED_LABEL_NAME = 'Notion連携済み';

// 抽出対象とする企業名のリスト
const TARGET_COMPANIES = [
  '日本製鉄', 'JFEスチール', '神戸製鋼', '三菱ケミカル', '住友化学',
  '三井化学', '東ソー', 'トクヤマ', '旭化成', '丸善石油化学',
  '東燃ゼネラル石油', 'JSR', 'ダイセル', '富士フイルム', '東レ',
  '出光興産', 'コスモ石油', 'ENEOS', '富士石油', '東亜石油',
  '王子HD', '日本製紙', '大王製紙', '北越コーポレーション', 'レンゴー',
  '太平洋セメント', 'UBE三菱セメント', '住友大阪セメント', '東日本旅客鉄道',
  '豊田自動織機', 'AGC', 'トヨタ自動車', 'さくらインターネット', 'ソフトバンク',
  'NTTグローバルデータセンター', '関西電力', 'サイラスワン', '三井不動産',
  '大和ハウス工業', '東急不動産', '住友商事', 'Equinix', 'Air Trunk',
  'Colt', '日本GLP', 'Asia Pacific Land', '信越科学', '産業PAGGIP',
  'アジリティ・アセット・アドバイザ―ズ'
  // 新しい会社を追加したいときは、このリストにカンマ区切りで追加するだけ！
];


// ===============================================================
// メイン処理
// ===============================================================

/**
 * このスクリプトのメイン関数。ここから全ての処理が始まる。
 */
function projJeraMain() {
  try {
    console.log('処理を開始します。');
    searchAndProcessMails();
    console.log('正常に処理が終了しました。');
  } catch (error) {
    console.error('エラーが発生しました: ' + error.message);
    console.error('スタックトレース: ' + error.stack);
  }
}


// ===============================================================
// Gmail関連の関数
// ===============================================================

/**
 * 条件に一致するメールを検索し、一件ずつ処理する
 */
function searchAndProcessMails() {
  let label = GmailApp.getUserLabelByName(PROCESSED_LABEL_NAME);
  if (!label) {
    label = GmailApp.createLabel(PROCESSED_LABEL_NAME);
  }

  const threads = GmailApp.search(SEARCH_QUERY);
  console.log(`${threads.length}件の未処理メールスレッドが見つかりました。`);

  for (const thread of threads) {
    const messages = thread.getMessages();
    const mail = messages[messages.length - 1];
    // ★★★ 変更点：ここでthreadからURLを取得する ★★★
    const permalink = thread.getPermalink(); 
    
    console.log(`処理中のメール: ${mail.getSubject()} (${mail.getDate()})`);

    // ★★★ 変更点：parseMailBodyにpermalinkを渡す ★★★
    const pageData = parseMailBody(mail, permalink);

    if (pageData) {
      createNotionPage(pageData);
    }

    thread.addLabel(label);
    thread.markRead();
    console.log('メールを処理済みにしました。');
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
function parseMailBody(mail, permalink) { // ★★★ 変更点：引数にpermalinkを追加 ★★★
  const body = mail.getPlainBody();
  const receivedDate = mail.getDate();
  // ★★★ 変更点：引数で受け取ったpermalinkをそのまま使う ★★★
  
  // 各セクションの内容を抽出
  const insight = extractSection(body, '＜マーケティングインサイト＞', '＜マーケット情報＞');
  const market = extractSection(body, '＜マーケット情報＞', '＜ニュースクリップ＞');
  const newsClip = extractSection(body, '＜ニュースクリップ＞', '＜戦略ターゲット企業動向＞');
  const targetCompany = extractSection(body, '＜戦略ターゲット企業動向＞', '各情報についての');

  // 本文にターゲット企業リストの企業名が含まれているかチェック
  const foundCompanies = TARGET_COMPANIES.filter(company => body.includes(company));
  const companies = [...new Set(foundCompanies)];
  console.log(`抽出された企業名: ${companies.join(', ')}`);

  // 日付を 'YYYY-MM-DD' 形式にフォーマット
  const publishedDate = Utilities.formatDate(receivedDate, 'JST', 'yyyy-MM-dd');

  return {
    publishedDate: publishedDate,
    companies: companies,
    insight: insight,
    newsClip: newsClip,
    targetCompany: targetCompany,
    marketInfo: market,
    mailUrl: permalink, // mailBody の代わりに mailUrl を返す
    receivedAt: receivedDate.toISOString()
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
    const startIndex = text.indexOf(startMarker) + startMarker.length;
    const endIndex = text.indexOf(endMarker);
    if (startIndex === -1 || endIndex === -1) {
      console.warn(`マーカーが見つかりません: ${startMarker} or ${endMarker}`);
      return '';
    }
    return text.substring(startIndex, endIndex).trim();
  } catch (e) {
    console.warn(`${startMarker} から ${endMarker} の抽出に失敗しました。`);
    return '';
  }
}

// ===============================================================
// Notion API関連の関数
// ===============================================================

/**
 * Notionに新しいページを作成する
 * @param {object} data - Notion登録用のデータオブジェクト
 */
function createNotionPage(data) {
  const properties = PropertiesService.getScriptProperties();
  const apiKey = properties.getProperty('NOTION_API_KEY');
  const dbId = properties.getProperty('NOTION_DATABASE_ID');

  if (!apiKey || !dbId) {
    console.error('NotionのAPIキーまたはデータベースIDが設定されていません。');
    throw new Error('スクリプトプロパティを確認してください。');
  }

  const url = 'https://api.notion.com/v1/pages';
  
  const payload = {
    parent: { database_id: dbId },
    properties: {
      '発行日': {
        title: [{ text: { content: data.publishedDate } }]
      },
      '登場企業': {
        multi_select: data.companies.map(name => ({ name: name }))
      },
      'インサイト': {
        rich_text: [{ text: { content: data.insight.substring(0, 2000) } }]
      },
      'ニュースクリップ': {
        rich_text: [{ text: { content: data.newsClip.substring(0, 2000) } }]
      },
      '戦略ターゲット企業動向': {
        rich_text: [{ text: { content: data.targetCompany.substring(0, 2000) } }]
      },
      'マーケット情報': {
        rich_text: [{ text: { content: data.marketInfo.substring(0, 2000) } }]
      },
      '元のメールURL': {
        url: data.mailUrl
      },
      'メール受信日時': {
        date: { start: data.receivedAt }
      }
    }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Notion-Version': '2022-06-28'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  console.log('Notion APIにデータを送信します...');
  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const responseBody = response.getContentText();

  if (responseCode === 200) {
    console.log('Notionページの作成に成功しました。');
  } else {
    console.error('Notionページの作成に失敗しました。');
    console.error(`ステータスコード: ${responseCode}`);
    console.error(`レスポンス: ${responseBody}`);
  }
}