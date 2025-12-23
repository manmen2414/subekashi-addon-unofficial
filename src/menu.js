// const SUBEKASHI_URL = "https://lyrics.imicomweb.com";
const SUBEKASHI_URL = "http://subekashi.localhost:8000";
/**@param {string} css */
const $ = (css) => document.querySelector(css);

/**
 * @param {string} tabUrl
 */
async function main(tabUrl) {
  const videoId = getVideoId(tabUrl);
  if (!videoId) {
    noYoutube();
    return;
  }
  const info = $("#info");
  info.innerText = "取得中...";
  const res = await fetch(`${SUBEKASHI_URL}/api/song?url=${videoId}`);
  /**@type {SongJson?} */
  const song = (await res.json()).result[0];
  info.innerText = "";
  if (!song) {
    displayRegister(tabUrl);
  } else {
    displaySong(song);
  }
}
/**
 * @param {SongJson} song
 */
function displaySong(song) {
  $("#song-wrapper").style.display = "";
  const url = `${SUBEKASHI_URL}/songs/${song.id}`;
  $("#open-sbks").href = url;
  $("#copy-sbks").onclick = () => copy(url);
  $("#song-title-text").innerText = song.title;
  $("#song-title-copy").addEventListener("click", () => copy(song.title));
  const tags = getTags(song);
  if (tags.length === 0) $("#song-tags-wrapper").style.display = "none";
  $("#song-tags").innerText = tags.join(",");
  if (song.lyrics.length === 0)
    $("#song-lyrics-wrapper").style.display = "none";
  const lyricsToggle = $("#song-lyrics-toggle");
  lyricsToggle.innerText = `表示(${tags.length}件)`;
  // NOTE:そもそもトグル機能いる？
  function showLyrics() {
    $("#song-lyrics").innerText = song.lyrics;
    lyricsToggle.innerText = `非表示`;
    lyricsToggle.onclick = hideLyrics;
  }
  function hideLyrics() {
    $("#song-lyrics").innerText = "";
    lyricsToggle.innerText = `表示`;
    lyricsToggle.onclick = showLyrics;
  }
  song.imitate ??= "";
  song.imitated ??= "";
  const imitate = song.imitate.split(",");
  const imitatesCount = imitate[0] === "" ? 0 : imitate.length;
  const imitated = song.imitated.split(",");
  const imitatedCount = imitated[0] === "" ? 0 : imitated.length;
  if (!imitatesCount && !imitatedCount)
    $("#song-imitate-wrapper").style.display = "none";
  if (!!imitatesCount) {
    const imitatedStr = imitatedCount === 0 ? "" : "、";
    $("#song-imitates").innerText = `${imitatesCount}曲を模倣し${imitatedStr}`;
  }
  if (!!imitatedCount) {
    $("#song-imitated").innerText = `${imitatedCount}曲に模倣され`;
  }
  hideLyrics();
}
/**@param {string} url  */
async function displayRegister(url) {
  const middletoken =
    /<input type="hidden" name="csrfmiddlewaretoken" value="([a-zA-Z0-9]+)">/.exec(
      await (await fetch(`${SUBEKASHI_URL}/songs/new`)).text(),
    )[1];
  $("#regist-wrapper").style.display = "";
  $("#regist-song").addEventListener("click", async () => {
    const res = await fetch(`${SUBEKASHI_URL}/songs/new/?toast=auto`, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      referrer: `${SUBEKASHI_URL}/songs/new`,
      // middlewaretokenは取れたがそもそもOriginが違う時点で返されるので
      // 以降、iframeを用いて入力させるようにしてみる
      body: `csrfmiddlewaretoken=${middletoken}&url=${url}`,
      method: "POST",
    });
    const atUrl = res.headers.get("Location");
    if (!atUrl) alert("登録に失敗しました");
    open(atUrl, "_blank");
  });
}
function noYoutube() {
  $("#info").innerText = "Youtubeの再生ページを開いてください。";
}
/**@param {string} url  */
function getVideoId(url) {
  const shortLink = /http(?:s?)\:\/\/youtu\.be\/([0-9a-zA-z_\-]+)/;
  const normalLink =
    /http(?:s?)\:\/\/www\.youtube\.com\/watch\?v=([0-9a-zA-z_\-]+)/;
  const videoIdExec = shortLink.exec(url) ?? normalLink.exec(url);
  if (!videoIdExec) return null;
  return videoIdExec[1];
}

function copy(text) {
  showToast("コピーしました。", 2000);
  navigator.clipboard.writeText(text);
}
/**
 * @param {string} text
 */
function showToast(text, time = 3000) {
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
  setTimeout(() => {
    toast.style.top = "10px";
  }, 450);
  setTimeout(() => {
    toast.animate([{ top: "10px" }, { top: "-40px" }], {
      duration: 500,
      easing: "ease",
    });
    setTimeout(() => {
      toast.remove();
    }, 450);
  }, time);
}
/**
 * @param {SongJson} song
 */
function getTags(song) {
  /**@type {string[]} */
  const tags = [];
  if (song.isdraft) tags.push("下書き");
  if (song.isoriginal) tags.push("オリジナル模倣");
  if (song.isjoke) tags.push("ネタ曲");
  if (song.isinst) tags.push("インスト曲");
  if (!song.issubeana) tags.push("非すべあな模倣曲");
  if (song.isdeleted) tags.push("非公開/削除済み");
  if (song.isspecial) tags.push("スペシャルデザイン");
  return tags;
}

function getTab() {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, ([tab]) => {
    if (!tab.url) noYoutube();
    else main(tab.url);
  });
}

function initReload() {
  $("#reload").onclick = () => {
    $("#song-wrapper").display = "none";
    $("#regist-wrapper").display = "none";
    getTab();
  };
}

document.addEventListener("DOMContentLoaded", () => {
  initReload();
  getTab();
});
