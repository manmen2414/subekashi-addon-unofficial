/**YouTube上のパネル(iframe)から、親のページにパネルを閉じるよう伝えるメッセージ */
const CLOSE_PANEL_MESSAGE = "subekashi-addon-close-panel";
/**
 * YouTube上のパネル(iframe)から、親のページにパネルの大きさを変えるよう伝えるメッセージ
 * wide: 歌詞を開いているか、height: 歌詞を閉じているときの中身の高さ(開いているときはnull)
 */
const PANEL_SIZE_MESSAGE = "subekashi-addon-panel-size";
/**YouTube上のパネル(iframe)の親のページのオリジン */
const YOUTUBE_ORIGIN = "https://www.youtube.com";

/**
 * s秒間プログラムを停止する。signalがabortされたらすぐに戻る
 * @param {number} s
 * @param {AbortSignal} [signal]
 */
function sleep(s, signal) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, s * 1000);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
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
  // サーバーが応答しないときに「読み込み中」のまま止まらないよう、1回の取得ごとに打ち切ってリトライする
  const FETCH_TIMEOUT = 5000;

  jsonControllers[from]?.abort();
  const jsonController = new AbortController();
  jsonControllers[from] = jsonController;

  for (let retry = 1; retry <= MAX_RETRY_COUNT; retry++) {
    try {
      const res = await fetch(`${SUBEKASHI_URL}/api/${path}`, {
        cache: "reload",
        signal: AbortSignal.any([
          jsonController.signal,
          AbortSignal.timeout(FETCH_TIMEOUT),
        ]),
      });
      if (!res.ok) {
        throw Object.assign(new Error(`HTTP error! Status: ${res.status}`), {
          status: res.status,
        });
      }
      return await res.json();
    } catch (error) {
      if (jsonController.signal.aborted) {
        return;
      }
      // 429以外の4xxはリクエストが不正なため、リトライしても同じ結果になる
      const isClientError =
        error.status >= 400 && error.status < 500 && error.status !== 429;
      if (isClientError || retry >= MAX_RETRY_COUNT) {
        throw error;
      }
      await sleep(0.2 * 2 ** retry, jsonController.signal);
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
 * 動画IDに紐づく曲を取得する。再度の取得でキャンセルされた場合はundefined、取得できなかった場合や想定外の形式だった場合は例外を投げる
 * @param {string} videoId
 * @returns {Promise<SongJson[]|undefined>}
 */
async function fetchSongs(videoId) {
  const json = await exponentialBackoff(
    `song/?url=${encodeURIComponent(`https://youtu.be/${videoId}`)}`,
    "song",
  );
  if (!json) return;
  // 表示できない曲が混ざっていると、登録済みなのに何も表示されなくなるため、まとめてエラーにする
  if (
    !Array.isArray(json.result) ||
    !json.result.every((song) => Number.isInteger(song?.id))
  ) {
    throw new Error("Unexpected response");
  }
  return json.result;
}

/**
 * 曲の登録画面のURL。動画のURLが入力済みになる
 * @param {string} videoId
 */
function getNewSongUrl(videoId) {
  return `${SUBEKASHI_URL}/songs/new/?url=${encodeURIComponent(`https://youtu.be/${videoId}`)}`;
}
