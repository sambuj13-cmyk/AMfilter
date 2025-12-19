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

let currentQuery = "";
let currentRating = "all";
let currentContentType = "all";
let nextPageToken = null;
let isLoading = false;
let lastFetchedItems = [];
let currentVideo = null;

let popupPlayer = null;
let popupReady = false;

// ------------ THEME ------------
function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme);
  themeToggleBtn.textContent = theme === "dark" ? "🌙" : "☀️";
  localStorage.setItem("amfilter-theme", theme);
}
applyTheme(localStorage.getItem("amfilter-theme") === "light" ? "light" : "dark");

themeToggleBtn.addEventListener("click", () => {
  applyTheme(document.body.getAttribute("data-theme") === "dark" ? "light" : "dark");
});

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
      </div>
    `;

    card.onclick = () => openPlayerModal({
      id: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle
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
    contentType: currentContentType
  });

  if (append && nextPageToken) params.append("pageToken", nextPageToken);

  const res = await fetch(`/api/search?${params}`);
  const data = await res.json();

  nextPageToken = data.nextPageToken || null;
  if (!append) lastFetchedItems = [];
  lastFetchedItems.push(...data.items);

  renderVideos(data.items, append);
  loaderEl.classList.add("hidden");
  isLoading = false;
}

// ------------ YOUTUBE API ------------
window.onYouTubeIframeAPIReady = function () {
  popupPlayer = new YT.Player("popupPlayer", {
    playerVars: { autoplay: 0, controls: 1 },
    events: { onReady: () => popupReady = true }
  });
};

// ------------ POPUP OPEN / CLOSE ------------
function openPlayerModal(video) {
  currentVideo = video;
  playerModal.classList.remove("hidden");
  document.body.classList.add("modal-open");

  modalTitleEl.textContent = video.title;
  modalChannelEl.textContent = video.channel;

  if (popupReady) popupPlayer.loadVideoById(video.id);

  modalDescriptionEl.textContent = "Loading...";
  fetch(`/api/videoDetails?id=${video.id}`)
    .then(r => r.json())
    .then(d => modalDescriptionEl.textContent =
      d.items?.[0]?.snippet?.description ?? "No description available.");
}

modalCloseBtn.onclick = () => {
  popupPlayer.stopVideo();
  playerModal.classList.add("hidden");
  document.body.classList.remove("modal-open");
};

// ------------ DESCRIPTION TOGGLE ------------
descriptionToggleBtn.onclick = () => {
  modalDescriptionEl.classList.toggle("expanded");
};

// ------------ SEARCH ------------
filterBtn.onclick = () => {
  currentQuery = keywordInput.value.trim();
  currentRating = ratingSelect.value;
  currentContentType = contentTypeSelect.value;
  nextPageToken = null;
  fetchVideos();
};

keywordInput.addEventListener("keydown", e => {
  if (e.key === "Enter") filterBtn.click();
});

// ------------ INFINITE SCROLL ------------
window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 400) {
    if (nextPageToken && !isLoading) fetchVideos({ append: true });
  }
});
