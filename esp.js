function EspMain() {
  try {
    console.log("処理を開始します。");
    searchAndProcessMails();
    console.log("正常に処理が終了しました。");
  } catch (error) {
    console.error("エラーが発生しました: " + error.message);
    console.error("スタックトレース: " + error.stack);
  }
}

// https://www.notion.so/2393b1b53be2805597d2f1b8f2c937a2?v=2393b1b53be280d48a09000c3d58ac29&source=copy_link
// https://www.notion.so/24b3b1b53be280599fe1f1f023b8f793?v=24b3b1b53be280d19e70000c25b0453a&source=copy_link
