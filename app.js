// ================= INTRO + SOUND (3D INTRO EXIT) =================
window.addEventListener("load", () => {
  const intro = document.getElementById("intro");
  if (!intro) return;

  setTimeout(() => {
    intro.style.opacity = "0";
    intro.style.transform = "scale(1.05)";
    setTimeout(() => intro.remove(), 900);
  }, 2200);
});

// Opening sound (browser-safe)
const openSound = document.getElementById("openSound");
function playStartupSound() {
  if (!openSound) return;
  openSound.volume = 0.25;
  openSound.play().catch(() => {});
  window.removeEventListener("pointerdown", playStartupSound);
}
window.addEventListener("pointerdown", playStartupSound);


// ================= API BASE =================
const API_BASE =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "https://amfilter.vercel.app"
    : "";


// ================= DOM ELEMENTS =================
const keywordInput = document.getElementById("keyword");
const ratingSelect = document.getElementById("rating");
const contentTypeSelect = document.getElementById("contentType");
const filterBtn = document.getElementById("filterBtn");
const videoListEl = document.getElementById("videoList");
const resultInfoEl = document.getElementById("resultInfo");
const errorInfoEl = document.getElementById("errorInfo");
const loaderEl = document.getElementById("loader");
const themeToggleBtn = document.getElementById("themeToggle");

// Popup
const playerModal = document.getElementById("playerModal");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalTitleEl = document.getElementById("modalTitle");
const modalChannelEl = document.getElementById("modalChannel");
const modalDescriptionEl = document.getElementById("modalDescription");
const descriptionToggleBtn = document.getElementById("descriptionToggle");
const modalRecommendationsEl = document.getElementById("modalRecommendations");

// Navigation
const nextVideoBtn = document.getElementById("nextVideoBtn");
const prevVideoBtn = document.getElementById("prevVideoBtn");

// Mini player
const miniPlayerBox = document.getElementById("miniPlayer");
const miniTitleEl = document.getElementById("miniTitle");
const miniPlayPauseBtn = document.getElementById("miniPlayPauseBtn");
const miniExpandBtn = document.getElementById("miniExpandBtn");
const miniCloseBtn = document.getElementById("miniCloseBtn");
const miniNextBtn = document.getElementById("miniNextBtn");
const miniPrevBtn = document.getElementById("miniPrevBtn");


// ================= STATE =================
let currentQuery = "";
let currentRating = "all";
let currentContentType = "all";
let nextPageToken = null;
let isLoading = false;
let lastFetchedItems = [];
let currentVideo = null;
let currentVideoIndex = -1;

// YT Players
let popupPlayer = null;
let miniPlayer = null;
let popupReady = false;
let miniReady = false;


// ================= THEME =================
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


// ================= PLAYLIST HELPERS =================
function playByIndex(index, mode = "popup") {
  const item = lastFetchedItems[index];
  if (!item) return;

  currentVideoIndex = index;
  const video = {
    id: item.id.videoId,
    title: item.snippet.title,
    channel: item.snippet.channelTitle
  };
  currentVideo = video;

  mode === "mini" ? openInMiniPlayer(video) : openPlayerModal(video);
}

function playNext(mode = "popup") {
  if (!lastFetchedItems.length) return;
  playByIndex((currentVideoIndex + 1) % lastFetchedItems.length, mode);
}

function playPrev(mode = "popup") {
  if (!lastFetchedItems.length) return;
  playByIndex(
    (currentVideoIndex - 1 + lastFetchedItems.length) % lastFetchedItems.length,
    mode
  );
}


// ================= RENDER VIDEOS =================
function renderVideos(items, append = false) {
  if (!append) videoListEl.innerHTML = "";

  items.forEach(item => {
    const id = item.id.videoId;
    const s = item.snippet;

    const card = document.createElement("div");
    card.className = "video-card";
    card.innerHTML = `
      <img src="${s.thumbnails.medium.url}">
      <div class="video-body">
        <div class="video-title">${s.title}</div>
        <div class="video-meta">
          <span>${s.channelTitle}</span>
          <span>${new Date(s.publishedAt).toLocaleDateString()}</span>
        </div>
        <span class="badge">
          ${currentContentType === "shorts" ? "Short" :
            currentContentType === "videos" ? "Video" : "YouTube"}
        </span>
      </div>
    `;

    card.addEventListener("click", () => {
      const idx = lastFetchedItems.findIndex(v => v.id.videoId === id);
      if (idx !== -1) {
        const mode = miniPlayerBox.classList.contains("hidden") ? "popup" : "mini";
        playByIndex(idx, mode);
      }
    });

    videoListEl.appendChild(card);
  });
}


// ================= FETCH VIDEOS =================
async function fetchVideos({ append = false } = {}) {
  if (!currentQuery || isLoading) return;

  isLoading = true;
  loaderEl.classList.remove("hidden");
  errorInfoEl.textContent = "";

  const params = new URLSearchParams({
    q: currentQuery,
    rating: currentRating,
    contentType: currentContentType
  });

  if (append && nextPageToken) params.append("pageToken", nextPageToken);

  try {
    const res = await fetch(`${API_BASE}/api/search?${params}`);
    const data = await res.json();

    if (!res.ok) {
      errorInfoEl.textContent = data.error || "Error fetching videos.";
      return;
    }

    nextPageToken = data.nextPageToken || null;

    if (!append) {
      lastFetchedItems = [...data.items];
      currentVideoIndex = -1;
    } else {
      lastFetchedItems.push(...data.items);
    }

    renderVideos(data.items, append);
    resultInfoEl.textContent = `Showing ${videoListEl.children.length} videos`;
  } catch {
    errorInfoEl.textContent = "Server error.";
  } finally {
    loaderEl.classList.add("hidden");
    isLoading = false;
  }
}


// ================= YOUTUBE PLAYER =================
window.onYouTubeIframeAPIReady = () => {
  popupPlayer = new YT.Player("popupPlayer", {
    events: { onReady: () => popupReady = true }
  });
  miniPlayer = new YT.Player("miniPlayerFrame", {
    events: { onReady: () => miniReady = true }
  });
};


// ================= EVENTS =================
filterBtn.addEventListener("click", () => {
  currentQuery = keywordInput.value.trim();
  currentRating = ratingSelect.value;
  currentContentType = contentTypeSelect.value;
  nextPageToken = null;
  fetchVideos();
});

keywordInput.addEventListener("keydown", e => {
  if (e.key === "Enter") filterBtn.click();
});

window.addEventListener("scroll", () => {
  if (window.innerHeight + scrollY >= document.body.offsetHeight - 400) {
    if (nextPageToken && !isLoading) fetchVideos({ append: true });
  }
});

initTheme();
