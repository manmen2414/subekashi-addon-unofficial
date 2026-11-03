/**
 * s秒間プログラムを停止する
 * @param {number} s
 */
function sleep(s) {
  return new Promise((resolve) => setTimeout(resolve, s * 1000));
}

/**@type {Record<string, AbortController>} fromごとのAbortController */
const jsonControllers = {};

/**
 * すべかしのAPIを指数バックオフで取得する。同じfromの以前のリクエストはキャンセルされ、キャンセルされた場合はundefinedを返す
 * (すべかしのbase.jsのexponentialBackoff相当)
 * @param {string} path
 * @param {string} from
 */
async function exponentialBackoff(path, from = "default") {
  const MAX_RETRY_COUNT = 5;

  jsonControllers[from]?.abort();
  const jsonController = new AbortController();
  jsonControllers[from] = jsonController;

  for (let retry = 1; retry <= MAX_RETRY_COUNT; retry++) {
    try {
      const res = await fetch(`${SUBEKASHI_URL}/api/${path}`, {
        cache: "reload",
        signal: jsonController.signal,
      });
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      return await res.json();
    } catch (error) {
      if (jsonController.signal.aborted) {
        return;
      }
      if (retry < MAX_RETRY_COUNT) {
        await sleep(0.2 * 2 ** retry);
      } else {
        throw error;
      }
    }
  }
}

/**
 * YouTubeの動画のURLから動画IDを取り出す。YouTubeの動画のURLでなければnull
 * @param {string} url
 * @returns {string?}
 */
function getVideoId(url) {
  /**@type {URL} */
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  let videoId = null;
  if (parsed.hostname === "youtu.be") {
    videoId = parsed.pathname.slice(1);
  } else if (
    ["www.youtube.com", "m.youtube.com", "youtube.com"].includes(
      parsed.hostname,
    ) &&
    parsed.pathname === "/watch"
  ) {
    videoId = parsed.searchParams.get("v");
  }
  if (!videoId || !/^[0-9A-Za-z_\-]+$/.test(videoId)) return null;
  return videoId;
}

/**
 * 動画IDに紐づく曲を取得する。再度の取得でキャンセルされた場合はundefined、取得できなかった場合は例外を投げる
 * @param {string} videoId
 * @returns {Promise<SongJson[]|undefined>}
 */
async function fetchSongs(videoId) {
  const json = await exponentialBackoff(
    `song/?url=${encodeURIComponent(`https://youtu.be/${videoId}`)}`,
    "song",
  );
  return json?.result;
}

/**
 * 曲の登録画面のURL。動画のURLが入力済みになる
 * @param {string} videoId
 */
function getNewSongUrl(videoId) {
  return `${SUBEKASHI_URL}/songs/new/?url=${encodeURIComponent(`https://youtu.be/${videoId}`)}`;
}
