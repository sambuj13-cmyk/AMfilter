// ================= INTRO + SOUND =================
window.addEventListener("load", () => {
  const intro = document.getElementById("intro");
  setTimeout(() => {
    intro.style.opacity = "0";
    setTimeout(() => intro.remove(), 800);
  }, 1600);
});

const openSound = document.getElementById("openSound");
document.addEventListener("pointerdown", () => {
  openSound.volume = 0.3;
  openSound.play().catch(() => {});
}, { once: true });


// ================= DOM =================
const keywordInput = document.getElementById("keyword");
const filterBtn = document.getElementById("filterBtn");
const videoListEl = document.getElementById("videoList");
const loaderEl = document.getElementById("loader");
const errorInfoEl = document.getElementById("errorInfo");

const playerModal = document.getElementById("playerModal");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalTitle = document.getElementById("modalTitle");
const modalChannel = document.getElementById("modalChannel");
const modalDescription = document.getElementById("modalDescription");

let player;
let lastItems = [];


// ================= FETCH =================
async function fetchVideos() {
  const q = keywordInput.value.trim();
  if (!q) return;

  loaderEl.classList.remove("hidden");
  videoListEl.innerHTML = "";

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();

    lastItems = data.items || [];
    renderVideos(lastItems);
  } catch {
    errorInfoEl.textContent = "Failed to fetch videos.";
  } finally {
    loaderEl.classList.add("hidden");
  }
}


// ================= RENDER =================
function renderVideos(items) {
  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "video-card";
    card.innerHTML = `
      <img src="${item.snippet.thumbnails.medium.url}">
      <div class="video-body">
        <div class="video-title">${item.snippet.title}</div>
      </div>
    `;

    card.onclick = () => openPlayer(item);
    videoListEl.appendChild(card);
  });
}


// ================= PLAYER =================
window.onYouTubeIframeAPIReady = () => {
  player = new YT.Player("popupPlayer");
};

function openPlayer(item) {
  playerModal.classList.remove("hidden");
  modalTitle.textContent = item.snippet.title;
  modalChannel.textContent = item.snippet.channelTitle;
  modalDescription.textContent = item.snippet.description || "";

  player.loadVideoById(item.id.videoId);
}

modalCloseBtn.onclick = () => {
  player.stopVideo();
  playerModal.classList.add("hidden");
};


// ================= EVENTS =================
filterBtn.onclick = fetchVideos;
keywordInput.onkeydown = e => e.key === "Enter" && fetchVideos();
