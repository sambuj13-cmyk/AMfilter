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
const playerActionsEl = document.getElementById("playerActions");

const nextVideoBtn = document.getElementById("nextVideoBtn");
const prevVideoBtn = document.getElementById("prevVideoBtn");

// ------------ STATE ------------
let currentQuery = "";
let nextPageToken = null;
let isLoading = false;
let lastFetchedItems = [];
let currentVideoIndex = -1;
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

// ------------ FETCH VIDEOS ------------
async function fetchVideos({ append = false } = {}) {
  if (!currentQuery || isLoading) return;

  isLoading = true;
  loaderEl.classList.remove("hidden");

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(currentQuery)}`);
    const data = await res.json();

    nextPageToken = data.nextPageToken || null;
    lastFetchedItems = append ? [...lastFetchedItems, ...data.items] : data.items;

    renderVideos(data.items, append);
    resultInfoEl.textContent = `Showing ${lastFetchedItems.length} videos`;
  } catch (e) {
    errorInfoEl.textContent = "Failed to fetch videos.";
  }

  loaderEl.classList.add("hidden");
  isLoading = false;
}

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

    card.onclick = () => openPlayer(index);
    videoListEl.appendChild(card);
  });
}

// ------------ YT API READY ------------
window.onYouTubeIframeAPIReady = () => {
  popupPlayer = new YT.Player("popupPlayer", {
    playerVars: { autoplay: 1, rel: 0 },
    events: {
      onReady: () => popupReady = true
    }
  });
};

// ------------ OPEN PLAYER ------------
function openPlayer(index) {
  if (!popupReady) return;

  currentVideoIndex = index;
  const item = lastFetchedItems[index];
  currentVideo = item;

  document.body.classList.add("modal-open");
  playerModal.classList.remove("hidden");

  modalTitleEl.textContent = item.snippet.title;
  modalChannelEl.textContent = item.snippet.channelTitle;

  popupPlayer.loadVideoById(item.id.videoId);

  // Description
  modalDescriptionEl.textContent = "Loading description...";
  fetch(`/api/videoDetails?id=${item.id.videoId}`)
    .then(r => r.json())
    .then(d => {
      modalDescriptionEl.textContent =
        d.items?.[0]?.snippet?.description || "No description available.";
    })
    .catch(() => modalDescriptionEl.textContent = "Failed to load description.");

  // Download Button
  playerActionsEl.innerHTML = "";
  const btn = document.createElement("button");
  btn.className = "download-btn";
  btn.textContent = "Download Video";
  btn.onclick = () => {
    const yt = `https://www.youtube.com/watch?v=${item.id.videoId}`;
    window.open(`https://www.y2mate.com/youtube/${encodeURIComponent(yt)}`, "_blank");
  };
  playerActionsEl.appendChild(btn);

  updateNavHighlight();
  renderRecommendations();
}

// ------------ CLOSE PLAYER ------------
modalCloseBtn.onclick = () => {
  popupPlayer.stopVideo();
  playerModal.classList.add("hidden");
  document.body.classList.remove("modal-open");
};

// ------------ NEXT / PREV ------------
nextVideoBtn.onclick = () => {
  if (currentVideoIndex < lastFetchedItems.length - 1)
    openPlayer(currentVideoIndex + 1);
};

prevVideoBtn.onclick = () => {
  if (currentVideoIndex > 0)
    openPlayer(currentVideoIndex - 1);
};

function updateNavHighlight() {
  prevVideoBtn.disabled = currentVideoIndex <= 0;
  nextVideoBtn.disabled = currentVideoIndex >= lastFetchedItems.length - 1;
}

// ------------ RECOMMENDATIONS ------------
function renderRecommendations() {
  modalRecommendationsEl.innerHTML = "";

  lastFetchedItems.slice(currentVideoIndex + 1, currentVideoIndex + 7)
    .forEach((item, i) => {
      const div = document.createElement("div");
      div.className = "modal-rec-card";
      div.innerHTML = `
        <img class="modal-rec-thumb" src="${item.snippet.thumbnails.default.url}">
        <div>
          <div class="modal-rec-title">${item.snippet.title}</div>
          <div class="modal-rec-channel">${item.snippet.channelTitle}</div>
        </div>
      `;
      div.onclick = () => openPlayer(currentVideoIndex + i + 1);
      modalRecommendationsEl.appendChild(div);
    });
}

// ------------ SEARCH ------------
keywordInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    currentQuery = keywordInput.value.trim();
    fetchVideos();
  }
});

filterBtn.onclick = () => {
  currentQuery = keywordInput.value.trim();
  fetchVideos();
};
