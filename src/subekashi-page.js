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
  async function aboutAdSetting() {
    const settingSection = document.querySelector("#mainarticle>section");
    if (!settingSection) return;
    // 移動
    const isShownAd = document.getElementById("is_shown_ad");
    if (!isShownAd || !(isShownAd instanceof HTMLSelectElement)) return;
    const shownAdParent = isShownAd.parentElement;
    if (!shownAdParent) return;
    const adColomnTitle = document.createElement("h2");
    adColomnTitle.innerText = "トップ画面の宣伝";
    settingSection.append(adColomnTitle, shownAdParent);
    // 設定の追加
    const showUnpassedNow =
      ((await cookieStore.get("show_unpassed")) ?? {}).value ?? "off";
    const showUnpassedWrapper = document.createElement("div");
    showUnpassedWrapper.className = "form-col";
    showUnpassedWrapper.innerHTML = `<label>未審査・未通過</label>
    <select id="show_unpassed" class="setting-input">
    <option value="off" ${showUnpassedNow === "off" ? "selected" : ""}>非表示</option>;
    <option value="still" ${showUnpassedNow === "still" ? "selected" : ""}>未審査を表示</option>
    <option value="fail" ${showUnpassedNow === "fail" ? "selected" : ""}>未審査と未通過を表示</option>
    </select>`;
    settingSection.append(showUnpassedWrapper);
    const showUnpassed = document.getElementById("show_unpassed");
    if (!showUnpassed) return;
    if (!(showUnpassed instanceof HTMLSelectElement)) return;
    showUnpassed.setAttribute(
      "onchange",
      "cookieStore.set('show_unpassed',event.target.value)",
    );
    // 一部設定では自前の宣伝処理を行うため、「宣伝の表示」について補正処理を入れる
    isShownAd.setAttribute(
      "onchange",
      "cookieStore.set('is_shown_ad_addoned',event.target.value)",
    );
    isShownAd.value =
      ((await cookieStore.get("is_shown_ad_addoned")) ?? {}).value ?? "on";
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
  function page() {
    document
      .querySelector("#mainarticle>section>h2")
      ?.insertAdjacentHTML(
        "beforebegin",
        `<p style="text-align:center">※一部の設定は非公式アドオンによって自由入力に変更されています。</p>`,
      );
    freeNumberSettingForId("is_shown_new");
    freeNumberSettingForId("is_shown_lack");
    aboutAdSetting();
  }
  _pageScripts.push({ path, page });
})();

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

// Top Page
(() => {
  const path = "";
  async function selectRandomAdContent(
    allowStill = false,
    allowFailed = false,
  ) {
    const res = await fetch("https://lyrics.imicomweb.com/api/ad/");
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
    htmlText = htmlText.replaceAll("%id%", regExec[1]);

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
      await fetch(`https://lyrics.imicomweb.com/api/ad/${selectedAd.id}`, {
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
