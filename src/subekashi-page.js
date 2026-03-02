//@ts-check
/**@type {{path:string,page:()=>void}[]} */
const _pageScripts = [];

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
  function page() {
    document
      .querySelector("#mainarticle>section>h2")
      ?.insertAdjacentHTML(
        "beforebegin",
        `<p style="text-align:center">※一部の設定は非公式アドオンによって自由入力に変更されています。</p>`,
      );
    freeNumberSettingForId("is_shown_new");
    freeNumberSettingForId("is_shown_lack");

// Song page
(() => {
  const path = "songs";
  /**@param {string} url  */
  //TODO: どうにかして関数をインジェクトする
  //@ts-ignore
  exportFunction(
    /**@param {string} url */
    (url) => {
      closeYoutubeVideo();
      const regExec = /youtu\.be\/([a-zA-Z0-9_\-]+)/.exec(url);
      if (!regExec) {
        showToast("error", "このリンクはYoutubeのものではありません。");
        return;
      }
      const tr = document.createElement("tr");
      tr.id = "youtube-area";
      tr.innerHTML = `<td><i class="fas fa-window-close" onclick="_sbksAddonCloseYoutubeVideo()"></i>プレイヤー</td><td><iframe width="448" height="252" src="https://www.youtube.com/embed/${regExec[1]}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></td>`;
      const info = document.getElementById("song-info");
      if (!info)
        return void showToast(
          "error",
          "再生するフレームの作成に失敗しました。",
        );
      info.insertAdjacentElement("beforeend", tr);
    },
    window,
    { defineAs: "_sbksAddonPlayYoutubeVideo" },
  );
  const closeYoutubeVideo = () => {
    const tr = document.querySelector("#youtube-area");
    if (!tr) return;
    tr.remove();
  };
  //@ts-ignore
  exportFunction(closeYoutubeVideo, window, {
    defineAs: "_sbksAddonCloseYoutubeVideo",
  });
  function page() {
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
      playButton.setAttribute(
        "onclick",
        `_sbksAddonPlayYoutubeVideo("${a.href}")`,
      );
      playButton.append(playButtonIcon);
      playButton.style.background = "none";
      playButton.style.width = "fit-content";
      playButton.style.height = "fit-content";
      playButton.style.margin = "0";
      playButton.style.padding = "3px";
      a.insertAdjacentElement("beforebegin", playButton);
    });
  }
  _pageScripts.push({ path, page });
})();

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
