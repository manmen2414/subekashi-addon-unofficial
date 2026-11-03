// YouTubeの再生ページの右下に、曲の掲載状況を示すボタンを表示する
(() => {
  /**@typedef {"loading"|"found"|"missing"|"error"} ButtonState */

  const HOST_ID = "subekashi-addon-unofficial-button";
  const SVG_NS = "http://www.w3.org/2000/svg";

  /**@type {Record<ButtonState, string>} */
  const STATE_LABELS = {
    loading: "すべかしの曲の情報を取得中...",
    found: "すべかしに登録されています。クリックで曲の情報を表示",
    missing: "すべかしに登録されていません。クリックで登録画面を開く",
    error: "曲の情報を取得できませんでした。クリックで再取得",
  };
  /**@type {Record<Exclude<ButtonState, "loading">, string>} stroke形式のSVGのpath */
  const ICON_PATHS = {
    found: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
    missing: "M12 5v14M5 12h14",
    error: "M12 6v8M12 18h.01",
  };
  const STYLE = `
    .fab {
      position: fixed;
      right: 20px;
      bottom: 20px;
      z-index: 2147483647;
      width: 56px;
      height: 56px;
      padding: 0;
      border: none;
      border-radius: 50%;
      background-color: var(--bg);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
      cursor: pointer;
      transition: transform 0.15s, background-color 0.2s;
    }
    .fab:hover { transform: scale(1.06); }
    .fab[data-state="loading"] { --bg: #777; --badge: #555; cursor: progress; }
    .fab[data-state="found"] { --bg: #2e9e5b; --badge: #1f7a43; }
    .fab[data-state="missing"] { --bg: #d9453d; --badge: #a82f29; }
    .fab[data-state="error"] { --bg: #777; --badge: #555; }
    .logo {
      position: absolute;
      top: 8px;
      left: 8px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
    }
    .badge {
      position: absolute;
      right: -4px;
      bottom: -4px;
      width: 24px;
      height: 24px;
      box-sizing: border-box;
      display: grid;
      place-items: center;
      border: 2px solid #fff;
      border-radius: 50%;
      background-color: var(--badge);
    }
    .badge svg {
      width: 14px;
      height: 14px;
      fill: none;
      stroke: #fff;
      stroke-width: 3;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .spinner {
      width: 10px;
      height: 10px;
      box-sizing: border-box;
      border: 2px solid rgba(255, 255, 255, 0.35);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) {
      .spinner { animation-duration: 3s; }
    }
    .panel {
      position: fixed;
      right: 20px;
      bottom: 90px;
      z-index: 2147483647;
      width: 300px;
      height: 480px;
      max-height: calc(100vh - 110px);
      border: 1px solid #555;
      border-radius: 12px;
      background-color: #111;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      transition: width 0.15s;
    }
    .panel.wide { width: 360px; }
  `;

  /**@type {HTMLElement?} */
  let host = null;
  /**@type {HTMLButtonElement?} */
  let button = null;
  /**@type {HTMLIFrameElement?} */
  let panel = null;
  /**@type {string?} */
  let currentVideoId = null;
  /**@type {ButtonState} */
  let state = "loading";
  /**設定を読み込むまでは表示しない */
  let enabled = false;

  /**
   * @param {string} path
   */
  function createIcon(path) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    const pathEl = document.createElementNS(SVG_NS, "path");
    pathEl.setAttribute("d", path);
    svg.append(pathEl);
    return svg;
  }

  function createButton() {
    // 拡張機能を更新・再読み込みしたあとは、前のスクリプトが作ったボタンが残っていることがある
    document.getElementById(HOST_ID)?.remove();
    host = document.createElement("div");
    host.id = HOST_ID;
    const shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = STYLE;

    button = document.createElement("button");
    button.className = "fab";
    button.type = "button";
    button.addEventListener("click", onClick);

    const logo = document.createElement("img");
    logo.className = "logo";
    logo.alt = "";
    logo.src = chrome.runtime.getURL("assets/icon_128.png");
    const badge = document.createElement("span");
    badge.className = "badge";
    button.append(logo, badge);

    shadow.append(style, button);
    (document.body ?? document.documentElement).append(host);
  }

  /**
   * @param {ButtonState} next
   */
  function setState(next) {
    state = next;
    if (!button) return;
    button.dataset.state = next;
    button.title = STATE_LABELS[next];
    button.setAttribute("aria-label", STATE_LABELS[next]);
    const badge = button.querySelector(".badge");
    if (next === "loading") {
      const spinner = document.createElement("span");
      spinner.className = "spinner";
      badge?.replaceChildren(spinner);
    } else {
      badge?.replaceChildren(createIcon(ICON_PATHS[next]));
    }
    if (next !== "found") closePanel();
  }

  function removeButton() {
    closePanel();
    host?.remove();
    host = null;
    button = null;
  }

  /**
   * パネルの外側をクリックしたら閉じる
   * @param {MouseEvent} event
   */
  function onOutsideClick(event) {
    if (host && !event.composedPath().includes(host)) closePanel();
  }

  /**
   * @param {KeyboardEvent} event
   */
  function onKeydown(event) {
    if (event.key === "Escape") closePanel();
  }

  /**
   * パネルの中から、Escapeが押されたら閉じる・歌詞を開閉したら幅を変えるよう伝えられる
   * @param {MessageEvent} event
   */
  function onMessage(event) {
    if (
      !panel ||
      event.source !== panel.contentWindow ||
      event.origin !== new URL(chrome.runtime.getURL("")).origin
    ) {
      return;
    }
    if (event.data?.type === CLOSE_PANEL_MESSAGE) {
      closePanel();
    } else if (event.data?.type === WIDE_PANEL_MESSAGE) {
      panel.classList.toggle("wide", event.data.wide === true);
    }
  }

  function openPanel() {
    if (panel || !host) return;
    panel = document.createElement("iframe");
    panel.className = "panel";
    panel.allow = "clipboard-write";
    panel.src = `${chrome.runtime.getURL("src/menu.html")}?url=${encodeURIComponent(location.href)}`;
    host.shadowRoot?.append(panel);
    // YouTubeのページ全体で常にイベントを受けないよう、パネルを開いている間だけ登録する
    document.addEventListener("click", onOutsideClick, true);
    document.addEventListener("keydown", onKeydown);
    window.addEventListener("message", onMessage);
  }

  function closePanel() {
    if (!panel) return;
    panel.remove();
    panel = null;
    document.removeEventListener("click", onOutsideClick, true);
    document.removeEventListener("keydown", onKeydown);
    window.removeEventListener("message", onMessage);
  }

  function onClick() {
    if (!currentVideoId) return;
    if (state === "found") {
      if (panel) closePanel();
      else openPanel();
    } else if (state === "missing") {
      window.open(getNewSongUrl(currentVideoId), "_blank", "noopener");
    } else if (state === "error") {
      load(true);
    }
  }

  /**
   * 今開いている動画の掲載状況を調べてボタンに反映する
   * @param {boolean} force 同じ動画でも取得し直す
   */
  async function load(force = false) {
    // 拡張機能を更新・再読み込みすると、開いているタブの古いスクリプトはchrome.*を使えなくなる
    if (!chrome.runtime?.id) return;
    const videoId = getVideoId(location.href);
    if (!enabled || !videoId) {
      currentVideoId = null;
      removeButton();
      return;
    }
    if (videoId === currentVideoId && !force && host) return;

    currentVideoId = videoId;
    if (!host) createButton();
    setState("loading");
    try {
      const songs = await fetchSongs(videoId);
      // 取得中に別の動画に移った
      if (!songs || videoId !== currentVideoId) return;
      setState(songs.length > 0 ? "found" : "missing");
    } catch {
      if (videoId === currentVideoId) setState("error");
    }
  }

  function init() {
    // 設定を読み込んでいる間の変更を取りこぼさないよう、先にリスナーを登録する
    let changedWhileLoading = false;
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync" || !changes.showFloatingButton) return;
      changedWhileLoading = true;
      enabled = changes.showFloatingButton.newValue ?? true;
      load();
    });

    // YouTubeは再生ページの移動でページを読み込み直さない
    window.addEventListener("yt-navigate-finish", () => load());
    window.addEventListener("popstate", () => load());

    getSettings()
      .then((settings) => {
        if (!changedWhileLoading) enabled = settings.showFloatingButton;
        load();
      })
      .catch(() => {});
  }

  init();
})();
