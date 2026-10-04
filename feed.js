const statusEl = document.getElementById("status");
const gridEl = document.getElementById("grid");
const setupEl = document.getElementById("setup");
const apiKeyInput = document.getElementById("apiKey");
const saveKeyBtn = document.getElementById("saveKey");

function setStatus(msg) {
  statusEl.textContent = msg;
}

async function resolveChannelId(apiKey, nameOrHandle, cache) {
  if (cache[nameOrHandle]) return cache[nameOrHandle];

  // try as a handle first
  const handle = nameOrHandle.startsWith("@") ? nameOrHandle : "@" + nameOrHandle.replace(/\s+/g, "");
  let res = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`
  );
  let data = await res.json();
  if (data.items && data.items.length) {
    cache[nameOrHandle] = data.items[0].id;
    return cache[nameOrHandle];
  }

  // fall back to a name search
  res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(
      nameOrHandle
    )}&maxResults=1&key=${apiKey}`
  );
  data = await res.json();
  if (data.items && data.items.length) {
    cache[nameOrHandle] = data.items[0].snippet.channelId;
    return cache[nameOrHandle];
  }
  return null;
}

async function getUploadsPlaylistId(apiKey, channelId, cache) {
  if (cache[channelId]) return cache[channelId];
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
  );
  const data = await res.json();
  const uploads = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (uploads) cache[channelId] = uploads;
  return uploads || null;
}

async function getLatestVideos(apiKey, playlistId, max = 6) {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${max}&key=${apiKey}`
  );
  const data = await res.json();
  return data.items || [];
}

function renderVideos(videos) {
  videos.sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt));
  gridEl.innerHTML = "";
  videos.forEach((v) => {
    const vid = v.snippet.resourceId?.videoId;
    if (!vid) return;
    const a = document.createElement("a");
    a.className = "card";
    a.href = `https://www.youtube.com/watch?v=${vid}`;
    a.target = "_blank";
    const thumb = v.snippet.thumbnails?.medium?.url || v.snippet.thumbnails?.default?.url || "";
    a.innerHTML = `
      <img src="${thumb}" alt="">
      <div class="info">
        <div class="title">${v.snippet.title}</div>
        <div class="meta">${v.snippet.channelTitle} · ${new Date(v.snippet.publishedAt).toLocaleDateString()}</div>
      </div>
    `;
    gridEl.appendChild(a);
  });
}

async function loadFeed(apiKey) {
  setStatus("Loading your channels…");
  const { allowedChannels, channelIdCache, playlistIdCache } = await chrome.storage.local.get({
    allowedChannels: [
      "veritasium",
      "kurzgesagt",
      "kurzgesagt – in a nutshell",
      "the infographics show",
      "starter story"
    ],
    channelIdCache: {},
    playlistIdCache: {}
  });

  if (!allowedChannels.length) {
    setStatus("No channels added yet. Add some from the extension popup, then reload this page.");
    return;
  }

  let allVideos = [];
  for (const name of allowedChannels) {
    try {
      const channelId = await resolveChannelId(apiKey, name, channelIdCache);
      if (!channelId) continue;
      const playlistId = await getUploadsPlaylistId(apiKey, channelId, playlistIdCache);
      if (!playlistId) continue;
      const videos = await getLatestVideos(apiKey, playlistId, 6);
      allVideos = allVideos.concat(videos);
    } catch (e) {
      console.error("Failed to load channel:", name, e);
    }
  }

  await chrome.storage.local.set({ channelIdCache, playlistIdCache });

  if (!allVideos.length) {
    setStatus("Couldn't load any videos. Double-check your API key and channel names in the popup.");
    return;
  }

  setStatus(`Showing the latest from ${allowedChannels.length} channel(s).`);
  renderVideos(allVideos);
}

chrome.storage.local.get(["youtubeApiKey"], ({ youtubeApiKey }) => {
  if (youtubeApiKey) {
    apiKeyInput.value = youtubeApiKey;
    setupEl.style.display = "none";
    loadFeed(youtubeApiKey);
  }
});

saveKeyBtn.onclick = () => {
  const key = apiKeyInput.value.trim();
  if (!key) return;
  chrome.storage.local.set({ youtubeApiKey: key }, () => {
    setupEl.style.display = "none";
    loadFeed(key);
  });
};
