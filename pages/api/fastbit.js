import axios from "axios";

const BASE_URL = "https://fastbit.tech/api";

export default async function handler(req, res) {
  const { path, apiKey, method = "GET", body } = req.body;

  if (!apiKey) return res.status(400).json({ error: "Missing API key" });

  try {
    const response = await axios({
      url: `${BASE_URL}${path}`,
      method,
      headers: { "X-API-KEY": apiKey },
      data: body || {},
    });
    res.status(200).json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
