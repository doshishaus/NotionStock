function MaintenanceMain() {
  // main.jsと同じように、スクリプトのプロパティから設定を読み込む
  const properties = PropertiesService.getScriptProperties();
  const NOTION_API_KEY = properties.getProperty("NOTION_API_KEY");
  const NOTION_DATABASE_ID = properties.getProperty("NOTION_DATABASE_ID");

  console.log("Notionの重複ページ削除処理を単独で開始します。");

  // 前回作成した重複削除のメインロジックを呼び出す
  deleteDuplicateNotionPages(NOTION_API_KEY, NOTION_DATABASE_ID);

  console.log("Notionの重複ページ削除処理を単独で終了しました。");
}

/**
 * ===============================================================
 * Notion重複ページ削除用関数
 * ===============================================================
 */

/**
 * Notionデータベース内の重複ページを検索し、最新の1件を残して他をアーカイブする
 * @param {string} apiKey - Notion APIキー
 * @param {string} dbId - Notion データベースID
 */
function deleteDuplicateNotionPages(apiKey, dbId) {
  console.log("Notionの重複ページ削除処理を開始します。");

  if (!apiKey || !dbId) {
    console.error("NotionのAPIキーまたはデータベースIDが設定されていません。");
    return;
  }

  const allPages = fetchAllPagesFromDb(apiKey, dbId);
  if (allPages.length === 0) {
    console.log("処理対象のページが見つかりませんでした。");
    return;
  }

  // 「元のメールURL」をキーにしてページをグループ化する
  const pagesByUrl = {};
  allPages.forEach((page) => {
    // プロパティが存在するかチェック
    const mailUrlProperty = page.properties["元のメールURL"];
    if (mailUrlProperty && mailUrlProperty.url) {
      const url = mailUrlProperty.url;
      if (!pagesByUrl[url]) {
        pagesByUrl[url] = [];
      }
      pagesByUrl[url].push({
        id: page.id,
        created_time: page.created_time,
      });
    }
  });

  let deletedCount = 0;

  // グループ化したページをループし、重複をチェック
  for (const url in pagesByUrl) {
    const pages = pagesByUrl[url];

    // ページが2件以上ある場合（＝重複している場合）
    if (pages.length > 1) {
      console.log(`重複が見つかりました: ${url} (${pages.length}件)`);

      // 作成日時の降順（新しい順）にソート
      pages.sort((a, b) => new Date(b.created_time) - new Date(a.created_time));

      // 最初の1件（最新）を残し、残りをアーカイブする
      const pagesToDelete = pages.slice(1);

      pagesToDelete.forEach((page) => {
        console.log(
          `  - 古いページを削除します: ${page.id} (作成日時: ${page.created_time})`
        );
        archiveNotionPage(apiKey, page.id);
        deletedCount++;
      });
    }
  }

  if (deletedCount > 0) {
    console.log(`${deletedCount}件の重複ページを削除しました。`);
  } else {
    console.log("重複しているページはありませんでした。");
  }
  console.log("Notionの重複ページ削除処理を終了しました。");
}

/**
 * Notionデータベースから全てのページを取得するヘルパー関数
 * （ページが100件以上ある場合も考慮）
 */
function fetchAllPagesFromDb(apiKey, dbId) {
  const url = `https://api.notion.com/v1/databases/${dbId}/query`;
  let allPages = [];
  let hasMore = true;
  let startCursor = undefined;

  const headers = {
    Authorization: "Bearer " + apiKey,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  };

  while (hasMore) {
    const payload = {
      start_cursor: startCursor,
    };

    const options = {
      method: "post",
      headers: headers,
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    };

    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());

    if (response.getResponseCode() !== 200) {
      console.error("Notionページの取得に失敗しました:", data);
      return [];
    }

    allPages = allPages.concat(data.results);
    hasMore = data.has_more;
    startCursor = data.next_cursor;
  }

  console.log(`${allPages.length}件のページをNotionから取得しました。`);
  return allPages;
}

/**
 * 指定されたNotionページをアーカイブ（削除）するヘルパー関数
 */
function archiveNotionPage(apiKey, pageId) {
  const url = `https://api.notion.com/v1/pages/${pageId}`;

  const payload = {
    archived: true,
  };

  const options = {
    method: "patch",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Notion-Version": "2022-06-28",
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  UrlFetchApp.fetch(url, options);
}
