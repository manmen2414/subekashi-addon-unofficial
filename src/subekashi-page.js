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
  }
  _pageScripts.push({ path, page });
})();

// Get Page
(() => {
  // 最初と最後の/がないパス
  const thisPath = location.pathname.replace(/(^\/)|(\/$)/g, "");
  const pageScript = _pageScripts.find(({ path }) => path === thisPath);
  if (!pageScript) return;
  pageScript.page();
})();
