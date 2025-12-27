// ================= INTRO + OPENING SOUND =================
window.addEventListener("load", () => {
  const intro = document.getElementById("intro");
  if (!intro) return;

  setTimeout(() => {
    intro.style.transition = "opacity 0.9s ease, transform 0.9s ease";
    intro.style.opacity = "0";
    intro.style.transform = "scale(1.05)";
    setTimeout(() => intro.remove(), 900);
  }, 2200);
});

// Browser-safe opening sound
const openSound = document.getElementById("openSound");
let soundPlayed = false;
document.addEventListener("click", () => {
  if (!soundPlayed && openSound) {
    openSound.play().catch(() => {});
    soundPlayed = true;
  }
}, { once: true });

/* ================= DOM ================= */
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

/* ================= STATE ================= */
let currentQuery = "";
let currentRating = "all";
let currentContentType = "all";
let nextPageToken = null;
let isLoading = false;

let lastFetchedItems = [];
let currentVideoIndex = -1;
let currentVideo = null;

// 🔥 QUEUE
let playQueue = [];
let queueIndex = -1;

/* ================= PLAYERS ================= */
let popupPlayer = null;
let miniPlayer = null;
let popupReady = false;
let miniReady = false;

/* ================= THEME ================= */
function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme);
  themeToggleBtn.textContent = theme === "dark" ? "🌙" : "☀️";
  localStorage.setItem("amfilter-theme", theme);
}
function initTheme() {
  applyTheme(localStorage.getItem("amfilter-theme") === "light" ? "light" : "dark");
}
themeToggleBtn.onclick = () =>
  applyTheme(document.body.getAttribute("data-theme") === "dark" ? "light" : "dark");

/* ================= QUEUE LOGIC ================= */
function enqueue(video) {
  playQueue.push(video);
}

function playFromQueue(index, mode = "popup") {
  const video = playQueue[index];
  if (!video) return;
  queueIndex = index;
  currentVideo = video;
  mode === "mini" ? openInMiniPlayer(video) : openPlayerModal(video);
}

function autoNext(mode) {
  if (playQueue.length && queueIndex + 1 < playQueue.length) {
    playFromQueue(queueIndex + 1, mode);
  } else {
    playNextFromSearch(mode);
  }
}

/* ================= SEARCH PLAYLIST ================= */
function playNextFromSearch(mode) {
  if (!lastFetchedItems.length) return;
  currentVideoIndex = (currentVideoIndex + 1) % lastFetchedItems.length;
  const item = lastFetchedItems[currentVideoIndex];
  const video = {
    id: item.id.videoId,
    title: item.snippet.title,
    channel: item.snippet.channelTitle
  };
  currentVideo = video;
  mode === "mini" ? openInMiniPlayer(video) : openPlayerModal(video);
}

function playPrevFromSearch(mode) {
  if (!lastFetchedItems.length) return;
  currentVideoIndex =
    (currentVideoIndex - 1 + lastFetchedItems.length) % lastFetchedItems.length;
  const item = lastFetchedItems[currentVideoIndex];
  const video = {
    id: item.id.videoId,
    title: item.snippet.title,
    channel: item.snippet.channelTitle
  };
  currentVideo = video;
  mode === "mini" ? openInMiniPlayer(video) : openPlayerModal(video);
}

/* ================= RENDER ================= */
function renderVideos(items) {
  videoListEl.innerHTML = "";
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
      </div>
    `;
    card.onclick = () => {
      const video = {
        id: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle
      };
      enqueue(video);
      playFromQueue(playQueue.length - 1,
        miniPlayerBox.classList.contains("hidden") ? "popup" : "mini");
    };
    videoListEl.appendChild(card);
  });
}

/* ================= FETCH ================= */
async function fetchVideos() {
  if (!currentQuery || isLoading) return;
  isLoading = true;
  loaderEl.classList.remove("hidden");

  const res = await fetch(`/api/search?q=${currentQuery}&rating=${currentRating}&contentType=${currentContentType}`);
  const data = await res.json();

  lastFetchedItems = data.items || [];
  currentVideoIndex = -1;

  renderVideos(lastFetchedItems);
  resultInfoEl.textContent = `Showing ${lastFetchedItems.length} videos`;

  loaderEl.classList.add("hidden");
  isLoading = false;
}

/* ================= YT API ================= */
window.onYouTubeIframeAPIReady = () => {
  popupPlayer = new YT.Player("popupPlayer", {
    events: {
      onReady: () => popupReady = true,
      onStateChange: e => e.data === 0 && autoNext("popup")
    }
  });
  miniPlayer = new YT.Player("miniPlayerFrame", {
    events: {
      onReady: () => miniReady = true,
      onStateChange: e => e.data === 0 && autoNext("mini")
    }
  });
};

/* ================= PLAYER OPEN ================= */
function openPlayerModal(video) {
  if (!popupReady) return;
  miniPlayer?.stopVideo();
  miniPlayerBox.classList.add("hidden");
  playerModal.classList.remove("hidden");
  modalTitleEl.textContent = video.title;
  modalChannelEl.textContent = video.channel;
  popupPlayer.loadVideoById(video.id);
}

function openInMiniPlayer(video) {
  if (!miniReady) return;
  popupPlayer?.stopVideo();
  playerModal.classList.add("hidden");
  miniPlayerBox.classList.remove("hidden");
  miniTitleEl.textContent = video.title;
  miniPlayer.loadVideoById(video.id);
}

/* ================= EVENTS ================= */
filterBtn.onclick = () => {
  currentQuery = keywordInput.value.trim();
  fetchVideos();
};
keywordInput.onkeydown = e => e.key === "Enter" && filterBtn.click();

nextVideoBtn.onclick = () => autoNext("popup");
prevVideoBtn.onclick = () => playPrevFromSearch("popup");
miniNextBtn.onclick = () => autoNext("mini");
miniPrevBtn.onclick = () => playPrevFromSearch("mini");

modalCloseBtn.onclick = () => playerModal.classList.add("hidden");
miniCloseBtn.onclick = () => miniPlayerBox.classList.add("hidden");

descriptionToggleBtn.onclick = () =>
  modalDescriptionEl.classList.toggle("expanded");

initTheme();
