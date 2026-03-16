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
  const {
    genre,
    runtimeMin,
    runtimeMax,
    dateFrom,
    dateTo,
    page = 1,
  } = req.query;

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
      "primary_release_date.lte":
        dateTo || new Date().toISOString().split("T")[0],
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
    return res
      .status(502)
      .json({ error: "Impossible de récupérer les films depuis TMDB" });
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
    return res
      .status(502)
      .json({ error: "Impossible de récupérer les films populaires" });
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

    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${id}/videos?${params}`
    );
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    const data = await response.json();

    setCache(cacheKey, data, 3600); // cache 60 minutes
    return res.json(data);
  } catch (err) {
    console.error("TMDB trailer error:", err.message);
    return res
      .status(502)
      .json({ error: "Impossible de récupérer la bande-annonce" });
  }
};

// Calcul du score de compatibilité (0-100%) basé sur les réponses du quiz
const getScore = async (req, res) => {
  const { movieId, genre, runtime, mood, company } = req.query;
  const id = parseInt(movieId, 10);

  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ error: "ID de film invalide" });
  }

  const cacheKey = `score_${id}_${genre}_${runtime}_${mood}_${company}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const params = new URLSearchParams({
      api_key: process.env.TMDB_API_KEY,
      language: "fr-FR",
    });

    const response = await fetch(`${TMDB_BASE_URL}/movie/${id}?${params}`);
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    const movie = await response.json();

    let score = 50; // Score de base

    // 1. Genre match (0-30 pts)
    const genreId = parseInt(genre, 10);
    if (movie.genres && movie.genres.some((g) => g.id === genreId)) {
      score += 30;
    } else if (movie.genres && movie.genres.length > 0) {
      score += 10;
    }

    // 2. Runtime match (0-20 pts)
    const runtimeId = parseInt(runtime, 10);
    const movieRuntime = movie.runtime || 0;
    if (runtimeId === 10 && movieRuntime <= 90) score += 20;
    else if (runtimeId === 11 && movieRuntime > 90 && movieRuntime <= 120)
      score += 20;
    else if (runtimeId === 12 && movieRuntime > 120) score += 20;
    else score += 5;

    // 3. Vote average bonus (0-15 pts) — films mieux notés = meilleur score
    const voteAvg = movie.vote_average || 0;
    score += Math.round((voteAvg / 10) * 15);

    // 4. Mood match (0-10 pts) — basé sur les genres du film
    const moodId = parseInt(mood, 10);
    const movieGenreIds = movie.genres ? movie.genres.map((g) => g.id) : [];
    const lightGenres = [35, 16, 10751, 10402]; // Comédie, Animation, Famille, Musique
    const intenseGenres = [18, 10749, 53, 27, 10752]; // Drame, Romance, Thriller, Horreur, Guerre
    const thinkGenres = [878, 99, 36, 9648]; // Sci-Fi, Documentaire, Histoire, Mystère

    if (moodId === 40 && movieGenreIds.some((g) => lightGenres.includes(g)))
      score += 10;
    else if (
      moodId === 41 &&
      movieGenreIds.some((g) => intenseGenres.includes(g))
    )
      score += 10;
    else if (
      moodId === 42 &&
      movieGenreIds.some((g) => thinkGenres.includes(g))
    )
      score += 10;
    else score += 3;

    // 5. Company match (0-5 pts) — audience cible
    const companyId = parseInt(company, 10);
    const familyFriendly = movieGenreIds.some((g) =>
      [16, 10751, 12].includes(g)
    );
    const coupleGenres = movieGenreIds.some((g) => [10749, 18, 35].includes(g));
    const friendsGenres = movieGenreIds.some((g) =>
      [28, 35, 27, 878, 53].includes(g)
    );

    if (companyId === 52 && familyFriendly) score += 5;
    else if (companyId === 51 && coupleGenres) score += 5;
    else if (companyId === 53 && friendsGenres) score += 5;
    else if (companyId === 50) score += 3; // Seul = neutre, léger bonus
    else score += 2;

    // Clamp entre 0 et 100
    score = Math.max(0, Math.min(100, score));

    const result = { movieId: id, score, title: movie.title };
    setCache(cacheKey, result, 1800);
    return res.json(result);
  } catch (err) {
    console.error("Score calculation error:", err.message);
    return res.status(502).json({ error: "Impossible de calculer le score" });
  }
};

module.exports = { getRecommendations, getPopular, getTrailer, getScore };
