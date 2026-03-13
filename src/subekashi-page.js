//@ts-check
/**
 * ページパスごとに変えるスプリクト
 * @type {{path:string,page:()=>void}[]}
 */
const _pageScripts = [];
//@ts-ignore
const runtime = chrome.runtime;
//@ts-ignore
var wrappedJSObject = window.wrappedJSObject;

/**
 * ブラウザの種類
 * @type {'firefox' | 'chrome' | 'unknown'}
 */
const browserType = (() => {
  // Firefox独自の「Xray vision」関連オブジェクトがあるか
  if (
    typeof wrappedJSObject !== "undefined" ||
    navigator.userAgent.includes("Firefox")
  ) {
    return "firefox";
  }
  // Chrome (Chromium系) は window.chrome が存在する
  //@ts-ignore
  if (typeof chrome !== "undefined" && !!chrome.runtime) {
    return "chrome";
  }
  return "unknown";
})();

/**
 * 拡張機能ID
 * @type {string}
 */
const extensionID = (() => {
  try {
    //@ts-ignore
    return chrome.runtime.id;
  } catch (ex) {
    return "";
  }
})();

/**
 * HTML文字列のエスケープ
 * @param {string} str
 */
const escapeHTML = (str) =>
  str.replace(
    /[&"<>']/g,
    (match) =>
      ({
        "&": "&amp;",
        '"': "&quot;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
      })[match] ?? match,
  );

/**
 * トーストを表示する
 * @param {"error" | "info" | "ok" | "warning"} icon
 * @param {string} text
 */
function showToast(icon, text) {
  const escapedIcon = icon.replace(/"/g, `\\"`),
    escapedText = text.replace(/"/g, `\\"`);
  const args = [escapedIcon, escapedText];
  if (browserType === "firefox") {
    //@ts-ignore
    const clonedArgs = cloneInto(args, window);
    wrappedJSObject.showToast(...clonedArgs);
  } else {
    const event = new CustomEvent(`subekashi-addon-unofficial-showToast`, {
      detail: args,
    });
    window.dispatchEvent(event);
  }
}

// ページ側のスプリクトを使えるようにする(Firefoxは別の方法で用いる)
(() => {
  if (browserType !== "firefox") {
    const injectsrc = runtime.getURL("src/pageInject.js");
    const script = document.createElement("script");
    script.src = injectsrc;
    document.head.appendChild(script);
  }
})();

/**
 * @overload
 * @param {HTMLButtonElement} btn 
 * @returns {HTMLButtonElement}
 */
/**
 * @overload
 * @param {HTMLElement?} btn
 * @returns {HTMLButtonElement?}
 */
/**
 * アイコンだけのボタンを作る用に、ボタンをシンプルにする
 * @param {HTMLElement?} btn
 * @returns {HTMLButtonElement?}
 */
function buttonMakeSimple(btn) {
  if (!btn || !(btn instanceof HTMLButtonElement)) return null;
  btn.style.background = "none";
  btn.style.width = "fit-content";
  btn.style.height = "fit-content";
  btn.style.margin = "0";
  return btn;
}
/**
 * ヘルプメッセージ (i)を作成する 
 * @param {string} content 
 */
function generateHelpIcon(content) {
  const icon = document.createElement("i");
  icon.className = "fas fa-info-circle";
  const btn = buttonMakeSimple(document.createElement("button"));
  btn.onclick = () => showToast("info", content);
  icon.appendChild(btn);
  return icon;
}

// Setting page
(() => {
  const path = "setting";
  /**
   * @param {string} id
   */
  async function freeNumberSettingForId(id) {
    const oldSettingSelector = document.getElementById(id);
    const nowNewSongsSetting = (await cookieStore.get(id)) ?? {
      value: 0,
    };
    if (!oldSettingSelector) throw new Error(`No ${id} setting options`);
    const settingDiv = oldSettingSelector.parentElement;
    if (!settingDiv) throw new Error(`No ${id} setting`);
    const freeOption = document.createElement("input");
    freeOption.type = "number";
    freeOption.value = `${nowNewSongsSetting.value}`;
    freeOption.id = id;
    freeOption.min = "0";
    freeOption.setAttribute(
      "onchange",
      `cookieStore.set("${id}",event.target.value)`,
    );
    oldSettingSelector.remove();
    settingDiv.append(freeOption);
    const label = settingDiv.querySelector("label");
    if (!label) throw new Error(`No ${id} setting label`);
    label.innerText = `${label.innerText}※`;
  }
  /**
   * @param {string} id
   * @param {string} labelContent
   * @param {{id:string,label:string}[]} values
   * @param {string} helpText
   */
  async function generateSelectSetting(id, labelContent, values, helpText = "") {
    const nowValue = ((await cookieStore.get(id)) ?? {}).value ?? values[0].id;
    const settingWrapper = document.createElement("div");
    settingWrapper.className = "form-col";
    const settingLabel = document.createElement("label");
    settingLabel.innerText = labelContent;
    if (helpText.length > 0)
      settingLabel.appendChild(generateHelpIcon(helpText));
    settingWrapper.appendChild(settingLabel);
    const select = document.createElement("select");
    select.id = id;
    select.className = "setting-input";
    select.append(
      ...values.map(({ id, label }) => {
        const option = document.createElement("option");
        option.value = id;
        option.selected = nowValue === id;
        option.innerText = label;
        return option;
      }),
    );
    settingWrapper.appendChild(select);
    const documentedSelect = select;
    if (!documentedSelect || !(documentedSelect instanceof HTMLSelectElement))
      throw new Error(`select#${id} not found`);
    documentedSelect.onchange = () =>
      cookieStore.set(id, documentedSelect.value);
    return settingWrapper;
  }
  async function aboutAdSetting() {
    const settingSection = document.querySelector("#mainarticle>section");
    if (!settingSection) throw new Error(`Setting section not found`);
    // 移動
    const isShownAd = document.getElementById("is_shown_ad");
    if (!isShownAd || !(isShownAd instanceof HTMLSelectElement)) return;
    const shownAdParent = isShownAd.parentElement;
    if (!shownAdParent) return;
    const adColomnTitle = document.createElement("h2");
    adColomnTitle.innerText = "トップ画面の宣伝";
    settingSection.append(adColomnTitle, shownAdParent);
    // 設定の追加
    settingSection.append(
      await generateSelectSetting("show_unpassed", "未審査・未通過", [
        { id: "off", label: "非表示" },
        { id: "still", label: "未審査を表示" },
        { id: "fail", label: "未審査と未通過を表示" },
      ]),
    );

    // 一部設定では自前の宣伝処理を行うため、「宣伝の表示」について補正処理を入れる
    // クローンして元のエレメントを置き換えることで、リスナーを全消去する

    setTimeout(async () => {
      const newIsShownAdElement = isShownAd.cloneNode(true);
      shownAdParent.replaceChild(newIsShownAdElement, isShownAd);
      if (!(newIsShownAdElement instanceof HTMLSelectElement)) return;
      newIsShownAdElement.onchange = (ev) =>
        cookieStore.set("is_shown_ad_addoned", newIsShownAdElement.value);
      isShownAd.value =
        ((await cookieStore.get("is_shown_ad_addoned")) ?? {}).value ?? "on";
    }, 100);

    setInterval(() => {
      calcClientAdRendering();
    }, 50);
    async function calcClientAdRendering() {
      // 拡張済み「宣伝の表示」がonかつ自前の処理を行うオプションがonなら、本来の「宣伝の表示」をoffにする
      const isShownAdAddonedValue =
        ((await cookieStore.get("is_shown_ad_addoned")) ?? {}).value === "on";
      const needClientAdRenderingOptions = [
        ((await cookieStore.get("show_unpassed")) ?? {}).value !== "off",
      ];
      if (
        isShownAdAddonedValue &&
        needClientAdRenderingOptions.some((v) => v)
      ) {
        await cookieStore.set("is_shown_ad", "off");
      } else {
        await cookieStore.set(
          "is_shown_ad",
          isShownAdAddonedValue ? "on" : "off",
        );
      }
    }
  }
  async function aboutSongSetting() {
    const brlyricSelection = document.getElementById("brlyrics");
    if (!brlyricSelection) throw new Error(`#brlyrics not found`);
    const brlyricFormCol = brlyricSelection.parentElement;
    if (!brlyricFormCol)
      throw new Error(`#brlyrics parent (Expect div.form-col) not found`);
    brlyricFormCol.insertAdjacentElement("afterend",
      await generateSelectSetting("hide-joke-lyric", "ネタ曲の歌詞を隠す", [
        { id: "no", label: "いいえ" },
        { id: "yes", label: "はい" },
      ], `ネタ曲の歌詞をデフォルトで非表示にします。ボタンをクリックすることで表示できます。<br>
      この機能を有効化したままスペシャルデザインを閲覧すると、不具合が生じる可能性があります。`)
    );
  }
  function page() {

    freeNumberSettingForId("is_shown_new");
    freeNumberSettingForId("is_shown_lack");
    aboutSongSetting();
    aboutAdSetting();
  }
  _pageScripts.push({ path, page });
})();

// Song page
(() => {
  const path = "songs";
  /**@param {string} url */
  const playYoutubeVideo = (url) => {
    closeYoutubeVideo();
    const regExec = /youtu\.be\/([a-zA-Z0-9_\-]+)/.exec(url);
    if (!regExec) {
      showToast("error", "このリンクはYoutubeのものではありません。");
      return;
    }
    const tr = document.createElement("tr");
    tr.id = "youtube-area";
    tr.innerHTML = `<td><button id="close-video"><i class="fas fa-window-close"></i></button>プレイヤー</td><td><iframe width="448" height="252" src="https://www.youtube.com/embed/${regExec[1]}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></td>`;
    const closebtn = buttonMakeSimple(tr.querySelector("button#close-video"));
    if (!!closebtn) {
      closebtn.onclick = () => closeYoutubeVideo();
    }
    const info = document.getElementById("song-info");
    if (!info)
      return void showToast("error", "再生するフレームの作成に失敗しました。");
    info.insertAdjacentElement("beforeend", tr);
  };
  const closeYoutubeVideo = () => {
    const tr = document.querySelector("#youtube-area");
    if (!tr) return;
    tr.remove();
  };
  function initYoutubeEmbed() {
    const youtubeLinks = Array.from(
      document.querySelectorAll(".song-url>.fa-youtube"),
    )
      .map((el) => el.parentElement)
      .filter((el) => !!el && el instanceof HTMLAnchorElement);
    youtubeLinks.forEach((a) => {
      if (!a.parentElement) return;
      a.parentElement.style.display = "flex";
      const playButtonIcon = document.createElement("i");
      playButtonIcon.className = `fas fa-play`;
      const playButton = document.createElement("button");
      playButton.onclick = () => playYoutubeVideo(a.href);
      playButton.append(playButtonIcon);
      buttonMakeSimple(playButton);
      playButton.style.padding = "3px";
      a.insertAdjacentElement("beforebegin", playButton);
    });
  }
  async function initJokeLyricHide() {
    const settingEnable = (await cookieStore.get("hide-joke-lyric"))?.value ?? "off";
    if (settingEnable !== "yes") return;
    // ネタ曲の判定
    if (!(() => {
      const tagsWrap = document.getElementById("tags");
      if (!tagsWrap) return false;
      // タグ自体が収容されているエレメント
      const tagsContent = tagsWrap.children.item(1);
      if (!tagsContent) return false;
      return Array.from(tagsContent.childNodes).some((c) => {
        if (!(c instanceof HTMLAnchorElement)) return false;
        return c.innerText === "ネタ曲";
      })
    })()) return;

    const lyrics = document.getElementById("lyrics");
    if (!lyrics) return;
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.innerHTML = `<i class="fas fa-eye"></i>表示`;

    lyrics.insertAdjacentElement("beforebegin", details);
    details.append(summary, lyrics);
  }
  function page() {
    initJokeLyricHide();
    initYoutubeEmbed();
  }
  _pageScripts.push({ path, page });
})();

// Top Page
(() => {
  const path = "";
  async function selectRandomAdContent(
    allowStill = false,
    allowFailed = false,
  ) {
    const res = await fetch(`/api/ad/`);
    /**@type {{id:number,url:string,status:"fail"|"pass"|"still",view:number,dup:number}[]} */
    let json = await res.json();
    json = json.filter((ad) => {
      if (!allowStill && ad.status === "still") return false;
      if (!allowFailed && ad.status === "fail") return false;
      return true;
    });
    const allAdDupLong = json.reduce((num, { dup }) => num + dup, 0);
    let selectAdDup = Math.floor(Math.random() * allAdDupLong);
    const selectedAd = json.find((ad) => {
      selectAdDup -= ad.dup;
      if (selectAdDup < 0) return true;
    });
    if (!selectedAd) return;
    return selectedAd;
  }
  async function showAd() {
    /**@type {"off"|"still"|"fail"} */
    //@ts-ignore
    const showUnpassed =
      ((await cookieStore.get("show_unpassed")) ?? {}).value ?? "off";
    let htmlText = `
    <h1>宣伝</h1>
    <div class="underline"></div>
    <div class="youtube" id="ad">
      <iframe id="player" src="https://www.youtube-nocookie.com/embed/%id%?enablejsapi=1" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreenframeborder="0" data-gtm-yt-inspected-8="true"></iframe>
    </div>
    <div class="dummybuttons">
      <a href="/ad/"><div class="dummybutton"><p>宣伝する</p></div></a>
      <a href="/setting/#is_shown_ad"><div class="dummybutton"><p>非表示にする</p></div></a>
    </div>
    `;
    const selectedAd = await selectRandomAdContent(
      showUnpassed !== "off",
      showUnpassed === "fail",
    );
    if (!selectedAd) return;
    const regExec = /youtu\.be\/([a-zA-Z0-9_\-]+)/.exec(selectedAd.url);
    if (!regExec) return;
    htmlText = htmlText.replaceAll("%id%", escapeHTML(regExec[1]));

    const adObject = document.createElement("div");
    adObject.innerHTML = htmlText;
    const h1s = Array.from(document.getElementsByTagName("h1"));
    const adNextItemHeader =
      h1s.find(({ innerText }) => innerText === "未完成") ??
      h1s.find(
        ({ innerText }) => innerText === "未完成" || innerText === "リンク",
      );
    if (!adNextItemHeader) return;
    adNextItemHeader.insertAdjacentElement("beforebegin", adObject);
    // 公開中の宣伝であればviewを増加
    if (selectedAd.status === "pass")
      await fetch(`/api/ad/${selectedAd.id}`, {
        body: JSON.stringify({
          view: selectedAd.view + 1,
        }),
        method: "PUT",
        headers: {
          "Content-Type": "Application/json",
        },
      });
  }

  async function page() {
    if (
      ((await cookieStore.get("is_shown_ad_addoned")) ?? {}).value === "on" &&
      ((await cookieStore.get("is_shown_ad")) ?? {}).value === "off"
    ) {
      showAd();
    }
  }
  _pageScripts.push({ path, page });
})();

// Get Page
(() => {
  // 最初のパス
  const thisPath = location.pathname.replace(/(^\/)|(\/$)/g, "").split("/")[0];
  const pageScript = _pageScripts.find(({ path }) => path === thisPath);
  if (!pageScript) return;
  pageScript.page();
})();

/**@type {Promise<void>} */
const pageDOMLoad = new Promise((r) => {
  if (document.readyState !== "loading") {
    r();
    return;
  }
  document.addEventListener("DOMContentLoaded", () => {
    r();
  });
});
