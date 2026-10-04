// Focus Feed — filters YouTube to the channels you choose.
// YouTube's page is built from Shadow DOM custom elements (ytd-*), so a
// plain document.querySelectorAll() can't see most of what's on the page.
// Every lookup below walks through open shadow roots to find real content.

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

const DEBUG = true; // set to false once this is confirmed working
function log(...args) {
  if (DEBUG) console.log("[Focus Feed]", ...args);
}

let settings = { ...DEFAULTS };

function loadSettings(cb) {
  chrome.storage.local.get(DEFAULTS, (stored) => {
    settings = stored;
    cb();
  });
}

function normalize(str) {
  return (str || "").toLowerCase().trim();
}

// --- Shadow-DOM-piercing query helpers -------------------------------

function deepQuerySelectorAll(root, selector) {
  let results = [];
  if (root.querySelectorAll) {
    results = results.concat(Array.from(root.querySelectorAll(selector)));
    root.querySelectorAll("*").forEach((el) => {
      if (el.shadowRoot) {
        results = results.concat(deepQuerySelectorAll(el.shadowRoot, selector));
      }
    });
  }
  return results;
}

function deepFindText(node, selectors) {
  for (const sel of selectors) {
    const matches = deepQuerySelectorAll(node, sel);
    for (const el of matches) {
      const text = el.textContent && el.textContent.trim();
      if (text) return text;
    }
  }
  return "";
}

// --- Content extraction -----------------------------------------------

function getChannelText(node) {
  const bylineSelectors = [
    "ytd-channel-name #text",
    "ytd-channel-name yt-formatted-string",
    "#channel-name #text",
    ".ytd-channel-name a",
    "#byline a"
  ];
  const text = deepFindText(node, bylineSelectors);
  if (text) return text;

  // fallback: any link pointing at a channel/handle page
  const links = deepQuerySelectorAll(node, 'a[href^="/@"], a[href^="/channel/"]');
  for (const link of links) {
    const t = link.textContent && link.textContent.trim();
    if (t) return t;
    const href = link.getAttribute("href") || "";
    const handleMatch = href.match(/\/@([^/?]+)/);
    if (handleMatch) return handleMatch[1].replace(/-/g, " ");
  }
  return "";
}

function getTitleText(node) {
  const titleSelectors = ["#video-title", "#video-title-link", "a#video-title", "h3 a"];
  return deepFindText(node, titleSelectors);
}

function channelIsAllowed(channelText) {
  const ch = normalize(channelText);
  if (!ch) return true; // unknown — don't hide, avoid false positives
  return settings.allowedChannels.some((allowed) => ch.includes(normalize(allowed)));
}

function titleIsBlocked(titleText) {
  const t = normalize(titleText);
  if (!t) return false;
  return settings.blockedKeywords.some((kw) => kw && t.includes(normalize(kw)));
}

// --- Finding items on the page -----------------------------------------

const VIDEO_ITEM_SELECTORS = [
  "ytd-rich-item-renderer",
  "ytd-video-renderer",
  "ytd-compact-video-renderer",
  "ytd-grid-video-renderer"
];

const SHORTS_SELECTORS = [
  "ytd-rich-shelf-renderer[is-shorts]",
  "ytd-reel-shelf-renderer",
  'a[href^="/shorts"]'
];

function findAll(selectors) {
  let results = [];
  selectors.forEach((sel) => {
    results = results.concat(deepQuerySelectorAll(document.body, sel));
  });
  return results;
}

function hideShortsShelves() {
  if (!settings.hideShorts) return;
  const found = findAll(SHORTS_SELECTORS);
  found.forEach((el) => {
    const shelf =
      el.closest?.("ytd-rich-section-renderer, ytd-reel-shelf-renderer, ytd-guide-entry-renderer") || el;
    shelf.classList.add("ff-hidden");
  });
}

function filterVideoItems() {
  if (!settings.enabled) return;
  const items = findAll(VIDEO_ITEM_SELECTORS);
  let hiddenCount = 0;
  let checkedCount = 0;

  items.forEach((node) => {
    if (node.dataset.ffChecked === "1") return;
    const channelText = getChannelText(node);
    const titleText = getTitleText(node);
    if (!channelText && !titleText) return; // not rendered yet — retry next pass

    let hide = false;
    if (settings.allowlistMode && !channelIsAllowed(channelText)) hide = true;
    if (!hide && titleIsBlocked(titleText)) hide = true;

    if (hide) {
      node.classList.add("ff-hidden");
      hiddenCount++;
    }
    node.dataset.ffChecked = "1";
    checkedCount++;
  });

  log(`scanned ${items.length} items, newly checked ${checkedCount}, hid ${hiddenCount}`);
}

function runFilter() {
  hideShortsShelves();
  filterVideoItems();
}

function resetCheckedMarks() {
  document.querySelectorAll("[data-ff-checked]").forEach((n) => delete n.dataset.ffChecked);
}

function init() {
  loadSettings(() => {
    log("settings loaded", settings);
    runFilter();

    document.addEventListener("yt-navigate-finish", () => {
      resetCheckedMarks();
      setTimeout(runFilter, 300);
    });

    let debounceTimer = null;
    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(runFilter, 250);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  loadSettings(() => {
    document.querySelectorAll(".ff-hidden").forEach((n) => n.classList.remove("ff-hidden"));
    resetCheckedMarks();
    runFilter();
  });
});

init();
