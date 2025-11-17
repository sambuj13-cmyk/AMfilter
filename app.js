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

// Mini player
const miniPlayerBox = document.getElementById("miniPlayer");
const miniTitleEl = document.getElementById("miniTitle");
const miniPlayPauseBtn = document.getElementById("miniPlayPauseBtn");
const miniExpandBtn = document.getElementById("miniExpandBtn");
const miniCloseBtn = document.getElementById("miniCloseBtn");

// ------------ STATE ------------
let currentQuery = "";
let currentRating = "all";
let currentContentType = "all";
let nextPageToken = null;
let isLoading = false;
let lastFetchedItems = [];
let currentVideo = null;

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

// ------------ RENDER VIDEOS ------------
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
        <a class="video-title">${s.title}</a>
        <div class="video-meta">
            <span>${s.channelTitle}</span>
            <span>${new Date(s.publishedAt).toLocaleDateString()}</span>
        </div>
        <span class="badge">${
          currentContentType === "shorts" ? "Short" :
          currentContentType === "videos" ? "Video" : "YouTube"
        }</span>
      </div>
    `;

    const videoData = { id, title: s.title, channel: s.channelTitle };

    card.addEventListener("click", () => {
      if (!miniPlayerBox.classList.contains("hidden")) {
        openInMiniPlayer(videoData);
      } else {
        openPlayerModal(videoData, { fromMini: false });
      }
    });

    videoListEl.appendChild(card);
  });
}

// ------------ FETCH VIDEOS (via backend) ------------
async function fetchVideos({ append = false } = {}) {
  if (!currentQuery) {
    errorInfoEl.textContent = "Please enter a keyword.";
    return;
  }
  if (isLoading) return;

  isLoading = true;
  loaderEl.classList.remove("hidden");
  errorInfoEl.textContent = "";

  const params = new URLSearchParams({
    q: currentQuery,
    rating: currentRating,
    contentType: currentContentType,
  });

  if (append && nextPageToken) {
    params.append("pageToken", nextPageToken);
  }

  try {
    const res = await fetch(`/api/search?${params.toString()}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to fetch videos");
    }

    nextPageToken = data.nextPageToken || null;

    if (!append) {
      lastFetchedItems = [...data.items];
    } else {
      lastFetchedItems.push(...data.items);
    }

    renderVideos(data.items, append);
    resultInfoEl.textContent = `Showing ${videoListEl.children.length} videos`;
  } catch (err) {
    console.error(err);
    errorInfoEl.textContent = "Error fetching videos. Please try again.";
  } finally {
    loaderEl.classList.add("hidden");
    isLoading = false;
  }
}

// ------------ YT API READY ------------
window.onYouTubeIframeAPIReady = function () {
  popupPlayer = new YT.Player("popupPlayer", {
    playerVars: { autoplay: 0, controls: 1, rel: 0, modestbranding: 1 },
    events: { onReady: () => (popupReady = true) }
  });

  miniPlayer = new YT.Player("miniPlayerFrame", {
    playerVars: { autoplay: 0, controls: 1, rel: 0, modestbranding: 1 },
    events: { onReady: () => (miniReady = true) }
  });
};

// ------------ MINI PLAYER OPEN ------------
function openInMiniPlayer(video) {
  if (!miniReady) return;

  popupPlayer.stopVideo();

  currentVideo = video;
  miniTitleEl.textContent = video.title;
  miniPlayerBox.classList.remove("hidden");
  playerModal.classList.add("hidden");

  miniPlayer.loadVideoById({ videoId: video.id, startSeconds: 0 });
  miniPlayer.playVideo();
  miniPlayPauseBtn.textContent = "⏸";
}

// ------------ POPUP OPEN ------------
function openPlayerModal(video, { fromMini = false, resumeTime = 0, wasPlaying = true } = {}) {
  if (!popupReady) return;

  miniPlayer.stopVideo();

  const isNew = !currentVideo || currentVideo.id !== video.id;
  currentVideo = video;

  miniPlayerBox.classList.add("hidden");
  playerModal.classList.remove("hidden");

  modalTitleEl.textContent = video.title;
  modalChannelEl.textContent = video.channel;

  const startTime = (fromMini && !isNew) ? resumeTime : 0;

  popupPlayer.loadVideoById({
    videoId: video.id,
    startSeconds: startTime
  });

  if (fromMini && !wasPlaying) popupPlayer.pauseVideo();

  // Load description via backend
  modalDescriptionEl.textContent = "Loading...";
  fetch(`/api/videoDetails?id=${encodeURIComponent(video.id)}`)
    .then(r => r.json())
    .then(d => {
      if (d.error) {
        modalDescriptionEl.textContent = "Failed to load description.";
        return;
      }
      modalDescriptionEl.textContent =
        d.items?.[0]?.snippet?.description ?? "No description available.";
    })
    .catch(() => {
      modalDescriptionEl.textContent = "Failed to load description.";
    });

  renderModalRecommendations(video.id);
}

// ------------ POPUP CLOSE ------------
function closePlayerModal() {
  if (!currentVideo) return;

  const t = popupPlayer.getCurrentTime() || 0;
  const isPlaying = popupPlayer.getPlayerState() === YT.PlayerState.PLAYING;

  popupPlayer.stopVideo();

  miniTitleEl.textContent = currentVideo.title;
  miniPlayerBox.classList.remove("hidden");

  miniPlayer.loadVideoById({ videoId: currentVideo.id, startSeconds: t });

  if (isPlaying) {
    miniPlayer.playVideo();
    miniPlayPauseBtn.textContent = "⏸";
  } else {
    miniPlayer.pauseVideo();
    miniPlayPauseBtn.textContent = "▶";
  }

  playerModal.classList.add("hidden");
}

// ------------ RECOMMENDATIONS ------------
function renderModalRecommendations(currentVideoId) {
  modalRecommendationsEl.innerHTML = "";

  const index = lastFetchedItems.findIndex(v => v.id.videoId === currentVideoId);
  const next = lastFetchedItems.slice(index + 1, index + 10);

  next.forEach(item => {
    const vid = {
      id: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle
    };

    const card = document.createElement("div");
    card.className = "modal-rec-card";

    card.innerHTML = `
      <img class="modal-rec-thumb" src="${item.snippet.thumbnails.default.url}">
      <div>
        <div class="modal-rec-title">${vid.title}</div>
        <div class="modal-rec-channel">${vid.channel}</div>
      </div>
    `;

    card.addEventListener("click", () => {
      if (!miniPlayerBox.classList.contains("hidden")) openInMiniPlayer(vid);
      else openPlayerModal(vid, { fromMini: false });
    });

    modalRecommendationsEl.appendChild(card);
  });
}

// ------------ EVENT HANDLERS ------------

// ENTER to search
keywordInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    currentQuery = keywordInput.value.trim();
    currentRating = ratingSelect.value;
    currentContentType = contentTypeSelect.value;
    nextPageToken = null;
    fetchVideos({ append: false });
  }
});

// Button search
filterBtn.addEventListener("click", () => {
  currentQuery = keywordInput.value.trim();
  currentRating = ratingSelect.value;
  currentContentType = contentTypeSelect.value;
  nextPageToken = null;
  fetchVideos({ append: false });
});

// Infinite scroll
window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 400) {
    if (nextPageToken && !isLoading) fetchVideos({ append: true });
  }
});

// Popup close
modalCloseBtn.addEventListener("click", closePlayerModal);

// Backdrop close
playerModal.addEventListener("click", e => {
  if (e.target.classList.contains("player-modal-backdrop")) closePlayerModal();
});

// Mini close
miniCloseBtn.addEventListener("click", () => {
  miniPlayer.stopVideo();
  miniPlayerBox.classList.add("hidden");
});

// Mini play/pause
miniPlayPauseBtn.addEventListener("click", () => {
  const st = miniPlayer.getPlayerState();
  if (st === YT.PlayerState.PLAYING) {
    miniPlayer.pauseVideo();
    miniPlayPauseBtn.textContent = "▶";
  } else {
    miniPlayer.playVideo();
    miniPlayPauseBtn.textContent = "⏸";
  }
});

// Mini expand → popup
miniExpandBtn.addEventListener("click", () => {
  const time = miniPlayer.getCurrentTime();
  const playing = miniPlayer.getPlayerState() === YT.PlayerState.PLAYING;

  openPlayerModal(currentVideo, {
    fromMini: true,
    resumeTime: time,
    wasPlaying: playing
  });
});

// Description expand
descriptionToggleBtn.addEventListener("click", () => {
  const expanded = modalDescriptionEl.classList.toggle("expanded");
  descriptionToggleBtn.textContent = expanded ? "Show less ▲" : "Show more ▼";
});

// Init
initTheme();
