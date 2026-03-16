import React from "react";
import { Link } from "react-router-dom";
import logo1 from "../img/logo1.png";
import logo2 from "../img/logo2.png";
import "./Header.css";
import Modal from "./Modal";

function Header() {
  return (
    <header className="header">
      <Link to="/" aria-label="Accueil CineGenius">
        <img src={logo1} alt="CineGenius – Accueil" className="logo1" />
      </Link>
      <img src={logo2} alt="CineGenius" className="logo2" />
      <Modal />
    </header>
  );
}

export default Header;
