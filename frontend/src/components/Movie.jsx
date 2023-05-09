import React, { useState, useEffect } from "react";
import "./Movie.css";
import { useLocation } from "react-router-dom";

function Movie() {
  const [filteredMovies, setFilteredMovies] = useState([]);
  const [index, setIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [trailer, setTrailer] = useState(null);
  const [cast, setCast] = useState([]);
  const location = useLocation();
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
        return [0, Infinity];
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
      const runtimeRange = getRuntimeFilter(quizResponses.runtime);
      const releaseDateRange = getReleaseDateRange(quizResponses.releaseDate);
      const pagesToFetch = 100;

      const fetchPage = async (pageNumber) => {
        const url = `https://api.themoviedb.org/3/discover/movie?api_key=${
          import.meta.env.VITE_TMDB_API_KEY
        }&language=fr-FR&sort_by=popularity.desc&with_genres=${
          quizResponses.genre
        }&primary_release_date.gte=${
          releaseDateRange.split(",")[0]
        }&primary_release_date.lte=${
          releaseDateRange.split(",")[1]
        }&with_runtime.gte=${runtimeRange[0]}&with_runtime.lte=${
          runtimeRange[1]
        }&vote_average.gte=5&page=${pageNumber}`;

        const response = await fetch(url);
        const data = await response.json();
        return data;
      };

      const fetchedPages = await Promise.all(
        Array.from({ length: pagesToFetch }, (_, i) => fetchPage(i + 1))
      );

      const allMovies = fetchedPages.flatMap((page) => page.results);
      const sortedMovies = allMovies.sort(
        (a, b) => a.genre_ids.length - b.genre_ids.length
      );
      const filteredMoviesG = sortedMovies.filter((movie) => {
        const mainGenre = movie.genre_ids[0];
        return mainGenre === quizResponses.genre;
      });

      setFilteredMovies(filteredMoviesG);
      setIsLoading(false);
    };

    fetchMovies();
  }, [quizResponses]);

  const fetchCast = async (movieId) => {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${
        import.meta.env.VITE_TMDB_API_KEY
      }`
    );
    const data = await response.json();
    setCast(data.cast.slice(0, 5));
  };

  function refreshPage() {
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * filteredMovies.length);
    } while (newIndex === index && filteredMovies.length > 1);
    setIndex(newIndex);

    const randomMovie = filteredMovies[newIndex];
    fetchCast(randomMovie.id);

    (async () => {
      const trailerResponse = await fetch(
        `https://api.themoviedb.org/3/movie/${randomMovie.id}/videos?api_key=${
          import.meta.env.VITE_TMDB_API_KEY
        }&language=fr-FR`
      );
      const trailerData = await trailerResponse.json();

      const youtubeTrailer = trailerData.results.find(
        (video) => video.site === "YouTube" && video.type === "Trailer"
      );
      if (youtubeTrailer) {
        setTrailer(youtubeTrailer.key);
      } else {
        setTrailer(null);
      }
    })();
  }

  return (
    <div className="main">
      {isLoading ? (
        <div className="container">
          <div className="loader" />
        </div>
      ) : (
        filteredMovies &&
        filteredMovies[index] && (
          <div key={filteredMovies[index].id} className="text">
            <h2>{filteredMovies[index].title}</h2>
            <div className="n">
              <img
                className="img"
                src={`https://image.tmdb.org/t/p/w500${filteredMovies[index].poster_path}`}
                alt={filteredMovies[index].title}
              />
              <p className="movie">{filteredMovies[index].overview}</p>
            </div>
            {cast && (
              <div className="actor">
                <h3>Acteurs :</h3>
                <ul className="a">
                  {cast.map((actor) => (
                    <li key={actor.id} className="actor-item">
                      <img
                        className="pActor"
                        src={`https://image.tmdb.org/t/p/w200${actor.profile_path}`}
                        alt={actor.name}
                      />
                      <p>{actor.name}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button type="button" onClick={refreshPage}>
              <span>Autre suggestion</span>
            </button>
            {trailer && (
              <div>
                <h3>Trailer:</h3>
                <iframe
                  width="560"
                  height="315"
                  src={`https://www.youtube.com/embed/${trailer}`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
export default Movie;
