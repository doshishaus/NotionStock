// ===============================================================
// 開発用：メールの状態をリセットする関数
// ===============================================================

/**
 * 'Notion連携済み' ラベルが付いたメールを探し、
 * ラベルを剥がして未読に戻す開発用のリセット関数。
 */
function resetMailStatus() {
  try {
    console.log('リセット処理を開始します。');

    // ラベルを取得
    const label = GmailApp.getUserLabelByName(PROCESSED_LABEL_NAME);
    if (!label) {
      console.warn(`'${PROCESSED_LABEL_NAME}' ラベルが見つかりませんでした。リセット処理を中断します。`);
      return;
    }

    // ラベルが付いているスレッドを全て取得
    const threads = label.getThreads();
    if (threads.length === 0) {
      console.log('リセット対象のメールはありませんでした。');
      return;
    }

    console.log(`${threads.length}件のメールをリセットします。`);

    // 各スレッドをループしてラベルを剥がし、未読に戻す
    for (const thread of threads) {
      thread.removeLabel(label);
      thread.markUnread();
    }

    console.log('リセット処理が完了しました。');

  } catch (error) {
    console.error('リセット処理中にエラーが発生しました: ' + error.message);
    console.error(error.stack);
  }
}