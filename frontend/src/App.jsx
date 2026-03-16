import React from "react";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import Header from "./components/Header";
import Quiz from "./components/Quiz";
import Movie from "./components/Movie";
import Footer from "./components/Footer";
import Caroussel from "./components/Caroussel";

import "./App.css";

function NotFound() {
  const navigate = useNavigate();
  return (
    <div
      style={{
        color: "white",
        textAlign: "center",
        padding: "80px 20px",
      }}
    >
      <h1 style={{ fontSize: "80px", margin: 0 }}>404</h1>
      <p style={{ fontSize: "20px", color: "#aaa" }}>Page introuvable</p>
      <button type="button" onClick={() => navigate("/")}>
        Retour à l&apos;accueil
      </button>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Header />
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Caroussel />
                <Quiz />
              </>
            }
          />
          <Route path="/movie" element={<Movie />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
