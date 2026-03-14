// Proxy TMDB — protège la clé API côté serveur
// Cache in-memory simple (Map) pour éviter de dépasser le quota TMDB gratuit

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const VALID_GENRES = [28, 35, 27, 10749, 878]; // Action, Comédie, Horreur, Romance, Sci-Fi

// Cache simple : Map { cacheKey -> { data, expiresAt } }
const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data, ttlSeconds) {
  cache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
}

const getRecommendations = async (req, res) => {
  const { genre, runtimeMin, runtimeMax, dateFrom, dateTo, page = 1 } = req.query;

  const genreId = parseInt(genre, 10);
  if (!VALID_GENRES.includes(genreId)) {
    return res.status(400).json({ error: "Genre invalide" });
  }

  const cacheKey = `reco_${genreId}_${runtimeMin}_${runtimeMax}_${dateFrom}_${dateTo}_${page}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const params = new URLSearchParams({
      api_key: process.env.TMDB_API_KEY,
      language: "fr-FR",
      sort_by: "popularity.desc",
      with_genres: genreId,
      "primary_release_date.gte": dateFrom || "1900-01-01",
      "primary_release_date.lte": dateTo || new Date().toISOString().split("T")[0],
      "with_runtime.gte": runtimeMin || 0,
      "with_runtime.lte": runtimeMax || 300,
      "vote_average.gte": 5,
      page,
    });

    const response = await fetch(`${TMDB_BASE_URL}/discover/movie?${params}`);
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    const data = await response.json();

    setCache(cacheKey, data, 1800); // cache 30 minutes
    return res.json(data);
  } catch (err) {
    console.error("TMDB recommendations error:", err.message);
    return res.status(502).json({ error: "Impossible de récupérer les films depuis TMDB" });
  }
};

const getPopular = async (req, res) => {
  const cacheKey = "popular_movies";
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const params = new URLSearchParams({
      api_key: process.env.TMDB_API_KEY,
      language: "fr-FR",
      sort_by: "popularity.desc",
      page: 1,
    });

    const response = await fetch(`${TMDB_BASE_URL}/movie/popular?${params}`);
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    const data = await response.json();

    setCache(cacheKey, data, 3600); // cache 60 minutes
    return res.json(data);
  } catch (err) {
    console.error("TMDB popular error:", err.message);
    return res.status(502).json({ error: "Impossible de récupérer les films populaires" });
  }
};

const getTrailer = async (req, res) => {
  const { movieId } = req.params;
  const id = parseInt(movieId, 10);

  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ error: "ID de film invalide" });
  }

  const cacheKey = `trailer_${id}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const params = new URLSearchParams({
      api_key: process.env.TMDB_API_KEY,
      language: "fr-FR",
    });

    const response = await fetch(`${TMDB_BASE_URL}/movie/${id}/videos?${params}`);
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    const data = await response.json();

    setCache(cacheKey, data, 3600); // cache 60 minutes
    return res.json(data);
  } catch (err) {
    console.error("TMDB trailer error:", err.message);
    return res.status(502).json({ error: "Impossible de récupérer la bande-annonce" });
  }
};

module.exports = { getRecommendations, getPopular, getTrailer };
