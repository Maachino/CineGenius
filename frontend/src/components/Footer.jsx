import React from "react";
import "./Footer.css";

function Footer() {
  return (
    <footer className="Footer">
      <div className="footer-content">
        <div className="footer-legal">
          <a href="/legal/mentions-legales" className="footer-link">
            Mentions légales
          </a>
          <span className="footer-separator">|</span>
          <a href="/legal/politique-confidentialite" className="footer-link">
            Politique de confidentialité
          </a>
          <span className="footer-separator">|</span>
          <a href="/legal/cgu" className="footer-link">
            CGU
          </a>
          <span className="footer-separator">|</span>
          <a href="mailto:contact@cinegenie.fr" className="footer-link">
            Contact
          </a>
        </div>
        <div className="footer-tmdb">
          <a
            href="https://www.themoviedb.org"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-tmdb-link"
          >
            <img
              src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
              alt="The Movie Database (TMDB)"
              className="footer-tmdb-logo"
              width="80"
            />
          </a>
          <p className="footer-tmdb-notice">
            Ce produit utilise l&apos;API TMDB mais n&apos;est pas approuvé ou certifié par TMDB.
          </p>
        </div>
        <p className="footer-copyright">
          © {new Date().getFullYear()} CineGenius — Tous droits réservés
        </p>
      </div>
    </footer>
  );
}
export default Footer;
