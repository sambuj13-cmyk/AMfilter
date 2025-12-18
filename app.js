<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>AMFilter</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="style.css" />
</head>

<body>

<!-- INTRO -->
<div id="intro">
  <div class="intro-3d">
    <div class="intro-bg-text">AMFILTER</div>
    <div class="shape-wrapper">
      <div class="floating-shape"></div>
    </div>
    <div class="intro-center">
      <h1 class="intro-logo">AMFILTER</h1>
      <p class="intro-tagline">Clean your YouTube experience</p>
    </div>
  </div>
</div>

<audio id="openSound" src="startup.mp3" preload="auto"></audio>

<div class="bg-blobs">
  <div class="blob blob1"></div>
  <div class="blob blob2"></div>
</div>

<div class="logo-bg-text">AMFILTER</div>

<header class="header">
  <div class="brand">
    <img src="logo.png" class="brand-image" />
    <div class="brand-text">
      <div class="brand-name">AMFilter</div>
      <div class="brand-tagline">Clean & customize your YouTube feed</div>
    </div>
  </div>

  <div class="header-right">
    <a href="https://www.instagram.com/justbeingambuj" target="_blank" class="icon-btn">
      <img src="insta.jpg" class="social-icon" />
    </a>
    <a href="https://github.com/sambuj13-cmyk/AMfilter" target="_blank" class="icon-btn">
      <img src="github.jpg" class="social-icon" />
    </a>
    <button id="themeToggle" class="theme-toggle">🌙</button>
  </div>
</header>

<main class="container">

<section class="filter-box">
  <h2 class="section-title">Search & Filter</h2>
  <div class="filter-row">
    <div class="field-group small">
      <label>Keyword</label>
      <input id="keyword" placeholder="e.g. study, gaming, lofi" />
    </div>
    <div class="field-group tiny">
      <label>Safety</label>
      <select id="rating">
        <option value="all">All</option>
        <option value="PG">PG</option>
      </select>
    </div>
    <div class="field-group tiny">
      <label>Type</label>
      <select id="contentType">
        <option value="all">All</option>
        <option value="shorts">Shorts</option>
        <option value="videos">Videos</option>
      </select>
    </div>
    <button id="filterBtn">Search</button>
  </div>
</section>

<section class="results-section">
  <h2 class="section-title">Results</h2>
  <div id="videoList" class="video-list"></div>
  <div id="loader" class="loader hidden">Loading...</div>
</section>

</main>

<footer class="footer">Made by Ambuj • AMFilter</footer>

<!-- POPUP PLAYER -->
<div id="playerModal" class="player-modal hidden">
  <div class="player-modal-backdrop"></div>
  <div class="player-modal-content">

    <button id="modalCloseBtn" class="modal-close-btn">✕ Close</button>

    <div class="player-modal-main">
      <div class="player-modal-left">

        <div class="player-frame-wrapper">
          <div id="popupPlayer"></div>
        </div>

        <h2 id="modalTitle"></h2>
        <p id="modalChannel"></p>

        <!-- ACTION BAR -->
        <div class="player-actions">
          <button id="prevVideoBtn" class="player-nav-btn">⟨ Prev</button>
          <button id="nextVideoBtn" class="player-nav-btn">Next ⟩</button>
          <button id="downloadBtn" class="download-btn">Download</button>
        </div>

        <div class="description-header">
          <span>Description</span>
          <button id="descriptionToggle" class="description-toggle">Show more ▼</button>
        </div>

        <div id="modalDescription" class="modal-description"></div>
      </div>

      <aside class="player-modal-right">
        <h3>More from this search</h3>
        <div id="modalRecommendations" class="modal-rec-list"></div>
      </aside>
    </div>

  </div>
</div>

<script src="app.js"></script>
<script src="https://www.youtube.com/iframe_api"></script>

</body>
</html>
