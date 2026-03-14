import React, { useState, useEffect } from "react";
import "./Movie.css";
import { useLocation, useNavigate } from "react-router-dom";

function Movie() {
  const [filteredMovies, setFilteredMovies] = useState([]);
  const [index, setIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [trailer, setTrailer] = useState(null);
  const [error, setError] = useState(null);
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

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const runtimeRange = getRuntimeFilter(quizResponses.runtime);
        const releaseDateRange = getReleaseDateRange(quizResponses.releaseDate);
        const [dateFrom, dateTo] = releaseDateRange.split(",");

        // Fetch 3 pages via backend proxy (clé TMDB protégée côté serveur)
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

    const movie = filteredMovies[newIndex];

    (async () => {
      try {
        const trailerResponse = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/movies/${movie.id}/trailer`
        );
        const trailerData = await trailerResponse.json();

        const youtubeTrailer = trailerData.results?.find(
          (video) => video.site === "YouTube" && video.type === "Trailer"
        );
        setTrailer(youtubeTrailer ? youtubeTrailer.key : null);
      } catch {
        setTrailer(null);
      }
    })();
  }

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
      {filteredMovies[index] && (
        <div key={filteredMovies[index].id} className="text">
          <h2>{filteredMovies[index].title}</h2>
          <div className="n">
            <img
              className="img"
              src={`https://image.tmdb.org/t/p/w500${filteredMovies[index].poster_path}`}
              alt={`Affiche du film ${filteredMovies[index].title}`}
            />
            <p className="movie">{filteredMovies[index].overview}</p>
          </div>
          <button type="button" onClick={refreshPage}>
            <span>autre suggestion</span>
          </button>
          {trailer && (
            <div>
              <h3>Trailer:</h3>
              <iframe
                width="560"
                height="315"
                src={`https://www.youtube-nocookie.com/embed/${trailer}`}
                title={`Bande-annonce de ${filteredMovies[index].title}`}
                frameBorder="0"
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
