// Controller "Où regarder ce film ?" — liens plateformes streaming
// Utilise TMDB watch/providers (gratuit) avec fallback liens de recherche directs

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// Cache in-memory (réutilise le même pattern que tmdbController)
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

// Mapping des providers TMDB connus → logos + URL de recherche
const PLATFORM_CONFIG = {
  8: {
    name: "Netflix",
    logo: "https://image.tmdb.org/t/p/original/pbpMk2JmcoNnQwN5JGpXngfoWtp.jpg",
    searchUrl: (title) =>
      `https://www.netflix.com/search?q=${encodeURIComponent(
        title
      )}&ref=cinegenie&utm_source=cinegenie`,
  },
  119: {
    name: "Amazon Prime Video",
    logo: "https://image.tmdb.org/t/p/original/emthp39XA2YScoYL1p0sdbAH2WA.jpg",
    searchUrl: (title) =>
      `https://www.amazon.fr/s?k=${encodeURIComponent(
        title
      )}&i=instant-video&ref=cinegenie&utm_source=cinegenie`,
  },
  337: {
    name: "Disney+",
    logo: "https://image.tmdb.org/t/p/original/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg",
    searchUrl: (title) =>
      `https://www.disneyplus.com/search/${encodeURIComponent(
        title
      )}?ref=cinegenie&utm_source=cinegenie`,
  },
  2: {
    name: "Apple TV",
    logo: "https://image.tmdb.org/t/p/original/6uhKBfmtzFqOcLousHwZuzcrScK.jpg",
    searchUrl: (title) =>
      `https://tv.apple.com/fr/search?term=${encodeURIComponent(
        title
      )}&ref=cinegenie&utm_source=cinegenie`,
  },
  56: {
    name: "OCS",
    logo: "https://image.tmdb.org/t/p/original/4DWWkfLjZzFqS5IqZlQze9oGMXP.jpg",
    searchUrl: (title) =>
      `https://www.ocs.fr/recherche?query=${encodeURIComponent(
        title
      )}&ref=cinegenie&utm_source=cinegenie`,
  },
  381: {
    name: "Canal+",
    logo: "https://image.tmdb.org/t/p/original/dQeAar5H991VYporEjUspolDarG.jpg",
    searchUrl: (title) =>
      `https://www.canalplus.com/recherche/${encodeURIComponent(
        title
      )}?ref=cinegenie&utm_source=cinegenie`,
  },
};

// Liens de recherche fallback si TMDB ne retourne pas de providers
function getFallbackLinks(title) {
  return [
    {
      name: "Netflix",
      logo: PLATFORM_CONFIG[8].logo,
      url: PLATFORM_CONFIG[8].searchUrl(title),
      type: "search",
    },
    {
      name: "Amazon Prime Video",
      logo: PLATFORM_CONFIG[119].logo,
      url: PLATFORM_CONFIG[119].searchUrl(title),
      type: "search",
    },
    {
      name: "Disney+",
      logo: PLATFORM_CONFIG[337].logo,
      url: PLATFORM_CONFIG[337].searchUrl(title),
      type: "search",
    },
  ];
}

const getStreaming = async (req, res) => {
  const { movieId } = req.params;
  const id = parseInt(movieId, 10);

  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ error: "ID de film invalide" });
  }

  const cacheKey = `streaming_${id}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    // 1. Récupérer les infos du film pour le titre (fallback)
    const movieParams = new URLSearchParams({
      api_key: process.env.TMDB_API_KEY,
      language: "fr-FR",
    });
    const movieResponse = await fetch(
      `${TMDB_BASE_URL}/movie/${id}?${movieParams}`
    );
    const movieData = await movieResponse.json();
    const movieTitle = movieData.title || "";

    // 2. Récupérer les providers TMDB (watch/providers — gratuit)
    const providerParams = new URLSearchParams({
      api_key: process.env.TMDB_API_KEY,
    });
    const providerResponse = await fetch(
      `${TMDB_BASE_URL}/movie/${id}/watch/providers?${providerParams}`
    );

    if (!providerResponse.ok) {
      // Fallback si l'API providers échoue
      const fallback = {
        movieId: id,
        title: movieTitle,
        providers: getFallbackLinks(movieTitle),
        source: "fallback",
      };
      setCache(cacheKey, fallback, 1800);
      return res.json(fallback);
    }

    const providerData = await providerResponse.json();
    const frProviders = providerData.results?.FR;

    if (!frProviders) {
      const fallback = {
        movieId: id,
        title: movieTitle,
        providers: getFallbackLinks(movieTitle),
        source: "fallback",
      };
      setCache(cacheKey, fallback, 1800);
      return res.json(fallback);
    }

    // 3. Construire la liste des providers (flatrate = abonnement, rent = location, buy = achat)
    const allProviders = [
      ...(frProviders.flatrate || []).map((p) => ({ ...p, type: "flatrate" })),
      ...(frProviders.rent || []).map((p) => ({ ...p, type: "rent" })),
      ...(frProviders.buy || []).map((p) => ({ ...p, type: "buy" })),
    ];

    // Dédupliquer par provider_id
    const seen = new Set();
    const providers = allProviders
      .filter((p) => {
        if (seen.has(p.provider_id)) return false;
        seen.add(p.provider_id);
        return true;
      })
      .map((p) => {
        const config = PLATFORM_CONFIG[p.provider_id];
        return {
          id: p.provider_id,
          name: config?.name || p.provider_name,
          logo:
            config?.logo || `https://image.tmdb.org/t/p/original${p.logo_path}`,
          url: config
            ? config.searchUrl(movieTitle)
            : `https://www.google.com/search?q=${encodeURIComponent(
                `${movieTitle} streaming`
              )}&ref=cinegenie`,
          type: p.type,
        };
      });

    const result = {
      movieId: id,
      title: movieTitle,
      providers:
        providers.length > 0 ? providers : getFallbackLinks(movieTitle),
      tmdbLink: frProviders.link || null,
      source: providers.length > 0 ? "tmdb" : "fallback",
    };

    setCache(cacheKey, result, 1800);
    return res.json(result);
  } catch (err) {
    console.error("Streaming providers error:", err.message);
    return res
      .status(502)
      .json({ error: "Impossible de récupérer les plateformes de streaming" });
  }
};

module.exports = { getStreaming };
