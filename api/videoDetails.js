// api/videoDetails.js

export default async function handler(req, res) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Missing 'id' query parameter" });
    }

    const API_KEY = process.env.YT_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({ error: "Server API key not configured" });
    }

    const params = new URLSearchParams({
      key: API_KEY,
      part: "snippet",
      id,
    });

    const ytRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`
    );
    const data = await ytRes.json();

    if (!ytRes.ok) {
      return res.status(ytRes.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("Error in /api/videoDetails:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
