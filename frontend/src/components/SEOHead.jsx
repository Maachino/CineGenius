import { useEffect } from "react";
import PropTypes from "prop-types";

function updateMeta(nameOrProperty, content, isProperty = false) {
  const attr = isProperty ? "property" : "name";
  let meta = document.querySelector(`meta[${attr}="${nameOrProperty}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(attr, nameOrProperty);
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
}

/**
 * SEOHead — Met à jour dynamiquement les meta tags du <head>
 * Utilise les API DOM natives (pas de dépendance externe)
 */
function SEOHead({ title, description, ogImage }) {
  useEffect(() => {
    // Title
    const fullTitle = title
      ? `${title} — CineGenius, ton conseiller cinéma`
      : "CineGenius – Trouvez votre prochain film en 30 secondes";
    document.title = fullTitle;

    // Description
    const desc =
      description ||
      "Trouve ton prochain film en 30 secondes avec CineGenius. Quiz personnalisé, recommandations intelligentes.";
    updateMeta("description", desc);
    updateMeta("og:description", desc, true);

    // OG Title
    updateMeta("og:title", fullTitle, true);

    // OG Image
    if (ogImage) {
      updateMeta("og:image", ogImage, true);
    }

    // OG Type
    updateMeta("og:type", "website", true);
  }, [title, description, ogImage]);

  return null;
}

SEOHead.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  ogImage: PropTypes.string,
};

SEOHead.defaultProps = {
  title: null,
  description: null,
  ogImage: null,
};

export default SEOHead;
