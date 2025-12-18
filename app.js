// ================= INTRO + OPENING SOUND =================
window.addEventListener("load", () => {
  const intro = document.getElementById("intro");
  if (!intro) return;

  setTimeout(() => {
    intro.style.opacity = "0";
    intro.style.transform = "scale(1.05)";
    setTimeout(() => intro.remove(), 900);
  }, 2200);
});

const openSound = document.getElementById("openSound");
let soundPlayed = false;
document.addEventListener("click", () => {
  if (!soundPlayed && openSound) {
    openSound.play().catch(() => {});
    soundPlayed = true;
  }
}, { once: true });

// ------------ DOM ELEMENTS ------------
const keywordInput = document.getElementById("keyword");
const ratingSelect = document.getElementById("rating");
const contentTypeSelect = document.getElementById("contentType");
const filterBtn = document.getElementById("filterBtn");
const videoListEl = document.getElementById("videoList");
const resultInfoEl = document.getElementById("resultInfo");
const errorInfoEl = document.getElementById("errorInfo");
const loaderEl = document.getElementById("loader");
const themeToggleBtn = document.getElementById("themeToggle");

const playerModal = document.getElementById("playerModal");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalTitleEl = document.getElementById("modalTitle");
const modalChannelEl = document.getElementById("modalChannel");
const modalDescriptionEl = document.getElementById("modalDescription");
const descriptionToggleBtn = document.getElementById("descriptionToggle");
const modalRecommendationsEl = document.getElementById("modalRecommendations");

const nextVideoBtn = document.getElementById("nextVideoBtn");
const prevVideoBtn = document.getElementById("prevVideoBtn");

const miniPlayerBox = document.getElementById("miniPlayer");
const miniTitleEl = document.getElementById("miniTitle");
const miniPlayPauseBtn = document.getElementById("miniPlayPauseBtn");
const miniExpandBtn = document.getElementById("miniExpandBtn");
const miniCloseBtn = document.getElementById("miniCloseBtn");
const miniNextBtn = document.getElementById("miniNextBtn");
const miniPrevBtn = document.getElementById("miniPrevBtn");

// ------------ STATE ------------
let currentQuery = "";
let currentRating = "all";
let currentContentType = "all";
let nextPageToken = null;
let isLoading = false;
let lastFetchedItems = [];
let currentVideo = null;
let currentVideoIndex = -1;

let popupPlayer = null;
let miniPlayer = null;
let popupReady = false;
let miniReady = false;

// ------------ THEME ------------
function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme);
  themeToggleBtn.textContent = theme === "dark" ? "🌙" : "☀️";
  localStorage.setItem("amfilter-theme", theme);
}
function initTheme() {
  applyTheme(localStorage.getItem("amfilter-theme") === "light" ? "light" : "dark");
}
themeToggleBtn.addEventListener("click", () => {
  applyTheme(document.body.getAttribute("data-theme") === "dark" ? "light" : "dark");
});

// ------------ PLAYLIST HELPERS ------------
function playByIndex(index, mode = "popup") {
  const item = lastFetchedItems[index];
  if (!item) return;

  currentVideoIndex = index;
  currentVideo = {
    id: item.id.videoId,
    title: item.snippet.title,
    channel: item.snippet.channelTitle
  };

  mode === "mini"
    ? openInMiniPlayer(currentVideo)
    : openPlayerModal(currentVideo);
}

// ------------ RENDER VIDEOS ------------
function renderVideos(items, append = false) {
  if (!append) videoListEl.innerHTML = "";

  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "video-card";
    card.innerHTML = `
      <img src="${item.snippet.thumbnails.medium.url}">
      <div class="video-body">
        <a class="video-title">${item.snippet.title}</a>
        <div class="video-meta">
          <span>${item.snippet.channelTitle}</span>
          <span>${new Date(item.snippet.publishedAt).toLocaleDateString()}</span>
        </div>
        <span class="badge">YouTube</span>
      </div>
    `;

    card.addEventListener("click", () => {
      const idx = lastFetchedItems.findIndex(v => v.id.videoId === item.id.videoId);
      playByIndex(idx);
    });

    videoListEl.appendChild(card);
  });
}

// ------------ FETCH VIDEOS ------------
async function fetchVideos({ append = false } = {}) {
  if (!currentQuery) return;

  isLoading = true;
  loaderEl.classList.remove("hidden");

  const params = new URLSearchParams({
    q: currentQuery,
    rating: currentRating,
    contentType: currentContentType
  });

  if (append && nextPageToken) params.append("pageToken", nextPageToken);

  const res = await fetch(`/api/search?${params}`);
  const data = await res.json();

  nextPageToken = data.nextPageToken || null;
  lastFetchedItems = append ? [...lastFetchedItems, ...data.items] : data.items;

  renderVideos(data.items, append);
  loaderEl.classList.add("hidden");
  isLoading = false;
}

// ------------ YT API ------------
window.onYouTubeIframeAPIReady = function () {
  popupPlayer = new YT.Player("popupPlayer", {
    events: { onReady: () => popupReady = true }
  });
  miniPlayer = new YT.Player("miniPlayerFrame", {
    events: { onReady: () => miniReady = true }
  });
};

// ------------ POPUP OPEN ------------
function openPlayerModal(video) {
  if (!popupReady) return;

  playerModal.classList.remove("hidden");
  modalTitleEl.textContent = video.title;
  modalChannelEl.textContent = video.channel;

  popupPlayer.loadVideoById(video.id);

  // 🔥 DOWNLOAD BUTTON (SAFE REDIRECT)
  let btn = document.getElementById("downloadBtn");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "downloadBtn";
    btn.className = "download-btn";
    btn.textContent = "Download Video";
    modalChannelEl.after(btn);
  }

  btn.onclick = () => {
    const ytUrl = `https://www.youtube.com/watch?v=${video.id}`;
    window.open(`https://en.savefrom.net/#url=${encodeURIComponent(ytUrl)}`, "_blank");
  };
}

// ------------ CLOSE POPUP ------------
modalCloseBtn.addEventListener("click", () => {
  popupPlayer.stopVideo();
  playerModal.classList.add("hidden");
});

// ------------ SEARCH EVENTS ------------
keywordInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    currentQuery = keywordInput.value.trim();
    fetchVideos();
  }
});
filterBtn.addEventListener("click", () => {
  currentQuery = keywordInput.value.trim();
  fetchVideos();
});

initTheme();
