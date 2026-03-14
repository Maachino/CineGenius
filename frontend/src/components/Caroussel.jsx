import React, { useEffect, useState } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "./Caroussel.css";

function Caroussel() {
  const [movies, setMovies] = useState([]);

  const fetchMovies = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/movies/popular`
      );
      const data = await response.json();
      setMovies(data.results || []);
    } catch (error) {
      console.error("Erreur lors de la récupération des films", error);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  const settings = {
    dots: true,
    infinite: true,
    speed: 1100,
    slidesToShow: 5,
    slidesToScroll: 5,
    autoplay: true,
    autoplaySpeed: 6000,
    pauseOnHover: true,
  };

  return (
    <div className="caroussel-container">
      <h1>Films populaires :</h1>
      <Slider
        dots={settings.dots}
        infinite={settings.infinite}
        speed={settings.speed}
        slidesToShow={settings.slidesToShow}
        slidesToScroll={settings.slidesToScroll}
        autoplay={settings.autoplay}
        autoplaySpeed={settings.autoplaySpeed}
        pauseOnHover={settings.pauseOnHover}
      >
        {movies.map((movie) => (
          <div key={movie.id} className="caroussel-item">
            <img
              className="caroussel-image"
              src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
              alt={movie.title}
            />
            <div className="caroussel-item-title">{movie.title}</div>
          </div>
        ))}
      </Slider>
    </div>
  );
}

export default Caroussel;
