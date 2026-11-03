/**
 * 拡張機能の設定。chrome.storage.syncに保存する
 */
const DEFAULT_SETTINGS = {
  /**YouTubeの右下に表示するボタン */
  showFloatingButton: true,
};

/**
 * @returns {Promise<typeof DEFAULT_SETTINGS>}
 */
function getSettings() {
  return chrome.storage.sync.get(DEFAULT_SETTINGS);
}

/**
 * @param {keyof typeof DEFAULT_SETTINGS} key
 * @param {boolean} value
 */
function setSetting(key, value) {
  return chrome.storage.sync.set({ [key]: value });
}
