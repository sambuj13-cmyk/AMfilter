// ================= INTRO + OPENING SOUND =================
window.addEventListener("load", () => {
  const intro = document.getElementById("intro");
  if (!intro) return;

  setTimeout(() => {
    intro.style.transition = "opacity 0.9s ease, transform 0.9s ease";
    intro.style.opacity = "0";
    intro.style.transform = "scale(1.05)";

 setTimeout(() => {
  intro.style.display = "none";
  intro.remove();
}, 900);

// Browser-safe opening sound
const openSound = document.getElementById("openSound");
let soundPlayed = false;

document.addEventListener(
  "click",
  () => {
    if (!soundPlayed && openSound) {
      openSound.play().catch(() => {});
      soundPlayed = true;
    }
  },
  { once: true }
);

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

// Popup elements
const playerModal = document.getElementById("playerModal");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalTitleEl = document.getElementById("modalTitle");
const modalChannelEl = document.getElementById("modalChannel");
const modalDescriptionEl = document.getElementById("modalDescription");
const descriptionToggleBtn = document.getElementById("descriptionToggle");
const modalRecommendationsEl = document.getElementById("modalRecommendations");

// Popup controls
const nextVideoBtn = document.getElementById("nextVideoBtn");
const prevVideoBtn = document.getElementById("prevVideoBtn");
const downloadBtn = document.getElementById("downloadBtn"); // ✅ NEW

// Mini player
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

// YT players
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
function syncIndexFromCurrentVideo() {
  if (!currentVideo) return;
  const idx = lastFetchedItems.findIndex(v => v.id.videoId === currentVideo.id);
  if (idx !== -1) currentVideoIndex = idx;
}

function playByIndex(index, mode = "popup") {
  const item = lastFetchedItems[index];
  if (!item) return;

  currentVideoIndex = index;
  currentVideo = {
    id: item.id.videoId,
    title: item.snippet.title,
    channel: item.snippet.channelTitle
  };

  mode === "mini" ? openInMiniPlayer(currentVideo) : openPlayerModal(currentVideo);
}

function playNext(mode = "popup") {
  if (!lastFetchedItems.length) return;
  if (currentVideoIndex === -1) syncIndexFromCurrentVideo();
  playByIndex((currentVideoIndex + 1) % lastFetchedItems.length, mode);
}

function playPrev(mode = "popup") {
  if (!lastFetchedItems.length) return;
  if (currentVideoIndex === -1) syncIndexFromCurrentVideo();
  playByIndex(
    (currentVideoIndex - 1 + lastFetchedItems.length) % lastFetchedItems.length,
    mode
  );
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
      playByIndex(idx, miniPlayerBox.classList.contains("hidden") ? "popup" : "mini");
    });

    videoListEl.appendChild(card);
  });
}

// ------------ FETCH VIDEOS ------------
async function fetchVideos({ append = false } = {}) {
  if (!currentQuery || isLoading) return;

  isLoading = true;
  loaderEl.classList.remove("hidden");

  const params = new URLSearchParams({
    q: currentQuery,
    rating: currentRating,
    contentType: currentContentType,
    ...(append && nextPageToken && { pageToken: nextPageToken })
  });

  try {
    const res = await fetch(`/api/search?${params}`);
    const data = await res.json();

    nextPageToken = data.nextPageToken || null;
    append ? lastFetchedItems.push(...data.items) : (lastFetchedItems = data.items);

    renderVideos(data.items, append);
    resultInfoEl.textContent = `Showing ${videoListEl.children.length} videos`;
  } catch {
    errorInfoEl.textContent = "Failed to fetch videos.";
  } finally {
    loaderEl.classList.add("hidden");
    isLoading = false;
  }
}

// ------------ YOUTUBE API ------------
window.onYouTubeIframeAPIReady = () => {
  popupPlayer = new YT.Player("popupPlayer", {
    events: { onReady: () => (popupReady = true) }
  });

  miniPlayer = new YT.Player("miniPlayerFrame", {
    events: { onReady: () => (miniReady = true) }
  });
};

// ------------ PLAYERS ------------
function openInMiniPlayer(video) {
  if (!miniReady) return;
  popupPlayer?.stopVideo();
  miniPlayerBox.classList.remove("hidden");
  playerModal.classList.add("hidden");
  miniTitleEl.textContent = video.title;
  miniPlayer.loadVideoById(video.id);
}

function openPlayerModal(video) {
  if (!popupReady) return;
  miniPlayer?.stopVideo();
  miniPlayerBox.classList.add("hidden");
  playerModal.classList.remove("hidden");
  modalTitleEl.textContent = video.title;
  modalChannelEl.textContent = video.channel;
  popupPlayer.loadVideoById(video.id);
}

// ------------ DOWNLOAD (SAFE, EXTERNAL, GUARANTEED) ------------
if (downloadBtn) {
  downloadBtn.addEventListener("click", () => {
    let videoId = null;

    // Primary source
    if (currentVideo && currentVideo.id) {
      videoId = currentVideo.id;
    }

    // Fallback (from popup player iframe)
    if (!videoId && popupPlayer && popupReady) {
      try {
        videoId = popupPlayer.getVideoData().video_id;
      } catch (e) {}
    }

    if (!videoId) {
      alert("Video not ready yet. Please try again.");
      return;
    }

    const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Redirect to external downloader
    window.open(
      "https://y2mate.nu/en/search?query=" + encodeURIComponent(ytUrl),
      "_blank"
    );
  });
}

// ------------ EVENTS ------------
filterBtn.onclick = () => {
  currentQuery = keywordInput.value.trim();
  fetchVideos();
};

keywordInput.onkeydown = e => e.key === "Enter" && filterBtn.click();
modalCloseBtn.onclick = () => playerModal.classList.add("hidden");
miniCloseBtn.onclick = () => miniPlayerBox.classList.add("hidden");
nextVideoBtn.onclick = () => playNext("popup");
prevVideoBtn.onclick = () => playPrev("popup");
miniNextBtn.onclick = () => playNext("mini");
miniPrevBtn.onclick = () => playPrev("mini");

// Init
initTheme();
