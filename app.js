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

// Opening sound (browser-safe)
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
const loaderEl = document.getElementById("loader");
const themeToggleBtn = document.getElementById("themeToggle");

const playerModal = document.getElementById("playerModal");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalTitleEl = document.getElementById("modalTitle");
const modalChannelEl = document.getElementById("modalChannel");
const modalDescriptionEl = document.getElementById("modalDescription");
const modalRecommendationsEl = document.getElementById("modalRecommendations");

const miniPlayerBox = document.getElementById("miniPlayer");
const miniTitleEl = document.getElementById("miniTitle");
const miniPlayPauseBtn = document.getElementById("miniPlayPauseBtn");
const miniExpandBtn = document.getElementById("miniExpandBtn");
const miniCloseBtn = document.getElementById("miniCloseBtn");

// ------------ STATE ------------
let currentQuery = "";
let nextPageToken = null;
let isLoading = false;
let lastFetchedItems = [];
let currentVideoIndex = -1;
let currentVideo = null;

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

// ------------ RENDER VIDEOS ------------
function renderVideos(items, append = false) {
  if (!append) videoListEl.innerHTML = "";

  items.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "video-card";
    card.innerHTML = `
      <img src="${item.snippet.thumbnails.medium.url}">
      <div class="video-body">
        <div class="video-title">${item.snippet.title}</div>
        <div class="video-meta">
          <span>${item.snippet.channelTitle}</span>
          <span>${new Date(item.snippet.publishedAt).toLocaleDateString()}</span>
        </div>
      </div>
    `;

    card.addEventListener("click", () => {
      currentVideoIndex = index;
      openPlayerModal({
        id: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle
      });
    });

    videoListEl.appendChild(card);
  });
}

// ------------ FETCH VIDEOS ------------
async function fetchVideos({ append = false } = {}) {
  if (!currentQuery || isLoading) return;

  isLoading = true;
  loaderEl.classList.remove("hidden");

  const params = new URLSearchParams({ q: currentQuery });
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

  currentVideo = video;
  document.body.classList.add("modal-open");
  playerModal.classList.remove("hidden");

  modalTitleEl.textContent = video.title;
  modalChannelEl.textContent = video.channel;

  popupPlayer.loadVideoById(video.id);

  // -------- ACTION BAR (Prev | Next | Download) --------
  let actions = document.getElementById("playerActions");
  if (!actions) {
    actions = document.createElement("div");
    actions.id = "playerActions";
    actions.className = "player-actions";
    modalChannelEl.after(actions);
  }
  actions.innerHTML = "";

  const prevBtn = document.createElement("button");
  prevBtn.className = "player-nav-btn";
  prevBtn.textContent = "⟨ Prev";
  prevBtn.onclick = () => playRelative(-1);

  const nextBtn = document.createElement("button");
  nextBtn.className = "player-nav-btn";
  nextBtn.textContent = "Next ⟩";
  nextBtn.onclick = () => playRelative(1);

  const downloadBtn = document.createElement("button");
  downloadBtn.className = "download-btn";
  downloadBtn.textContent = "Download Video";
  downloadBtn.onclick = () => {
    const ytUrl = `https://www.youtube.com/watch?v=${video.id}`;
    window.open(
      `https://www.y2mate.com/youtube/${encodeURIComponent(ytUrl)}`,
      "_blank"
    );
  };

  actions.append(prevBtn, nextBtn, downloadBtn);

  renderRecommendations(video.id);
}

// ------------ PLAY NEXT / PREV ------------
function playRelative(step) {
  if (!lastFetchedItems.length) return;
  currentVideoIndex =
    (currentVideoIndex + step + lastFetchedItems.length) %
    lastFetchedItems.length;

  const item = lastFetchedItems[currentVideoIndex];
  openPlayerModal({
    id: item.id.videoId,
    title: item.snippet.title,
    channel: item.snippet.channelTitle
  });
}

// ------------ RECOMMENDATIONS ------------
function renderRecommendations(currentId) {
  modalRecommendationsEl.innerHTML = "";
  lastFetchedItems
    .filter(v => v.id.videoId !== currentId)
    .slice(0, 8)
    .forEach(item => {
      const div = document.createElement("div");
      div.className = "modal-rec-card";
      div.innerHTML = `
        <img class="modal-rec-thumb" src="${item.snippet.thumbnails.default.url}">
        <div>
          <div class="modal-rec-title">${item.snippet.title}</div>
          <div class="modal-rec-channel">${item.snippet.channelTitle}</div>
        </div>
      `;
      div.onclick = () => openPlayerModal({
        id: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle
      });
      modalRecommendationsEl.appendChild(div);
    });
}

// ------------ CLOSE POPUP ------------
modalCloseBtn.addEventListener("click", () => {
  popupPlayer.stopVideo();
  playerModal.classList.add("hidden");
  document.body.classList.remove("modal-open");
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

// Init
initTheme();
