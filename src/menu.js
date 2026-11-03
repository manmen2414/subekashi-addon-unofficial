/**@param {string} css */
const $ = (css) => document.querySelector(css);

/**@type {Record<string, string>} */
const CATEGORY_LABELS = {
  arrange: "アレンジ",
  otomad: "音MAD",
  medley: "メドレー",
  omnibus: "総集編",
  notice: "予告",
  offv: "オフボ",
  cover: "カバー",
  meme: "ネタ動画",
};

/**@param {number} millsecond  */
function timeout(millsecond) {
  return new Promise((s) => setTimeout(s, millsecond));
}

/**
 * 曲の情報を表示する動画のURL。YouTube上のパネルから開いたときはクエリのurl、拡張機能のボタンから開いたときは今のタブのURL
 * @returns {Promise<string|undefined>}
 */
function getTabUrl() {
  const url = new URLSearchParams(location.search).get("url");
  if (url) return Promise.resolve(url);
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, ([tab]) =>
      resolve(tab?.url),
    );
  });
}

/**最後に始めた読み込みの番号。再読み込みされたら、前の読み込みの結果は捨てる */
let loadCount = 0;

async function main() {
  const loadId = ++loadCount;
  resetView();
  const tabUrl = await getTabUrl();
  if (loadId !== loadCount) return;
  const videoId = tabUrl ? getVideoId(tabUrl) : null;
  if (!videoId) {
    noYoutube();
    return;
  }
  $("#info").innerText = "取得中...";
  /**@type {SongJson[]|undefined} */
  let songs;
  try {
    songs = await fetchSongs(videoId);
  } catch {
    if (loadId !== loadCount) return;
    $("#info").innerText =
      "曲の情報を取得できませんでした。通信状況を確認して、右上の再読み込みボタンを押してください。";
    return;
  }
  // 再読み込みされ、取得がキャンセルされた
  if (!songs || loadId !== loadCount) return;
  $("#info").innerText = "";
  if (songs.length === 0) {
    displayRegister(videoId);
  } else {
    songs.forEach(displaySong);
  }
}

function resetView() {
  $("#info").innerText = "";
  $("#songs").replaceChildren();
  $("#regist-wrapper").hidden = true;
  notifyPanelWidth();
}

/**
 * YouTube上のパネルの場合、歌詞を開いているときだけ幅を広げるよう親のページに伝える
 */
function notifyPanelWidth() {
  if (!inFrame) return;
  parent.postMessage(
    { type: WIDE_PANEL_MESSAGE, wide: !!$("details[open]") },
    YOUTUBE_ORIGIN,
  );
}

/**
 * @param {SongJson} song
 */
function displaySong(song) {
  /**@type {DocumentFragment} */
  //@ts-ignore
  const el = $("#song-template").content.cloneNode(true);
  /**@param {string} css */
  const $$ = (css) => el.querySelector(css);

  const url = `${SUBEKASHI_URL}/songs/${song.id}`;
  $$(".song-open").href = url;
  $$(".song-url").innerText = url.replace(/^https?:\/\//, "");
  $$(".song-url-copy").addEventListener("click", () => copy(url));
  $$(".song-title-text").innerText = song.title;
  $$(".song-title-copy").addEventListener("click", () => copy(song.title));

  const tags = getTags(song);
  if (tags.length === 0) $$(".song-tags-wrapper").hidden = true;
  $$(".song-tags").innerText = tags.join(",");

  const imitatesCount = song.imitates?.length ?? 0;
  const imitatedCount = song.imitateds?.length ?? 0;
  if (!imitatesCount && !imitatedCount)
    $$(".song-imitate-wrapper").hidden = true;
  if (imitatesCount) {
    const imitatedStr = imitatedCount === 0 ? "" : "、";
    $$(".song-imitates").innerText = `${imitatesCount}曲を模倣し${imitatedStr}`;
  }
  if (imitatedCount) {
    $$(".song-imitated").innerText = `${imitatedCount}曲に模倣され`;
  }

  if (!song.lyrics) $$(".song-lyrics-wrapper").hidden = true;
  $$(".song-lyrics").innerText = song.lyrics;

  $("#songs").append(el);
}
/**@param {string} videoId  */
function displayRegister(videoId) {
  $("#regist-wrapper").hidden = false;
  $("#regist-song").onclick = () =>
    open(getNewSongUrl(videoId), "_blank", "noopener");
}
function noYoutube() {
  $("#info").innerText = "Youtubeの再生ページを開いてください。";
}

/**@param {string} text */
async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("コピーしました。", 2000);
  } catch {
    showToast("コピーできませんでした。", 2000);
  }
}
/**
 * @param {string} text
 */
async function showToast(text, time = 3000) {
  const beforeToast = $("#toast");
  if (!!beforeToast) beforeToast.remove();
  const toast = document.createElement("div");
  toast.id = "toast";
  toast.innerText = text;
  document.body.appendChild(toast);
  toast.animate([{ top: "-40px" }, { top: "10px" }], {
    duration: 500,
    easing: "ease",
  });
  await timeout(450);
  toast.style.top = "10px";
  await timeout(time);
  toast.animate([{ top: "10px" }, { top: "-40px" }], {
    duration: 500,
    easing: "ease",
  });
  await timeout(450);
  toast.remove();
}
/**
 * 曲ページのタグと同じ順に並べる
 * @param {SongJson} song
 */
function getTags(song) {
  /**@type {string[]} */
  const tags = [];
  if (song.category !== "song")
    tags.push(CATEGORY_LABELS[song.category] ?? song.category);
  if (song.prush) tags.push(song.prush);
  if (song.is_questionable) tags.push("界隈曲?");
  if (song.is_draft) tags.push("下書き");
  if (song.is_original) tags.push("オリジナル模倣");
  if (song.is_joke) tags.push("ネタ曲");
  if (song.is_inst) tags.push("インスト曲");
  if (!song.is_subeana && !song.is_questionable) tags.push("非すべあな模倣曲");
  if (song.is_deleted) tags.push("非公開/削除済み");
  if (song.is_special) tags.push("スペシャルデザイン");
  if (song.is_limited) tags.push("限定公開");
  return tags;
}

function initReload() {
  $("#reload").onclick = main;
}

async function initSettings() {
  const checkbox = $("#setting-floating-button");
  checkbox.checked = (await getSettings()).showFloatingButton;
  checkbox.addEventListener("change", () =>
    setSetting("showFloatingButton", checkbox.checked),
  );
}

const inFrame = window !== window.top;
document.documentElement.classList.toggle("in-frame", inFrame);

if (inFrame) {
  // パネル内にフォーカスがあるとEscapeは親のページに届かないため、閉じるよう伝える
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      parent.postMessage({ type: CLOSE_PANEL_MESSAGE }, YOUTUBE_ORIGIN);
    }
  });
  // toggleはバブリングしないため、キャプチャで受ける
  document.addEventListener("toggle", notifyPanelWidth, true);
}

document.addEventListener("DOMContentLoaded", () => {
  initReload();
  initSettings();
  main();
});
