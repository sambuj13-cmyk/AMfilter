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
const filterBtn = document.getElementById("filterBtn");
const videoListEl = document.getElementById("videoList");
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
let lastFetchedItems = [];
let currentVideoIndex = -1;

let popupPlayer = null;
let popupReady = false;

// ------------ THEME ------------
function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme);
  themeToggleBtn.textContent = theme === "dark" ? "🌙" : "☀️";
  localStorage.setItem("amfilter-theme", theme);
}
applyTheme(localStorage.getItem("amfilter-theme") === "light" ? "light" : "dark");

themeToggleBtn.onclick = () => {
  applyTheme(document.body.getAttribute("data-theme") === "dark" ? "light" : "dark");
};

// ------------ FETCH VIDEOS ------------
async function fetchVideos() {
  if (!currentQuery) return;

  loaderEl.classList.remove("hidden");

  const res = await fetch(`/api/search?q=${encodeURIComponent(currentQuery)}`);
  const data = await res.json();

  lastFetchedItems = data.items || [];
  renderVideos(lastFetchedItems);

  loaderEl.classList.add("hidden");
}

// ------------ RENDER VIDEOS ------------
function renderVideos(items) {
  videoListEl.innerHTML = "";

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

// ------------ YT API ------------
window.onYouTubeIframeAPIReady = () => {
  popupPlayer = new YT.Player("popupPlayer", {
    playerVars: { autoplay: 1, rel: 0 },
    events: { onReady: () => popupReady = true }
  });
};

// ------------ OPEN PLAYER ------------
function openPlayer(index) {
  if (!popupReady) return;

  currentVideoIndex = index;
  const item = lastFetchedItems[index];

  document.body.classList.add("modal-open");
  playerModal.classList.remove("hidden");

  modalTitleEl.textContent = item.snippet.title;
  modalChannelEl.textContent = item.snippet.channelTitle;

  popupPlayer.loadVideoById(item.id.videoId);

  // DESCRIPTION
  modalDescriptionEl.textContent = "Loading description...";
  fetch(`/api/videoDetails?id=${item.id.videoId}`)
    .then(r => r.json())
    .then(d => {
      modalDescriptionEl.textContent =
        d.items?.[0]?.snippet?.description || "No description available.";
    })
    .catch(() => {
      modalDescriptionEl.textContent = "Failed to load description.";
    });

  // DOWNLOAD BUTTON (single, clean)
  playerActionsEl.innerHTML = "";
  const downloadBtn = document.createElement("button");
  downloadBtn.className = "download-btn";
  downloadBtn.textContent = "Download Video";
  downloadBtn.onclick = () => {
    const yt = `https://www.youtube.com/watch?v=${item.id.videoId}`;
    window.open(`https://www.y2mate.com/youtube/${encodeURIComponent(yt)}`, "_blank");
  };
  playerActionsEl.appendChild(downloadBtn);

  renderRecommendations(item.id.videoId);
  updateNav();
}

// ------------ NEXT / PREV ------------
nextVideoBtn.onclick = () => {
  if (currentVideoIndex < lastFetchedItems.length - 1)
    openPlayer(currentVideoIndex + 1);
};
prevVideoBtn.onclick = () => {
  if (currentVideoIndex > 0)
    openPlayer(currentVideoIndex - 1);
};

function updateNav() {
  prevVideoBtn.disabled = currentVideoIndex <= 0;
  nextVideoBtn.disabled = currentVideoIndex >= lastFetchedItems.length - 1;
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
      div.onclick = () => openPlayer(
        lastFetchedItems.findIndex(v => v.id.videoId === item.id.videoId)
      );
      modalRecommendationsEl.appendChild(div);
    });
}

// ------------ CLOSE POPUP ------------
modalCloseBtn.onclick = () => {
  popupPlayer.stopVideo();
  playerModal.classList.add("hidden");
  document.body.classList.remove("modal-open");
};

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
