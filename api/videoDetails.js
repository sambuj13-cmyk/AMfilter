// api/videoDetails.js

export default async function handler(req, res) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Missing 'id' query parameter" });
    }

    // 👉 use same active key logic here
    const active = process.env.ACTIVE_YT_KEY || "1";
    const API_KEY = process.env[`YT_API_KEY_${active}`];

    if (!API_KEY) {
      return res.status(500).json({ error: "Active API key not configured" });
    }

    const params = new URLSearchParams({
      key: API_KEY,
      part: "snippet",
      id,
      // fields: "items(snippet(title,description,channelTitle))", // optional optimisation
    });

    const ytRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`
    );
    const data = await ytRes.json();

    if (!ytRes.ok) {
      const message =
        data?.error?.message ||
        "YouTube API error. Try switching to another key.";
      console.error("YouTube API error (videoDetails):", data);
      return res.status(ytRes.status).json({ error: message });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("Error in /api/videoDetails:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
