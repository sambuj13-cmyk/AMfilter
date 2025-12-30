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

// NEW: Queue elements
const queueToggleBtn = document.getElementById("queueToggleBtn");
const queuePanel = document.getElementById("queuePanel");
const queueCloseBtn = document.getElementById("queueCloseBtn");
const queueList = document.getElementById("queueList");
const clearQueueBtn = document.getElementById("clearQueueBtn");

// ------------ STATE ------------
let currentQuery = "";
let currentRating = "all";
let currentContentType = "all";
let nextPageToken = null;
let isLoading = false;
let lastFetchedItems = [];
let currentVideo = null;
let currentVideoIndex = -1; // NEW: track index in lastFetchedItems

// NEW: Queue state
let videoQueue = []; // Store queued videos
let isPlayingFromQueue = false; // Track if currently playing from queue

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

// ------------ QUEUE MANAGEMENT (NEW) ------------

function addToQueue(video) {
  // Check if video is already in queue
  const alreadyInQueue = videoQueue.find(v => v.id === video.id);
  if (!alreadyInQueue) {
    videoQueue.push(video);
    updateQueueDisplay();
    showQueueNotification("Added to queue");
  } else {
    showQueueNotification("Already in queue");
  }
}

function removeFromQueue(videoId) {
  videoQueue = videoQueue.filter(v => v.id !== videoId);
  updateQueueDisplay();
}

function clearQueue() {
  videoQueue = [];
  updateQueueDisplay();
  showQueueNotification("Queue cleared");
}

function updateQueueDisplay() {
  if (videoQueue.length === 0) {
    queueList.innerHTML = '<p class="queue-empty">Queue is empty</p>';
    return;
  }

  queueList.innerHTML = "";
  videoQueue.forEach((video, index) => {
    const queueItem = document.createElement("div");
    queueItem.className = "queue-item";
    if (currentVideo && currentVideo.id === video.id) {
      queueItem.classList.add("active");
    }

    queueItem.innerHTML = `
      <div class="queue-item-info">
        <div class="queue-item-title">${video.title}</div>
        <div class="queue-item-channel">${video.channel}</div>
      </div>
      <button class="queue-item-remove">✕</button>
    `;

    queueItem.addEventListener("click", (e) => {
      if (!e.target.classList.contains("queue-item-remove")) {
        playQueueItem(index);
      }
    });

    queueItem.querySelector(".queue-item-remove").addEventListener("click", (e) => {
      e.stopPropagation();
      removeFromQueue(video.id);
    });

    queueList.appendChild(queueItem);
  });
}

function playQueueItem(index) {
  const video = videoQueue[index];
  if (!video) return;

  currentVideo = video;
  isPlayingFromQueue = true;
  const mode = miniPlayerBox.classList.contains("hidden") ? "popup" : "mini";
  
  if (mode === "mini") {
    openInMiniPlayer(video);
  } else {
    openPlayerModal(video, { fromMini: false });
  }
  
  updateQueueDisplay();
}

function playNextFromQueue(mode = "popup") {
  if (!isPlayingFromQueue || !currentVideo) return false;

  const currentIndex = videoQueue.findIndex(v => v.id === currentVideo.id);
  if (currentIndex === -1) return false;

  const nextIndex = currentIndex + 1;
  if (nextIndex < videoQueue.length) {
    playQueueItem(nextIndex);
    return true;
  }
  
  // Queue finished, return to normal playlist
  isPlayingFromQueue = false;
  updateQueueDisplay();
  return false;
}

function toggleQueuePanel() {
  queuePanel.classList.toggle("hidden");
}

function showQueueNotification(message) {
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    bottom: 100px;
    right: 20px;
    background: rgba(59, 130, 246, 0.9);
    color: white;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 12px;
    z-index: 999;
    animation: slideInUp 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideOutDown 0.3s ease";
    setTimeout(() => notification.remove(), 300);
  }, 2000);
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
        <div class="video-actions">
          <span class="badge">${
            currentContentType === "shorts" ? "Short" :
            currentContentType === "videos" ? "Video" : "YouTube"
          }</span>
          <button class="add-to-queue-btn" title="Add to Queue">➕ Queue</button>
        </div>
      </div>
    `;

    card.addEventListener("click", (e) => {
      if (e.target.classList.contains("add-to-queue-btn")) {
        e.stopPropagation();
        const video = {
          id: id,
          title: s.title,
          channel: s.channelTitle
        };
        addToQueue(video);
      } else {
        // find index in the global list, then play via playlist logic
        const idx = lastFetchedItems.findIndex(v => v.id.videoId === id);
        const mode = miniPlayerBox.classList.contains("hidden") ? "popup" : "mini";
        if (idx !== -1) {
          playByIndex(idx, mode);
        }
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
    // Check if playing from queue first
    if (isPlayingFromQueue) {
      const hasMore = playNextFromQueue("popup");
      if (!hasMore) {
        playNext("popup"); // Fall back to regular playlist
      }
    } else {
      // autoplay next in popup mode
      playNext("popup");
    }
  }
}

function onMiniPlayerStateChange(event) {
  if (event.data === YT.PlayerState.ENDED) {
    // Check if playing from queue first
    if (isPlayingFromQueue) {
      const hasMore = playNextFromQueue("mini");
      if (!hasMore) {
        playNext("mini"); // Fall back to regular playlist
      }
    } else {
      // autoplay next in mini mode
      playNext("mini");
    }
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

  // Add class to queue button and panel when mini player is open
  queueToggleBtn.classList.add("mini-player-active");
  queuePanel.classList.add("mini-player-active");

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
  document.body.classList.add("modal-open");

  // Remove class from queue button and panel when mini player closes
  queueToggleBtn.classList.remove("mini-player-active");
  queuePanel.classList.remove("mini-player-active");

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

  // Add class to queue button and panel when mini player opens
  queueToggleBtn.classList.add("mini-player-active");
  queuePanel.classList.add("mini-player-active");

  miniPlayer.loadVideoById({ videoId: currentVideo.id, startSeconds: t });

  if (isPlaying) {
    miniPlayer.playVideo();
    miniPlayPauseBtn.textContent = "⏸";
  } else {
    miniPlayer.pauseVideo();
    miniPlayPauseBtn.textContent = "▶";
  }

  playerModal.classList.add("hidden");
  document.body.classList.remove("modal-open");

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

// NEW: Queue event listeners
queueToggleBtn.addEventListener("click", toggleQueuePanel);
queueCloseBtn.addEventListener("click", toggleQueuePanel);
clearQueueBtn.addEventListener("click", clearQueue);

// ------------ MINI PLAYER DRAG FUNCTIONALITY ------------
let isDragging = false;
let startX = 0;
let startY = 0;
let initialPlayerX = 0; // Store initial position when drag starts
let miniPlayerX = null; // Store position, null means default (right: 16px)
const DRAG_THRESHOLD = 5; // Minimum pixels to start drag
const CLOSE_THRESHOLD = 0.5; // Close if dragged 50% of player width off-screen
const SPRING_STIFFNESS = 0.1;
const SPRING_DAMPING = 0.85;

// Helper to get current X position from transform
function getMiniPlayerX() {
  const transform = miniPlayerBox.style.transform;
  if (transform && transform.includes('translateX')) {
    const match = transform.match(/translateX\(([^)]+)px\)/);
    if (match) return parseFloat(match[1]);
  }
  return 0; // Default center position
}

// Helper to get mini player width
function getMiniPlayerWidth() {
  const rect = miniPlayerBox.getBoundingClientRect();
  return rect.width;
}

// Helper to set mini player position
function setMiniPlayerPosition(x, useTransition = false) {
  const playerWidth = getMiniPlayerWidth();
  // Allow player to slide both left and right off-screen
  const maxX = window.innerWidth;
  const minX = -playerWidth;
  
  miniPlayerX = Math.max(minX, Math.min(maxX, x));
  
  if (useTransition) {
    miniPlayerBox.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
  } else {
    miniPlayerBox.style.transition = 'none';
  }
  miniPlayerBox.style.transform = `translateX(${miniPlayerX}px)`;
}

// Helper to reset mini player position to center
function resetMiniPlayerPosition() {
  miniPlayerX = 0;
  miniPlayerBox.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
  miniPlayerBox.style.transform = 'translateX(0)';
}

// Helper to close mini player
function closeMiniPlayerOnSlide() {
  if (miniPlayer && miniReady) {
    miniPlayer.stopVideo();
  }
  miniPlayerBox.classList.add("hidden");
  queueToggleBtn.classList.remove("mini-player-active");
  queuePanel.classList.remove("mini-player-active");
  miniPlayerX = 0;
  miniPlayerBox.style.transition = 'none';
  miniPlayerBox.style.transform = 'translateX(0)';
}

// Snap back to center with spring animation
function snapBackToCenter() {
  miniPlayerBox.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
  miniPlayerX = 0;
  miniPlayerBox.style.transform = 'translateX(0)';
}

// Mouse events
miniPlayerBox.addEventListener('mousedown', (e) => {
  // Don't start drag on buttons
  if (e.target.closest('.mini-btn')) return;
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
  initialPlayerX = getMiniPlayerX();
  miniPlayerBox.style.cursor = 'grabbing';
  miniPlayerBox.style.transition = 'none';
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const deltaX = e.clientX - startX;
  
  // Only start dragging if movement exceeds threshold
  if (Math.abs(deltaX) > DRAG_THRESHOLD) {
    const newX = initialPlayerX + deltaX;
    setMiniPlayerPosition(newX, false);
  }
});

document.addEventListener('mouseup', (e) => {
  if (!isDragging) return;
  isDragging = false;
  miniPlayerBox.style.cursor = 'grab';
  
  const currentX = getMiniPlayerX();
  const playerWidth = getMiniPlayerWidth();
  const closeThresholdPx = playerWidth * CLOSE_THRESHOLD;
  
  // Check if dragged far enough to close (off-screen on either side)
  if (currentX < -closeThresholdPx || currentX > window.innerWidth - playerWidth + closeThresholdPx) {
    // Animate to off-screen and close
    miniPlayerBox.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
    if (currentX < 0) {
      miniPlayerBox.style.transform = `translateX(${-playerWidth - 50}px)`;
    } else {
      miniPlayerBox.style.transform = `translateX(${window.innerWidth + 50}px)`;
    }
    setTimeout(closeMiniPlayerOnSlide, 400);
  } else {
    // Snap back to center
    snapBackToCenter();
  }
});

// Touch events for mobile
miniPlayerBox.addEventListener('touchstart', (e) => {
  // Don't start drag on buttons
  if (e.target.closest('.mini-btn')) return;
  isDragging = true;
  const touch = e.touches[0];
  startX = touch.clientX;
  startY = touch.clientY;
  initialPlayerX = getMiniPlayerX();
  miniPlayerBox.style.transition = 'none';
  e.preventDefault();
}, { passive: false });

document.addEventListener('touchmove', (e) => {
  if (!isDragging) return;
  const touch = e.touches[0];
  const deltaX = touch.clientX - startX;
  
  // Only start dragging if movement exceeds threshold
  if (Math.abs(deltaX) > DRAG_THRESHOLD) {
    const newX = initialPlayerX + deltaX;
    setMiniPlayerPosition(newX, false);
  }
}, { passive: false });

document.addEventListener('touchend', (e) => {
  if (!isDragging) return;
  isDragging = false;
  
  const currentX = getMiniPlayerX();
  const playerWidth = getMiniPlayerWidth();
  const closeThresholdPx = playerWidth * CLOSE_THRESHOLD;
  
  // Check if dragged far enough to close (off-screen on either side)
  if (currentX < -closeThresholdPx || currentX > window.innerWidth - playerWidth + closeThresholdPx) {
    // Animate to off-screen and close
    miniPlayerBox.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
    if (currentX < 0) {
      miniPlayerBox.style.transform = `translateX(${-playerWidth - 50}px)`;
    } else {
      miniPlayerBox.style.transform = `translateX(${window.innerWidth + 50}px)`;
    }
    setTimeout(closeMiniPlayerOnSlide, 400);
  } else {
    // Snap back to center
    snapBackToCenter();
  }
});

// Close button handler
miniCloseBtn.addEventListener('click', () => {
  closeMiniPlayerOnSlide();
});

// Close queue panel when clicking outside
document.addEventListener("click", (e) => {
  if (!queuePanel.classList.contains("hidden") && 
      !queuePanel.contains(e.target) && 
      e.target !== queueToggleBtn) {
    queuePanel.classList.add("hidden");
  }
});

// Init
initTheme();
