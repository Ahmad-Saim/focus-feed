const DEFAULTS = {
  enabled: true,
  hideShorts: true,
  allowlistMode: true,
  allowedChannels: [
    "veritasium",
    "kurzgesagt",
    "kurzgesagt – in a nutshell",
    "the infographics show",
    "starter story"
  ],
  blockedKeywords: []
};

const els = {
  enabled: document.getElementById("enabled"),
  hideShorts: document.getElementById("hideShorts"),
  allowlistMode: document.getElementById("allowlistMode"),
  channelList: document.getElementById("channelList"),
  channelInput: document.getElementById("channelInput"),
  addChannel: document.getElementById("addChannel"),
  keywordList: document.getElementById("keywordList"),
  keywordInput: document.getElementById("keywordInput"),
  addKeyword: document.getElementById("addKeyword"),
  openFeed: document.getElementById("openFeed")
};

let state = { ...DEFAULTS };

function render() {
  els.enabled.checked = state.enabled;
  els.hideShorts.checked = state.hideShorts;
  els.allowlistMode.checked = state.allowlistMode;

  els.channelList.innerHTML = "";
  state.allowedChannels.forEach((ch, i) => {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = ch;
    const btn = document.createElement("button");
    btn.textContent = "✕";
    btn.onclick = () => {
      state.allowedChannels.splice(i, 1);
      save();
    };
    li.appendChild(span);
    li.appendChild(btn);
    els.channelList.appendChild(li);
  });

  els.keywordList.innerHTML = "";
  state.blockedKeywords.forEach((kw, i) => {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = kw;
    const btn = document.createElement("button");
    btn.textContent = "✕";
    btn.onclick = () => {
      state.blockedKeywords.splice(i, 1);
      save();
    };
    li.appendChild(span);
    li.appendChild(btn);
    els.keywordList.appendChild(li);
  });
}

function save() {
  chrome.storage.local.set(state, render);
}

chrome.storage.local.get(DEFAULTS, (stored) => {
  state = stored;
  render();
});

els.enabled.onchange = () => { state.enabled = els.enabled.checked; save(); };
els.hideShorts.onchange = () => { state.hideShorts = els.hideShorts.checked; save(); };
els.allowlistMode.onchange = () => { state.allowlistMode = els.allowlistMode.checked; save(); };

els.addChannel.onclick = () => {
  const val = els.channelInput.value.trim();
  if (!val) return;
  state.allowedChannels.push(val);
  els.channelInput.value = "";
  save();
};
els.channelInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") els.addChannel.click();
});

els.addKeyword.onclick = () => {
  const val = els.keywordInput.value.trim();
  if (!val) return;
  state.blockedKeywords.push(val);
  els.keywordInput.value = "";
  save();
};
els.keywordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") els.addKeyword.click();
});

els.openFeed.onclick = () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("feed.html") });
};
