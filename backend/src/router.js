const express = require("express");

const router = express.Router();

const itemControllers = require("./controllers/itemControllers");
const tmdbController = require("./controllers/tmdbController");
const streamingController = require("./controllers/streamingController");

const questionsList = [
  {
    id: 1,
    name: "Quelle durée préférez-vous pour le film?",
    options: [
      { id: 10, value: "Court (moins de 1h30)" },
      { id: 11, value: "Moyen (entre 1h30 et 2h)" },
      { id: 12, value: "Long (entre 2h et 3h)" },
    ],
  },
  {
    id: 2,
    name: "Quel genre de film?",
    options: [
      { id: 28, value: "Action" },
      { id: 35, value: "Comédie" },
      { id: 27, value: "Horreur" },
      { id: 10749, value: "Romance" },
      { id: 878, value: "Science-fiction" },
    ],
  },
  {
    id: 3,
    name: "Date de publication?",
    options: [
      { id: 30, value: "-3 ans" },
      { id: 31, value: "-5 ans" },
      { id: 32, value: "-10 ans" },
      { id: 33, value: "-20 ans" },
      { id: 34, value: "+20 ans" },
    ],
  },
  {
    id: 4,
    name: "Quelle est votre humeur ce soir ?",
    options: [
      { id: 40, value: "Légère/Distrayante" },
      { id: 41, value: "Émouvante/Intense" },
      { id: 42, value: "Stimulante/Réflexion" },
    ],
  },
  {
    id: 5,
    name: "Vous regardez avec qui ?",
    options: [
      { id: 50, value: "Seul(e)" },
      { id: 51, value: "En couple" },
      { id: 52, value: "En famille" },
      { id: 53, value: "Entre amis" },
    ],
  },
];
router.get("/questions", (req, res) => {
  res.json(questionsList);
});

// TMDB proxy routes (clé API protégée côté serveur)
router.get("/api/movies/recommendations", tmdbController.getRecommendations);
router.get("/api/movies/popular", tmdbController.getPopular);
router.get("/api/movies/score", tmdbController.getScore);
router.get("/api/movies/:movieId/trailer", tmdbController.getTrailer);
router.get("/api/movies/:movieId/streaming", streamingController.getStreaming);

router.get("/items", itemControllers.browse);
router.get("/items/:id", itemControllers.read);
router.put("/items/:id", itemControllers.edit);
router.post("/items", itemControllers.add);
router.delete("/items/:id", itemControllers.destroy);

module.exports = router;
