// 🔑 Insert your YouTube API key here
const API_KEY = "YOUR_API_KEY_HERE";

// DOM elements
const keywordInput = document.getElementById("keyword");
const ratingSelect = document.getElementById("rating");
const contentTypeSelect = document.getElementById("contentType");
const filterBtn = document.getElementById("filterBtn");
const videoListEl = document.getElementById("videoList");
const resultInfoEl = document.getElementById("resultInfo");
const errorInfoEl = document.getElementById("errorInfo");
const loaderEl = document.getElementById("loader");
const themeToggleBtn = document.getElementById("themeToggle");

// State for search + infinite scroll
let currentQuery = "";
let currentRating = "all";
let currentContentType = "all";
let nextPageToken = null;
let isLoading = false;

// ------------- THEME HANDLING -------------

function applyTheme(theme) {
    document.body.setAttribute("data-theme", theme);
    themeToggleBtn.textContent = theme === "dark" ? "🌙" : "☀️";
    localStorage.setItem("amfilter-theme", theme);
}

function initTheme() {
    const stored = localStorage.getItem("amfilter-theme");
    if (stored === "light" || stored === "dark") {
        applyTheme(stored);
    } else {
        // Default to dark
        applyTheme("dark");
    }
}

themeToggleBtn.addEventListener("click", () => {
    const current = document.body.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
});

// ------------- YOUTUBE API -------------

function getSafeSearchFromRating(rating) {
    return rating === "PG" ? "strict" : "none";
}

function getDurationFromContentType(type) {
    if (type === "shorts") return "short";  // <4 minutes
    if (type === "videos") return "long";   // >20 minutes
    return "any";                           // all
}

function renderVideos(items, append = false) {
    if (!append) {
        videoListEl.innerHTML = "";
    }

    if (!items || items.length === 0) {
        if (!append) {
            resultInfoEl.textContent = "No videos found.";
        }
        return;
    }

    items.forEach(item => {
        const videoId = item.id.videoId;
        const snippet = item.snippet;

        const card = document.createElement("div");
        card.className = "video-card";

        const thumb = document.createElement("img");
        thumb.src = snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || "";
        thumb.alt = snippet.title || "Video thumbnail";

        const body = document.createElement("div");
        body.className = "video-body";

        const title = document.createElement("a");
        title.href = `https://www.youtube.com/watch?v=${videoId}`;
        title.target = "_blank";
        title.rel = "noopener noreferrer";
        title.className = "video-title";
        title.textContent = snippet.title;

        const meta = document.createElement("div");
        meta.className = "video-meta";

        const channelSpan = document.createElement("span");
        channelSpan.textContent = snippet.channelTitle;

        const dateSpan = document.createElement("span");
        const published = new Date(snippet.publishedAt);
        dateSpan.textContent = published.toLocaleDateString();

        meta.appendChild(channelSpan);
        meta.appendChild(dateSpan);

        const badge = document.createElement("span");
        badge.className = "badge";

        if (currentContentType === "shorts") {
            badge.textContent = "Short";
        } else if (currentContentType === "videos") {
            badge.textContent = "Video";
        } else {
            badge.textContent = "YouTube";
        }

        body.appendChild(title);
        body.appendChild(meta);
        body.appendChild(badge);

        card.appendChild(thumb);
        card.appendChild(body);
        videoListEl.appendChild(card);
    });
}

async function fetchVideos({ append = false } = {}) {
    if (!currentQuery) {
        errorInfoEl.textContent = "Please enter a keyword.";
        return;
    }

    if (isLoading) return;
    isLoading = true;
    loaderEl.classList.remove("hidden");
    errorInfoEl.textContent = "";

    if (!append) {
        resultInfoEl.textContent = "Loading...";
    } else {
        resultInfoEl.textContent = "Loading more...";
    }

    const safeSearch = getSafeSearchFromRating(currentRating);
    const videoDuration = getDurationFromContentType(currentContentType);

    const params = new URLSearchParams({
        key: API_KEY,
        part: "snippet",
        q: currentQuery,
        maxResults: "12",
        type: "video",
        safeSearch,
        videoDuration
    });

    if (append && nextPageToken) {
        params.append("pageToken", nextPageToken);
    }

    const url = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message || "API error");
        }

        // Save next page token for infinite scroll
        nextPageToken = data.nextPageToken || null;

        renderVideos(data.items, append);

        const count = videoListEl.children.length;
        resultInfoEl.textContent = `Showing ${count} videos${nextPageToken ? " • scroll for more" : ""}`;
    } catch (err) {
        console.error(err);
        errorInfoEl.textContent = "Failed to load videos. Check console for details.";
    } finally {
        isLoading = false;
        loaderEl.classList.add("hidden");
    }
}

// ------------- EVENT HANDLERS -------------

filterBtn.addEventListener("click", () => {
    currentQuery = keywordInput.value.trim();
    currentRating = ratingSelect.value;
    currentContentType = contentTypeSelect.value;
    nextPageToken = null;
    fetchVideos({ append: false });
});

// Infinite scroll: load more when near bottom
window.addEventListener("scroll", () => {
    const nearBottom =
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 400;

    if (nearBottom && nextPageToken && !isLoading) {
        fetchVideos({ append: true });
    }
});

// Optional: search a default keyword on page load
// currentQuery = "study with me";
// fetchVideos({ append: false });

// ------------- INIT -------------

initTheme();
