// ================= INTRO + OPENING SOUND =================
window.addEventListener("load", () => {
  const intro = document.getElementById("intro");
  if (!intro) return;

  // Let the intro stay for ~2.2s, then animate out
  setTimeout(() => {
    intro.style.transition = "opacity 0.9s ease, transform 0.9s ease";
    intro.style.opacity = "0";
    intro.style.transform = "scale(1.05)";

    // Remove intro from DOM after animation
    setTimeout(() => {
      intro.remove();
    }, 900);
  }, 2200);
});

// Browser-safe opening sound (plays on first user interaction only)
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

// NEW: popup next/prev buttons
const nextVideoBtn = document.getElementById("nextVideoBtn");
const prevVideoBtn = document.getElementById("prevVideoBtn");

// Mini player
const miniPlayerBox = document.getElementById("miniPlayer");
const miniTitleEl = document.getElementById("miniTitle");
const miniPlayPauseBtn = document.getElementById("miniPlayPauseBtn");
const miniExpandBtn = document.getElementById("miniExpandBtn");
const miniCloseBtn = document.getElementById("miniCloseBtn");

// NEW: mini next/prev buttons
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
let currentVideoIndex = -1; // NEW: track index in lastFetchedItems

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

// ------------ PLAYLIST HELPERS (NEW) ------------

function syncIndexFromCurrentVideo() {
  if (!currentVideo) return;
  const idx = lastFetchedItems.findIndex(v => v.id.videoId === currentVideo.id);
  if (idx !== -1) currentVideoIndex = idx;
}

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

  if (mode === "mini") {
    openInMiniPlayer(video);
  } else {
    openPlayerModal(video, { fromMini: false });
  }
}

function playNext(mode = "popup") {
  if (!lastFetchedItems.length) return;
  if (currentVideoIndex === -1) syncIndexFromCurrentVideo();
  if (currentVideoIndex === -1) return;

  let nextIndex = currentVideoIndex + 1;
  if (nextIndex >= lastFetchedItems.length) {
    nextIndex = 0; // loop back to start
  }
  playByIndex(nextIndex, mode);
}

function playPrev(mode = "popup") {
  if (!lastFetchedItems.length) return;
  if (currentVideoIndex === -1) syncIndexFromCurrentVideo();
  if (currentVideoIndex === -1) return;

  let prevIndex = currentVideoIndex - 1;
  if (prevIndex < 0) {
    prevIndex = lastFetchedItems.length - 1; // loop to last
  }
  playByIndex(prevIndex, mode);
}

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

    card.addEventListener("click", () => {
      // find index in the global list, then play via playlist logic
      const idx = lastFetchedItems.findIndex(v => v.id.videoId === id);
      const mode = miniPlayerBox.classList.contains("hidden") ? "popup" : "mini";
      if (idx !== -1) {
        playByIndex(idx, mode);
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
    const url = `/api/search?${params.toString()}`;
    console.log("Calling:", url);

    const res = await fetch(url);
    let data;

    try {
      data = await res.json();
    } catch (e) {
      console.error("Failed to parse JSON from /api/search:", e);
      errorInfoEl.textContent = "Server returned invalid response.";
      return;
    }

    if (!res.ok) {
      console.error("Backend /api/search error:", res.status, data);

      let msg = "Error fetching videos.";
      if (data && typeof data === "object") {
        if (typeof data.error === "string") {
          msg = data.error;
        } else if (data.error && typeof data.error.message === "string") {
          msg = data.error.message;
        }
      }

      errorInfoEl.textContent = msg;
      return;
    }

    console.log("Search response:", data);

    nextPageToken = data.nextPageToken || null;

    if (!append) {
      lastFetchedItems = Array.isArray(data.items) ? [...data.items] : [];
      currentVideoIndex = -1; // reset playlist index on a fresh search
    } else {
      if (Array.isArray(data.items)) {
        lastFetchedItems.push(...data.items);
      }
    }

    if (!Array.isArray(data.items) || data.items.length === 0) {
      resultInfoEl.textContent = "No videos found for this search.";
      return;
    }

    renderVideos(data.items, append);
    resultInfoEl.textContent = `Showing ${videoListEl.children.length} videos`;
  } catch (err) {
    console.error("Fetch failed:", err);
    errorInfoEl.textContent = err.message || "Error fetching videos.";
  } finally {
    loaderEl.classList.add("hidden");
    isLoading = false;
  }
}



// ------------ YT API READY ------------
function onPopupPlayerStateChange(event) {
  if (event.data === YT.PlayerState.ENDED) {
    // autoplay next in popup mode
    playNext("popup");
  }
}

function onMiniPlayerStateChange(event) {
  if (event.data === YT.PlayerState.ENDED) {
    // autoplay next in mini mode
    playNext("mini");
  }
}

window.onYouTubeIframeAPIReady = function () {
  popupPlayer = new YT.Player("popupPlayer", {
    playerVars: { autoplay: 0, controls: 1, rel: 0, modestbranding: 1 },
    events: {
      onReady: () => (popupReady = true),
      onStateChange: onPopupPlayerStateChange
    }
  });

  miniPlayer = new YT.Player("miniPlayerFrame", {
    playerVars: { autoplay: 0, controls: 1, rel: 0, modestbranding: 1 },
    events: {
      onReady: () => (miniReady = true),
      onStateChange: onMiniPlayerStateChange
    }
  });
};

// ------------ MINI PLAYER OPEN ------------
function openInMiniPlayer(video) {
  if (!miniReady) return;

  if (popupPlayer && popupReady) {
    popupPlayer.stopVideo();
  }

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

  if (miniPlayer && miniReady) {
    miniPlayer.stopVideo();
  }

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

  if (fromMini && !wasPlaying) {
    popupPlayer.pauseVideo();
  }

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
      const idx = lastFetchedItems.findIndex(v => v.id.videoId === vid.id);
      const mode = miniPlayerBox.classList.contains("hidden") ? "popup" : "mini";
      if (idx !== -1) {
        playByIndex(idx, mode);
      }
    });

    modalRecommendationsEl.appendChild(card);
  });

  if (!next.length) {
    const empty = document.createElement("div");
    empty.className = "modal-empty";
    empty.textContent = "No more videos in this search.";
    modalRecommendationsEl.appendChild(empty);
  }
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
  if (miniPlayer && miniReady) {
    miniPlayer.stopVideo();
  }
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

// NEW: Popup next/prev buttons
nextVideoBtn.addEventListener("click", () => {
  playNext("popup");
});
prevVideoBtn.addEventListener("click", () => {
  playPrev("popup");
});

// NEW: Mini next/prev buttons
miniNextBtn.addEventListener("click", () => {
  playNext("mini");
});
miniPrevBtn.addEventListener("click", () => {
  playPrev("mini");
});

// Init
initTheme();
