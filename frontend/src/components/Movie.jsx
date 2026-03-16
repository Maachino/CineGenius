import React, { useState, useEffect } from "react";
import "./Movie.css";
import { useLocation, useNavigate } from "react-router-dom";
import SEOHead from "./SEOHead";

function Movie() {
  const [filteredMovies, setFilteredMovies] = useState([]);
  const [index, setIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [trailer, setTrailer] = useState(null);
  const [error, setError] = useState(null);
  const [score, setScore] = useState(null);
  const [streamingProviders, setStreamingProviders] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();

  // Guard: redirect to home if quiz was not completed
  if (!location.state?.quizResponses) {
    navigate("/");
    return null;
  }

  const { quizResponses } = location.state;

  const getRuntimeFilter = (runtimeId) => {
    switch (runtimeId) {
      case 10:
        return [0, 90];
      case 11:
        return [90, 120];
      case 12:
        return [120, 180];
      default:
        return [0, 300];
    }
  };

  const getReleaseDateRange = (releaseDate) => {
    const currentYear = new Date().getFullYear();
    let startYear;
    let endYear;
    switch (releaseDate) {
      case "-3 ans":
        startYear = currentYear - 3;
        endYear = currentYear;
        break;
      case "-5 ans":
        startYear = currentYear - 5;
        endYear = currentYear;
        break;
      case "-10 ans":
        startYear = currentYear - 10;
        endYear = currentYear;
        break;
      case "-20 ans":
        startYear = currentYear - 20;
        endYear = currentYear;
        break;
      case "+20 ans":
        startYear = 1900;
        endYear = currentYear - 20;
        break;
      default:
        startYear = 1900;
        endYear = currentYear;
        break;
    }
    return `${startYear}-01-01,${endYear}-12-31`;
  };

  const fetchScoreForMovie = async (movieId) => {
    try {
      const params = new URLSearchParams({
        movieId,
        genre: quizResponses.genre,
        runtime: quizResponses.runtime,
        mood: quizResponses.mood || 0,
        company: quizResponses.company || 0,
      });
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/movies/score?${params}`
      );
      const data = await response.json();
      setScore(data.score);
    } catch {
      setScore(null);
    }
  };

  const fetchStreamingForMovie = async (movieId) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/movies/${movieId}/streaming`
      );
      const data = await response.json();
      setStreamingProviders(data.providers || []);
    } catch {
      setStreamingProviders([]);
    }
  };

  const fetchTrailerForMovie = async (movieId) => {
    try {
      const trailerResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/movies/${movieId}/trailer`
      );
      const trailerData = await trailerResponse.json();
      const youtubeTrailer = trailerData.results?.find(
        (video) => video.site === "YouTube" && video.type === "Trailer"
      );
      setTrailer(youtubeTrailer ? youtubeTrailer.key : null);
    } catch {
      setTrailer(null);
    }
  };

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const runtimeRange = getRuntimeFilter(quizResponses.runtime);
        const releaseDateRange = getReleaseDateRange(quizResponses.releaseDate);
        const [dateFrom, dateTo] = releaseDateRange.split(",");

        const pages = [1, 2, 3];
        const fetchPage = async (pageNumber) => {
          const params = new URLSearchParams({
            genre: quizResponses.genre,
            runtimeMin: runtimeRange[0],
            runtimeMax: runtimeRange[1],
            dateFrom,
            dateTo,
            page: pageNumber,
          });
          const response = await fetch(
            `${
              import.meta.env.VITE_BACKEND_URL
            }/api/movies/recommendations?${params}`
          );
          if (!response.ok)
            throw new Error("Erreur lors de la récupération des films");
          return response.json();
        };

        const fetchedPages = await Promise.all(pages.map((p) => fetchPage(p)));
        const allMovies = fetchedPages.flatMap((page) => page.results || []);

        const sortedMovies = allMovies.sort(
          (a, b) => a.genre_ids.length - b.genre_ids.length
        );
        const filteredMoviesG = sortedMovies.filter((movie) => {
          const mainGenre = movie.genre_ids[0];
          return mainGenre === quizResponses.genre;
        });

        setFilteredMovies(filteredMoviesG);
        setIsLoading(false);

        // Load trailer, score, and streaming for the first movie automatically
        if (filteredMoviesG.length > 0) {
          fetchTrailerForMovie(filteredMoviesG[0].id);
          fetchScoreForMovie(filteredMoviesG[0].id);
          fetchStreamingForMovie(filteredMoviesG[0].id);
        }
      } catch (err) {
        setError("Impossible de charger les films. Veuillez réessayer.");
        setIsLoading(false);
      }
    };

    fetchMovies();
  }, [quizResponses]);

  function refreshPage() {
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * filteredMovies.length);
    } while (newIndex === index && filteredMovies.length > 1);
    setIndex(newIndex);
    setTrailer(null);
    setScore(null);
    setStreamingProviders([]);
    fetchTrailerForMovie(filteredMovies[newIndex].id);
    fetchScoreForMovie(filteredMovies[newIndex].id);
    fetchStreamingForMovie(filteredMovies[newIndex].id);
  }

  const currentMovie = filteredMovies[index];
  const releaseYear = currentMovie?.release_date
    ? currentMovie.release_date.slice(0, 4)
    : null;
  const rating = currentMovie?.vote_average
    ? currentMovie.vote_average.toFixed(1)
    : null;

  if (error) {
    return (
      <div className="main">
        <div className="container">
          <p className="error-message">{error}</p>
          <button type="button" onClick={() => navigate("/")}>
            Retour au quiz
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="main">
        <div className="container">
          <div className="loader" />
        </div>
      </div>
    );
  }

  if (filteredMovies.length === 0) {
    return (
      <div className="main">
        <div className="container">
          <p>
            Aucun film trouvé pour ces critères. Essayez une autre combinaison !
          </p>
          <button type="button" onClick={() => navigate("/")}>
            Nouveau quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="main">
      {currentMovie && (
        <SEOHead
          title={currentMovie.title}
          description={`Découvrez ${
            currentMovie.title
          } — recommandé par CineGenius. ${currentMovie.overview?.slice(
            0,
            120
          )}...`}
          ogImage={
            currentMovie.poster_path
              ? `https://image.tmdb.org/t/p/w500${currentMovie.poster_path}`
              : null
          }
        />
      )}
      <button
        type="button"
        className="back-btn"
        onClick={() => navigate("/")}
        aria-label="Retour au quiz"
      >
        ← Retour au quiz
      </button>
      {currentMovie && (
        <div key={currentMovie.id} className="text">
          <h2>{currentMovie.title}</h2>
          {(releaseYear || rating) && (
            <p className="movie-meta">
              {releaseYear && <span>{releaseYear}</span>}
              {releaseYear && rating && <span> · </span>}
              {rating && <span>⭐ {rating}/10</span>}
            </p>
          )}
          {score !== null && (
            <div className="score-badge">
              <span className="score-value">{score}%</span>
              <span className="score-label">pour vous</span>
            </div>
          )}
          <div className="n">
            <img
              className="img"
              src={`https://image.tmdb.org/t/p/w500${currentMovie.poster_path}`}
              alt={`Affiche du film ${currentMovie.title}`}
            />
            <p className="movie">{currentMovie.overview}</p>
          </div>
          <button type="button" onClick={refreshPage}>
            <span>Autre suggestion</span>
          </button>
          {streamingProviders.length > 0 && (
            <div className="streaming-section">
              <h3>Où regarder ce film ?</h3>
              <div className="streaming-buttons">
                {streamingProviders.map((provider) => (
                  <a
                    key={provider.name}
                    href={provider.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="streaming-btn"
                  >
                    <img
                      src={provider.logo}
                      alt={provider.name}
                      className="streaming-logo"
                    />
                    <span>{provider.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
          <a
            href={`https://www.amazon.fr/s?k=${encodeURIComponent(
              `${currentMovie.title} film`
            )}&tag=cinegenie-21&ref=cinegenie&utm_source=cinegenie`}
            target="_blank"
            rel="noopener noreferrer"
            className="amazon-btn"
          >
            🛒 Acheter / Louer sur Amazon
          </a>
          {trailer && (
            <div>
              <h3>Bande-annonce :</h3>
              <iframe
                className="movie-iframe"
                src={`https://www.youtube-nocookie.com/embed/${trailer}`}
                title={`Bande-annonce de ${currentMovie.title}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Movie;
