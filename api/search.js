// api/search.js

export default async function handler(req, res) {
  try {
    const { q, rating = "all", contentType = "all", pageToken } = req.query;

    if (!q) {
      return res.status(400).json({ error: "Missing 'q' query parameter" });
    }

    // 👉 choose which key to use based on ACTIVE_YT_KEY
    const active = process.env.ACTIVE_YT_KEY || "1";
    const API_KEY = process.env[`YT_API_KEY_${active}`];

    if (!API_KEY) {
      return res.status(500).json({ error: "Active API key not configured" });
    }

    const safeSearch = rating === "PG" ? "strict" : "none";
    let videoDuration = "any";
    if (contentType === "shorts") videoDuration = "short";
    if (contentType === "videos") videoDuration = "long";

    const params = new URLSearchParams({
      key: API_KEY,
      part: "snippet",
      q,
      maxResults: "12",
      type: "video",
      safeSearch,
      videoDuration,
      videoEmbeddable: "true",
    });

    if (pageToken) params.append("pageToken", pageToken);

    const ytRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params.toString()}`
    );
    const data = await ytRes.json();

    if (!ytRes.ok) {
      const message =
        data?.error?.message ||
        "YouTube API error. Try switching to another key.";
      console.error("YouTube API error (search):", data);
      return res.status(ytRes.status).json({ error: message });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("Error in /api/search:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
