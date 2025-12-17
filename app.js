// ================= INTRO + SOUND =================
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

const openSound = document.getElementById("openSound");
let soundPlayed = false;

document.addEventListener("click", () => {
  if (!soundPlayed && openSound) {
    openSound.play().catch(() => {});
    popupPlayer?.unMute();
    miniPlayer?.unMute();
    soundPlayed = true;
  }
}, { once: true });


// ================= API BASE =================
const API_BASE =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "https://amfilter.vercel.app"
    : "";


// ================= DOM =================
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

const miniPlayerBox = document.getElementById("miniPlayer");
const miniTitleEl = document.getElementById("miniTitle");
const miniPlayPauseBtn = document.getElementById("miniPlayPauseBtn");
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
let currentVideoIndex = -1;

// ================= YT PLAYERS =================
let popupPlayer = null;
let miniPlayer = null;
let popupReady = false;
let miniReady = false;

function onPopupPlayerStateChange(e) {
  if (e.data === YT.PlayerState.ENDED) playNext("popup");
}
function onMiniPlayerStateChange(e) {
  if (e.data === YT.PlayerState.ENDED) playNext("mini");
}

window.onYouTubeIframeAPIReady = () => {
  popupPlayer = new YT.Player("popupPlayer", {
    videoId: "",
    playerVars: { autoplay: 0, mute: 1, controls: 1, rel: 0 },
    events: {
      onReady: () => popupReady = true,
      onStateChange: onPopupPlayerStateChange
    }
  });

  miniPlayer = new YT.Player("miniPlayerFrame", {
    videoId: "",
    playerVars: { autoplay: 0, mute: 1, controls: 1, rel: 0 },
    events: {
      onReady: () => miniReady = true,
      onStateChange: onMiniPlayerStateChange
    }
  });
};


// ================= PLAY HELPERS =================
function playByIndex(index, mode = "popup") {
  const item = lastFetchedItems[index];
  if (!item) return;

  currentVideoIndex = index;
  const video = {
    id: item.id.videoId,
    title: item.snippet.title,
    channel: item.snippet.channelTitle
  };

  mode === "mini" ? openInMiniPlayer(video) : openPlayerModal(video);
}

function playNext(mode) {
  if (!lastFetchedItems.length) return;
  playByIndex((currentVideoIndex + 1) % lastFetchedItems.length, mode);
}
function playPrev(mode) {
  if (!lastFetchedItems.length) return;
  playByIndex(
    (currentVideoIndex - 1 + lastFetchedItems.length) % lastFetchedItems.length,
    mode
  );
}


// ================= OPEN PLAYERS =================
function openPlayerModal(video) {
  if (!popupReady) return;

  miniPlayer?.stopVideo();
  miniPlayerBox.classList.add("hidden");
  playerModal.classList.remove("hidden");

  modalTitleEl.textContent = video.title;
  modalChannelEl.textContent = video.channel;

  setTimeout(() => {
    popupPlayer.loadVideoById(video.id);
    popupPlayer.playVideo();
  }, 150);

  modalDescriptionEl.textContent = "Loading...";
  fetch(`${API_BASE}/api/videoDetails?id=${video.id}`)
    .then(r => r.json())
    .then(d => {
      modalDescriptionEl.textContent =
        d.items?.[0]?.snippet?.description || "No description available.";
    })
    .catch(() => modalDescriptionEl.textContent = "Failed to load description.");
}

function openInMiniPlayer(video) {
  if (!miniReady) return;

  popupPlayer?.stopVideo();
  miniTitleEl.textContent = video.title;

  playerModal.classList.add("hidden");
  miniPlayerBox.classList.remove("hidden");

  setTimeout(() => {
    miniPlayer.loadVideoById(video.id);
    miniPlayer.playVideo();
  }, 100);

  miniPlayPauseBtn.textContent = "⏸";
}


// ================= FETCH =================
async function fetchVideos() {
  if (!currentQuery || isLoading) return;

  isLoading = true;
  loaderEl.classList.remove("hidden");
  errorInfoEl.textContent = "";

  try {
    const res = await fetch(
      `${API_BASE}/api/search?q=${currentQuery}&rating=${currentRating}&contentType=${currentContentType}`
    );
    const data = await res.json();

    lastFetchedItems = data.items || [];
    currentVideoIndex = -1;

    videoListEl.innerHTML = "";
    lastFetchedItems.forEach((item, i) => {
      const card = document.createElement("div");
      card.className = "video-card";
      card.innerHTML = `
        <img src="${item.snippet.thumbnails.medium.url}">
        <div class="video-body">
          <a class="video-title">${item.snippet.title}</a>
          <div class="video-meta">${item.snippet.channelTitle}</div>
        </div>`;
      card.onclick = () => playByIndex(i);
      videoListEl.appendChild(card);
    });

    resultInfoEl.textContent = `Showing ${lastFetchedItems.length} videos`;
  } catch {
    errorInfoEl.textContent = "Server error.";
  } finally {
    loaderEl.classList.add("hidden");
    isLoading = false;
  }
}


// ================= EVENTS =================
filterBtn.onclick = () => {
  currentQuery = keywordInput.value.trim();
  fetchVideos();
};

keywordInput.addEventListener("keydown", e => {
  if (e.key === "Enter") filterBtn.click();
});

modalCloseBtn.onclick = () => {
  popupPlayer?.stopVideo();
  playerModal.classList.add("hidden");
};

miniCloseBtn.onclick = () => {
  miniPlayer?.stopVideo();
  miniPlayerBox.classList.add("hidden");
};

miniPlayPauseBtn.onclick = () => {
  miniPlayer.getPlayerState() === YT.PlayerState.PLAYING
    ? (miniPlayer.pauseVideo(), miniPlayPauseBtn.textContent = "▶")
    : (miniPlayer.playVideo(), miniPlayPauseBtn.textContent = "⏸");
};

miniNextBtn.onclick = () => playNext("mini");
miniPrevBtn.onclick = () => playPrev("mini");
descriptionToggleBtn.onclick = () =>
  modalDescriptionEl.classList.toggle("expanded");
