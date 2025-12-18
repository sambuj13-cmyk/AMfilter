// INTRO
window.addEventListener("load", () => {
  const intro = document.getElementById("intro");
  setTimeout(() => {
    intro.style.opacity = "0";
    setTimeout(() => intro.remove(), 900);
  }, 2200);
});

// SOUND
const openSound = document.getElementById("openSound");
document.addEventListener("click", () => {
  openSound?.play().catch(() => {});
}, { once: true });

// DOM
const keywordInput = document.getElementById("keyword");
const filterBtn = document.getElementById("filterBtn");
const videoList = document.getElementById("videoList");
const loader = document.getElementById("loader");
const themeToggle = document.getElementById("themeToggle");

const modal = document.getElementById("playerModal");
const modalClose = document.getElementById("modalCloseBtn");
const modalTitle = document.getElementById("modalTitle");
const modalChannel = document.getElementById("modalChannel");
const modalDesc = document.getElementById("modalDescription");
const descToggle = document.getElementById("descriptionToggle");
const recList = document.getElementById("modalRecommendations");

const nextBtn = document.getElementById("nextVideoBtn");
const prevBtn = document.getElementById("prevVideoBtn");
const downloadBtn = document.getElementById("downloadBtn");

// STATE
let videos = [];
let index = 0;
let player;

// THEME
themeToggle.onclick = () => {
  const t = document.body.dataset.theme === "light" ? "dark" : "light";
  document.body.dataset.theme = t;
};

// FETCH
async function search() {
  const q = keywordInput.value.trim();
  if (!q) return;

  loader.classList.remove("hidden");
  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
  const data = await res.json();
  videos = data.items;
  render();
  loader.classList.add("hidden");
}

// RENDER
function render() {
  videoList.innerHTML = "";
  videos.forEach((v, i) => {
    const card = document.createElement("div");
    card.className = "video-card";
    card.innerHTML = `
      <img src="${v.snippet.thumbnails.medium.url}">
      <div class="video-body">
        <div class="video-title">${v.snippet.title}</div>
        <div class="video-meta">${v.snippet.channelTitle}</div>
      </div>`;
    card.onclick = () => open(i);
    videoList.appendChild(card);
  });
}

// PLAYER
window.onYouTubeIframeAPIReady = () => {
  player = new YT.Player("popupPlayer");
};

function open(i) {
  index = i;
  const v = videos[i];

  document.body.classList.add("modal-open");
  modal.classList.remove("hidden");

  modalTitle.textContent = v.snippet.title;
  modalChannel.textContent = v.snippet.channelTitle;
  modalDesc.textContent = "Loading...";

  player.loadVideoById(v.id.videoId);

  fetch(`/api/videoDetails?id=${v.id.videoId}`)
    .then(r => r.json())
    .then(d => modalDesc.textContent =
      d.items?.[0]?.snippet?.description || "No description"
    );

  downloadBtn.onclick = () => {
    const url = `https://www.youtube.com/watch?v=${v.id.videoId}`;
    window.open(`https://yt1s.com/en?q=${encodeURIComponent(url)}`, "_blank");
  };

  renderRecs();
}

// NAV
nextBtn.onclick = () => index < videos.length - 1 && open(index + 1);
prevBtn.onclick = () => index > 0 && open(index - 1);

// DESC
descToggle.onclick = () => {
  modalDesc.classList.toggle("expanded");
  descToggle.textContent =
    modalDesc.classList.contains("expanded")
      ? "Show less ▲"
      : "Show more ▼";
};

// RECS
function renderRecs() {
  recList.innerHTML = "";
  videos.slice(0, 6).forEach((v, i) => {
    if (i === index) return;
    const d = document.createElement("div");
    d.className = "modal-rec-card";
    d.innerHTML = `
      <img src="${v.snippet.thumbnails.default.url}">
      <div>${v.snippet.title}</div>`;
    d.onclick = () => open(i);
    recList.appendChild(d);
  });
}

// CLOSE
modalClose.onclick = () => {
  modal.classList.add("hidden");
  document.body.classList.remove("modal-open");
  player.stopVideo();
};

// SEARCH EVENTS
filterBtn.onclick = search;
keywordInput.onkeydown = e => e.key === "Enter" && search();
