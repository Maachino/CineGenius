# Étude de Faisabilité — Lancement en Production de CineGenius

> **Date de l'étude :** Mars 2026
> **Projet :** CineGenius — Application de recommandation de films
> **Stack :** React 18 + Express.js + MySQL + TMDB API
> **Branch :** `claude/feasibility-study-project-7jtT8`

---

## Table des matières

1. [Résumé Exécutif](#1-résumé-exécutif)
2. [Audit Technique de l'État Actuel](#2-audit-technique-de-létat-actuel)
3. [Améliorations Techniques Prioritaires](#3-améliorations-techniques-prioritaires)
4. [Architecture Cible Production](#4-architecture-cible-production)
5. [Analyse de Marché](#5-analyse-de-marché)
6. [Faisabilité Financière](#6-faisabilité-financière)
7. [Aspects Légaux et Conformité](#7-aspects-légaux-et-conformité)
8. [Roadmap de Développement](#8-roadmap-de-développement)
9. [Analyse des Risques](#9-analyse-des-risques)
10. [KPIs et Métriques de Succès](#10-kpis-et-métriques-de-succès)
11. [Verdict Final](#11-verdict-final-de-faisabilité)

---

## 1. Résumé Exécutif

### Qu'est-ce que CineGenius ?

CineGenius est une application web de recommandation de films. L'utilisateur répond à un quiz interactif de 3 questions (durée souhaitée, genre, période de sortie) et reçoit instantanément une suggestion de film personnalisée issue de la base de données TMDB (900 000+ films). Un bouton "autre suggestion" permet de naviguer entre les recommandations correspondant aux critères, avec affichage de la bande-annonce YouTube.

### Origine du projet

Construit sur le template pédagogique React-Express-MySQL de la Wild Code School (v2.0.1). Le projet a ensuite été enrichi avec une intégration TMDB et une interface dark theme moderne pour devenir un produit fonctionnel.

### Verdict de faisabilité

| Critère | Score actuel | Score après corrections |
|---|---|---|
| Sécurité | 2/10 ❌ | 8/10 ✅ |
| Performance | 2/10 ❌ | 7/10 ✅ |
| Fonctionnalités | 4/10 ⚠️ | 6/10 ✅ |
| Qualité du code | 5/10 ⚠️ | 8/10 ✅ |
| Tests | 0/10 ❌ | 6/10 ✅ |
| Infrastructure | 4/10 ⚠️ | 8/10 ✅ |
| Conformité légale | 1/10 ❌ | 8/10 ✅ |
| **Score global** | **3/10** | **7.5/10** |

**Recommandation : ✅ GO — lancement faisable en 8-10 semaines de développement.**

Le concept est solide, différenciant et viable commercialement. Les problèmes identifiés sont tous corrigibles. Le coût de démarrage est faible (~€6-20/mois d'infrastructure) et le potentiel de revenus est réel dès 6-12 mois post-lancement.

---

## 2. Audit Technique de l'État Actuel

### 2.1 Architecture actuelle

```
[Navigateur]
    ↓ Direct (expose API key!)
[TMDB API externe]
    ↑ aussi
[Composant Movie.jsx] ←→ [React Router State]
    ↑
[Composant Quiz.jsx]
    ↓ http://localhost:5001 (hardcodé!)
[Backend Express.js]
    ↓ (non utilisé pour les films)
[MySQL (schéma inutilisé)]
```

### 2.2 Bogues bloquants

#### 🔴 CRITIQUE — Clé API TMDB exposée côté client
**Fichier :** `frontend/src/components/Movie.jsx` (lignes 65-75, 114)
```js
// PROBLÈME : La clé TMDB est visible dans le bundle JS public
const url = `https://api.themoviedb.org/3/discover/movie?api_key=${
  import.meta.env.VITE_TMDB_API_KEY   // ← visible dans DevTools + source compilée
}...`
```
**Impact :** Toute personne peut extraire la clé, dépasser le quota gratuit, entraînant une interruption de service complète.
**Solution :** Proxy toutes les requêtes TMDB via le backend Express.

---

#### 🔴 CRITIQUE — 100 requêtes TMDB par visite utilisateur
**Fichier :** `frontend/src/components/Movie.jsx` (ligne 62)
```js
const pagesToFetch = 100;   // ← 100 requêtes parallèles à chaque résultat de quiz
```
**Impact :**
- TMDB limite gratuit à 50 req/s → dépasse immédiatement avec 2+ utilisateurs simultanés
- 2000+ films chargés en mémoire navigateur (>5MB de JSON)
- Temps de chargement > 10 secondes
- Coûts API exponentiels si passage à un plan payant

**Solution :** Proxy backend avec cache Redis/mémoire (30 min) + max 3-5 pages.

---

#### 🔴 CRITIQUE — URL hardcodée localhost
**Fichier :** `frontend/src/components/Quiz.jsx` (ligne 18)
```js
fetch("http://localhost:5001/questions")   // ← Ne fonctionnera JAMAIS en production
```
**Impact :** L'application est totalement cassée en production (le quiz ne charge pas).
**Solution :** Utiliser `import.meta.env.VITE_BACKEND_URL`.

---

#### 🟠 MAJEUR — Crash si navigation directe vers /movie
**Fichier :** `frontend/src/components/Movie.jsx` (ligne 11)
```js
const { quizResponses } = location.state;   // ← TypeError si state est null
```
**Impact :** URL directe `/movie` ou refresh de page → crash total avec écran blanc.
**Solution :** Guard `if (!location.state) { navigate('/'); return null; }`

---

#### 🟠 MAJEUR — Node.js 16 (EOL depuis septembre 2023)
**Fichiers :** `frontend/Dockerfile`, `backend/Dockerfile`
```dockerfile
FROM node:16.14   # ← End-of-Life, plus de patchs sécurité
```
**Impact :** Failles de sécurité non corrigées en production.
**Solution :** Migrer vers `node:20-alpine` (LTS jusqu'à 2026).

---

#### 🟡 MINEUR — Footer vide
**Fichier :** `frontend/src/components/Footer.jsx`
```jsx
return <section>n</section>;   // ← Contenu placeholder, non fonctionnel
```
**Impact :** Absence des mentions légales obligatoires (RGPD, attribution TMDB).

---

#### 🟡 MINEUR — CORS trop permissif
**Fichier :** `backend/src/app.js`
```js
app.use(cors());   // ← Accepte toutes les origines, partout
```
**Impact :** En production, tout domaine peut appeler l'API.
**Solution :** Restreindre à `FRONTEND_URL` uniquement.

---

### 2.3 Problèmes de sécurité détaillés

| Vulnérabilité | Sévérité | Description |
|---|---|---|
| API key exposée frontend | Critique | Clé TMDB visible dans le bundle JS compilé |
| CORS non configuré | Élevée | Accepte toutes origines en production |
| Pas de rate limiting | Élevée | L'API backend peut être spammée |
| Validation inputs manquante | Moyenne | Genre/runtime/date non validés côté serveur |
| Credentials DB dans .env.sample | Moyenne | notroot/helloworld visibles publiquement |
| Migration DB destructive | Moyenne | `DROP DATABASE` sans protection en production |
| Pas de HTTPS forcé | Élevée | Requiert configuration au niveau infrastructure |

### 2.4 Problèmes de performance

| Problème | Impact | Solution |
|---|---|---|
| 100 pages TMDB/requête | Très élevé | Max 3 pages + cache 30min |
| Pas de cache | Élevé | Redis/node-cache |
| 2000+ films en RAM navigateur | Élevé | Pagination + lazy loading |
| Carousel recharge sans cache | Moyen | Cache résultat populaires (1h) |
| Pas de compression gzip | Moyen | Activer compression Express |

### 2.5 Manques fonctionnels

- ❌ Aucune authentification utilisateur
- ❌ Aucune persistence des préférences/favoris
- ❌ Aucun historique de visionnage
- ❌ Tests absents (0% de couverture)
- ❌ Base de données MySQL non utilisée pour les fonctionnalités applicatives
- ❌ Footer incomplet
- ❌ Pas de page d'erreur 404
- ❌ Pas de SEO (meta tags, Open Graph)
- ❌ Accessibilité insuffisante (aria labels manquants)

---

## 3. Améliorations Techniques Prioritaires

### Phase A — Corrections bloquantes (Semaine 1-2)

#### 3.1 Proxy TMDB côté backend (CRITIQUE)

Créer `backend/src/controllers/tmdbController.js` :
```js
// backend/src/controllers/tmdbController.js
const fetch = require('node-fetch');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 1800 }); // 30 minutes

const getRecommendations = async (req, res) => {
  const { genre, runtimeMin, runtimeMax, dateFrom, dateTo, page = 1 } = req.query;

  // Validation des paramètres
  const validGenres = [28, 35, 27, 10749, 878]; // Action, Comédie, Horreur, Romance, Sci-Fi
  if (!validGenres.includes(parseInt(genre))) {
    return res.status(400).json({ error: 'Genre invalide' });
  }

  const cacheKey = `reco_${genre}_${runtimeMin}_${runtimeMax}_${dateFrom}_${page}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  const url = `https://api.themoviedb.org/3/discover/movie?api_key=${process.env.TMDB_API_KEY}`
    + `&language=fr-FR&sort_by=popularity.desc`
    + `&with_genres=${genre}`
    + `&primary_release_date.gte=${dateFrom}`
    + `&primary_release_date.lte=${dateTo}`
    + `&with_runtime.gte=${runtimeMin}&with_runtime.lte=${runtimeMax}`
    + `&vote_average.gte=5&page=${page}`;

  const response = await fetch(url);
  const data = await response.json();

  cache.set(cacheKey, data);
  res.json(data);
};
```

Routes à ajouter dans `backend/src/router.js` :
```js
router.get('/api/movies/recommendations', tmdbController.getRecommendations);
router.get('/api/movies/popular', tmdbController.getPopular);
```

#### 3.2 Fix URL hardcodée Quiz.jsx

```js
// frontend/src/components/Quiz.jsx ligne 18
// AVANT
fetch("http://localhost:5001/questions")
// APRÈS
fetch(`${import.meta.env.VITE_BACKEND_URL}/questions`)
```

#### 3.3 Guard Movie.jsx contre null state

```js
// frontend/src/components/Movie.jsx
function Movie() {
  const navigate = useNavigate();
  const location = useLocation();

  // Guard ajouté
  if (!location.state?.quizResponses) {
    navigate('/');
    return null;
  }

  const { quizResponses } = location.state;
  // ...
}
```

#### 3.4 Réduction des requêtes TMDB

```js
// frontend/src/components/Movie.jsx
// AVANT : 100 pages (2000 films)
const pagesToFetch = 100;

// APRÈS : 3 pages max, appel via backend proxy
const fetchMovies = async () => {
  const response = await fetch(
    `${import.meta.env.VITE_BACKEND_URL}/api/movies/recommendations?` +
    `genre=${quizResponses.genre}&runtimeMin=${runtimeRange[0]}&runtimeMax=${runtimeRange[1]}` +
    `&dateFrom=${dateRange.split(',')[0]}&dateTo=${dateRange.split(',')[1]}&page=1`
  );
  const data = await response.json();
  // Fetch pages 2 et 3 pour avoir plus de choix
  const [page2, page3] = await Promise.all([...]);
};
```

#### 3.5 Upgrade Node.js 20 LTS

```dockerfile
# frontend/Dockerfile et backend/Dockerfile
# AVANT
FROM node:16.14

# APRÈS
FROM node:20-alpine AS build
```

#### 3.6 CORS configuré

```js
// backend/src/app.js
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
```

---

### Phase B — Performance & Qualité (Semaine 3-4)

#### 3.7 Cache node-cache (sans Redis)

```bash
cd backend && npm install node-cache
```

Cache intégré dans `tmdbController.js` (voir ci-dessus). TTL :
- Recommandations : 30 minutes
- Films populaires : 60 minutes

#### 3.8 Rate limiting

```bash
cd backend && npm install express-rate-limit
```

```js
// backend/src/app.js
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes par IP
  message: 'Trop de requêtes, veuillez réessayer dans 15 minutes.',
});
app.use('/api/', limiter);
```

#### 3.9 Compression gzip

```bash
cd backend && npm install compression
```

```js
// backend/src/app.js
const compression = require('compression');
app.use(compression());
```

#### 3.10 Tests (Vitest + Jest)

```bash
# Frontend
cd frontend && npm install -D vitest @testing-library/react @testing-library/jest-dom

# Backend
cd backend && npm install -D jest supertest
```

Structure de tests :
```
frontend/src/components/__tests__/
  Quiz.test.jsx         # Test quiz navigation + validation
  Movie.test.jsx        # Test guard null state + affichage
  Caroussel.test.jsx    # Test chargement données

backend/src/__tests__/
  router.test.js        # Test endpoints API
  tmdbController.test.js  # Test proxy + cache
```

---

### Phase C — Fonctionnalités Production (Semaine 5-8)

#### 3.11 Authentification JWT

```bash
cd backend && npm install jsonwebtoken bcrypt passport passport-local passport-google-oauth20
```

Tables MySQL à créer :
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),  -- NULL si auth Google
  google_id VARCHAR(255),
  username VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT REFERENCES users(id),
  token_hash VARCHAR(255),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3.12 Favoris et historique

```sql
CREATE TABLE favorites (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT REFERENCES users(id),
  movie_tmdb_id INT NOT NULL,
  movie_title VARCHAR(255),
  movie_poster_path VARCHAR(255),
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_fav (user_id, movie_tmdb_id)
);

CREATE TABLE quiz_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT REFERENCES users(id),
  genre INT,
  runtime_id INT,
  release_date VARCHAR(20),
  movie_tmdb_id INT,
  played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Routes API :
```
POST   /api/favorites          - Ajouter un favori
DELETE /api/favorites/:movieId - Supprimer un favori
GET    /api/favorites          - Liste des favoris (auth requis)
GET    /api/history            - Historique quiz (auth requis)
```

---

## 4. Architecture Cible Production

### 4.1 Diagramme d'architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Utilisateurs                          │
│              (desktop + mobile, France + monde)              │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Cloudflare (CDN + WAF)                     │
│         DDoS protection, cache statique, SSL                 │
└────────────┬──────────────────────────────┬────────────────┘
             │                              │
             ▼                              ▼
┌────────────────────┐          ┌─────────────────────────────┐
│  Frontend Static   │          │     Backend API (Express)    │
│  Vercel / CF Pages │          │  Railway / Render / CapRover │
│  React SPA (Vite)  │          │  Node.js 20, Port 5001       │
│  CDN mondial       │          │  Rate limit, CORS, Cache     │
│  GRATUIT           │          │  ~€5-12/mois                 │
└────────────────────┘          └──────────┬──────────────────┘
                                           │
                              ┌────────────┴─────────────┐
                              │                          │
                              ▼                          ▼
                   ┌──────────────────┐    ┌────────────────────┐
                   │   MySQL Database  │    │   Cache (Redis)     │
                   │  Railway / Supabase│   │  Upstash (free)    │
                   │  users, favorites │    │  TMDB responses    │
                   │  ~€0-5/mois       │    │  TTL 30-60min      │
                   └──────────────────┘    └────────────────────┘
                              │
                              ▼
                   ┌──────────────────┐
                   │   TMDB API       │
                   │  Externe, gratuit │
                   │  50 req/s max    │
                   └──────────────────┘
```

### 4.2 Options d'hébergement comparées

| Option | Frontend | Backend | DB | Prix/mois | Complexité | Recommandé |
|---|---|---|---|---|---|---|
| **Vercel + Railway** | Vercel (gratuit) | Railway ($5) | Railway (inclus) | ~€5 | Faible | ✅ Débutant |
| **Vercel + Render** | Vercel (gratuit) | Render ($7) | Render PostgreSQL ($7) | ~€14 | Faible | ✅ Bon |
| **CapRover VPS** | CapRover nginx | CapRover Node | MySQL sur VPS | €12 (VPS DO) | Moyenne | ✅ Déjà configuré |
| **Full AWS** | S3 + CloudFront | EC2/Lambda | RDS | €50-200 | Élevée | ❌ Overkill |
| **Full GCP/Azure** | Cloud Storage | Cloud Run | Cloud SQL | €30-100 | Élevée | ❌ Overkill |

**Recommandation pour lancement initial :** CapRover sur DigitalOcean (déjà configuré dans le projet via GitHub Actions) ou Vercel + Railway pour simplicité maximale.

### 4.3 Variables d'environnement cibles

**Backend (`.env.production`) :**
```env
# Server
APP_PORT=5001
NODE_ENV=production

# Frontend
FRONTEND_URL=https://cinegenie.fr

# Database
DB_HOST=your-db-host
DB_PORT=3306
DB_USER=cinegenie_user
DB_PASSWORD=strong_password_here
DB_NAME=cinegenie_production

# TMDB (côté serveur uniquement - jamais exposée au client)
TMDB_API_KEY=your_tmdb_key_here

# JWT
JWT_SECRET=very_long_random_secret_64chars_minimum
JWT_EXPIRES_IN=7d

# Google OAuth (optionnel)
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
```

**Frontend (`.env.production`) :**
```env
# Plus de VITE_TMDB_API_KEY ici après le proxy !
VITE_BACKEND_URL=https://api.cinegenie.fr
```

---

## 5. Analyse de Marché

### 5.1 Contexte du marché du streaming

- **France 2025 :** 40 millions d'internautes actifs
- **Streaming :** 71% des Français abonnés à au moins une plateforme (Médiamétrie)
- **Problème connu :** "Netflix scrolling" — les utilisateurs passent en moyenne 18 minutes à chercher quoi regarder avant d'abandonner (source : Nielsen)
- **Opportunité :** Outils de découverte rapide, guidée, sans friction

### 5.2 Analyse concurrentielle

| Plateforme | Type | Points forts | Faiblesse vs CineGenius |
|---|---|---|---|
| **IMDb** | Base de données + critiques | Exhaustivité, notoriété mondiale | Interface complexe, pas de quiz guidé, commercial |
| **AlloCiné** | Référence française | Notoriété FR, critiques presse | Pas d'outil de recommandation interactive, vieillissant |
| **Letterboxd** | Réseau social cinéphile | Communauté engagée, listes | Complexe, pas pour casual viewers, anglophone par défaut |
| **JustWatch** | Agrégateur VOD | "Où regarder ?" centralisé | N'aide pas à choisir un film, mais à le trouver |
| **Netflix Recommandations** | Algo ML | Personnalisation profonde | Limité au catalogue Netflix, algo opaque |
| **Filmstruck** | Curation éditoriale | Qualité éditoriale | Arrêt du service (racheté puis fermé) |
| **What to Watch** | Quiz simplifié | Concept similaire | Interface médiocre, peu connue en France |

### 5.3 Positionnement différenciant de CineGenius

**Proposition de valeur unique :**
> "3 clics → 1 film parfait, sans créer de compte, en français."

**Avantages concurrentiels :**
1. **Frictionless** : Quiz en 3 questions, résultat immédiat
2. **Sans inscription obligatoire** pour l'usage de base
3. **Interface minimaliste** : pas de pub envahissante, pas de scroll infini
4. **Catalogue exhaustif** : 900k+ films via TMDB (bien plus que Netflix)
5. **France-first** : langue, culture, films FR mis en avant
6. **Open source possible** : avantage de confiance + contributions

**Points de vigilance :**
- Pas de données "où regarder" (JustWatch niche complémentaire, pas concurrente)
- Recommandation par filtres, pas par ML (moins personnalisé que Netflix)
- Dépendance TMDB (risque si changement de politique)

### 5.4 Public cible et personas

**Persona 1 — "Paul le casual viewer" (segment principal)**
- 27 ans, CSP+, Paris
- Abonné Netflix + Prime Video
- Cherche un film en soirée, ne veut pas scroller 20 min
- Utilise mobile ou laptop
- Attentes : résultat rapide, pas de compte obligatoire, bande-annonce intégrée

**Persona 2 — "Sophie la famille organisée" (segment secondaire)**
- 38 ans, 2 enfants, Lyon
- Cherche un film pour une soirée famille
- Filtre par durée (2h max) et genre (aventure/comédie)
- Apprécie l'interface simple

**Persona 3 — "Marco le cinéphile occasionnel" (segment secondaire)**
- 24 ans, étudiant, Lille
- Veut découvrir des films plus anciens ou de niche
- Utilise le filtre "+20 ans"
- Susceptible de créer un compte pour sauvegarder des favoris

### 5.5 Taille de marché adressable

```
France : 40M internautes
↓ 71% consomment du streaming = 28.4M
↓ 50% cherchent des recommandations = 14.2M
↓ 30% utilisent des outils dédiés = 4.3M
↓ 20% conversion avec un outil UX supérieur = 860k

Marché adressable réaliste (12-18 mois) : 50k-500k utilisateurs actifs mensuels
```

---

## 6. Faisabilité Financière

### 6.1 Coûts d'infrastructure

#### Scénario Minimal — Lancement (0-1000 users/jour)

| Poste | Service | Coût mensuel |
|---|---|---|
| Frontend | Vercel Free | €0 |
| Backend | Railway Hobby | €5 |
| Base de données | Railway MySQL (inclus) | €0 |
| Cache | node-cache (in-memory) | €0 |
| Domaine (.fr) | OVH | €0.83 (€10/an) |
| SSL | Let's Encrypt (inclus) | €0 |
| Monitoring | UptimeRobot Free | €0 |
| Erreurs | Sentry Free | €0 |
| **Total** | | **~€6/mois** |

#### Scénario Croissance — 1000-10000 users/jour

| Poste | Service | Coût mensuel |
|---|---|---|
| Frontend | Vercel Pro ou CF Pages | €0-20 |
| Backend | Railway Pro ou Render | €7-15 |
| Base de données | Railway ou PlanetScale | €5-10 |
| Cache Redis | Upstash (10k req/day free) | €0-10 |
| Domaine + Email | OVH + Zoho Mail | €3 |
| Monitoring | Sentry Team | €26 |
| Analytics | Plausible | €9 |
| **Total** | | **~€50-93/mois** |

#### Scénario Scale — 10k+ users/jour

| Poste | Service | Coût mensuel |
|---|---|---|
| Frontend | Vercel Pro / CDN Cloudflare | €20 |
| Backend | 2x VPS DigitalOcean 4GB | €48 |
| Load balancer | DigitalOcean LB | €12 |
| Base de données | MySQL managé DO | €25 |
| Redis | Redis Cloud Standard | €15 |
| CDN images | Cloudflare | €20 |
| Monitoring complet | Datadog / Sentry | €50 |
| **Total** | | **~€190/mois** |

### 6.2 Limites TMDB API

| Tier | Limite | Prix | Requis pour |
|---|---|---|---|
| Free | 50 req/s, ~10k req/jour | Gratuit | Jusqu'à ~5000 visites/jour |
| Avec cache 30min | Réduction x10 de consommation | Gratuit | ~50000 visites/jour |
| Enterprise (si besoin) | Illimité | Sur devis | > 100k visites/jour |

**Avec cache 30 min + max 3 pages par requête :**
Chaque visite = max 6 appels TMDB (3 pages reco + 1 populaires + 2 trailers)
→ Viable gratuit jusqu'à **~1500 visites/heure** (10k requêtes / 6)

### 6.3 Modèles de revenus

#### Modèle A — Liens affiliés VOD (Recommandé, démarrage rapide)

Intégrer des liens "Regarder sur Netflix / Amazon Prime / Canal+" via l'API JustWatch ou des liens directs avec programmes d'affiliation.

| Plateforme | Commission | Facilité |
|---|---|---|
| Amazon Prime Video | 4-8% abonnement | ✅ Amazon Associates |
| Canal+ | 20-30€/abonnement | ✅ Programme partenaire |
| Apple TV+ | Variable | ⚠️ Sur demande |
| SFR/Orange VOD | Variable | ⚠️ Sur demande |

Estimation : **€0.50-2 par clic qualifié**, 2-5% de clics sur les liens VOD
→ Pour 10000 visites/mois × 3% CTR × €1 = **€300/mois**

#### Modèle B — Compte Premium (Recommandé, long terme)

Fonctionnalités gratuites :
- Quiz illimité
- Voir les suggestions de base

Fonctionnalités Premium (€3-5/mois ou €25/an) :
- Sauvegarde des favoris (illimité)
- Historique complet
- Listes personnalisées (thématiques)
- Sans publicité
- Accès à plus de genres et filtres avancés

Estimation : **5% de conversion** sur base active
→ Pour 5000 users actifs × 5% × €3/mois = **€750/mois**

#### Modèle C — Publicité display (Option)

Google AdSense en fallback si trafic suffisant
CPM France : €2-5 (cinéma/entertainment)
→ Pour 100k pages vues/mois × €3 CPM = **€300/mois**
⚠️ Impact négatif sur l'expérience utilisateur — à éviter initialement.

#### Modèle D — B2B / API (Long terme)

Exposer une API CineGenius payante pour d'autres services (blogs cinéma, apps de cinéma).
Potentiel élevé mais effort développement important. À considérer après 12 mois.

### 6.4 Projection financière sur 18 mois

| Période | Users MAU | Revenus | Charges | Résultat |
|---|---|---|---|---|
| Mois 1-2 | 0-500 | €0 | €6 | -€6 |
| Mois 3-4 | 500-2000 | €50-150 | €15 | +€35-135 |
| Mois 5-8 | 2000-8000 | €200-500 | €30-50 | +€150-450 |
| Mois 9-12 | 8000-20000 | €500-1200 | €50-90 | +€450-1100 |
| Mois 13-18 | 20000-50000 | €1200-3000 | €90-190 | +€1000-2800 |

**Seuil de rentabilité :** ~€6/mois (lancement) → atteint dès Mois 3-4

### 6.5 Budget de développement (développeur solo)

Si vous développez seul :
| Phase | Durée | Heures estimées |
|---|---|---|
| Phase 1 — Corrections critiques | 2 semaines | 40h |
| Phase 2 — Performance & Tests | 2 semaines | 40h |
| Phase 3 — Authentification + DB | 3 semaines | 60h |
| Phase 4 — Lancement + Marketing | 1 semaine | 20h |
| **Total** | **8 semaines** | **160h** |

Si externalisation (freelance React/Node, France) :
- TJM moyen : €400-600/jour (8h)
- 160h = 20 jours = **€8000-12000** pour un développeur senior

---

## 7. Aspects Légaux et Conformité

### 7.1 RGPD (Règlement Général sur la Protection des Données)

**Statut actuel : ❌ Non conforme**
**Risque : Amende CNIL jusqu'à €20M ou 4% CA mondial**

#### Obligations pour CineGenius avec comptes utilisateurs :

**Documents obligatoires à créer :**
- `/frontend/public/legal/privacy-policy.html` — Politique de confidentialité
- `/frontend/public/legal/terms-of-service.html` — CGU/CGV
- `/frontend/public/legal/legal-notice.html` — Mentions légales

**Contenu minimum de la politique de confidentialité :**
```
1. Identité du responsable de traitement (vous + adresse)
2. Données collectées : email, préférences film, historique
3. Base légale : consentement (art. 6.1.a)
4. Durée de conservation : compte actif + 3 ans
5. Droits utilisateurs : accès, rectification, effacement, portabilité
6. Contact DPO/privacy : privacy@cinegenie.fr
7. Transferts hors UE : TMDB (USA, Privacy Shield / SCC)
```

**Bannière de cookies (si analytics/pub) :**
```js
// Utiliser une solution RGPD-compliant
// Option 1 : Tarteaucitron.js (open source, français)
// Option 2 : Cookiebot (payant mais simple)
// Option 3 : Orejime (open source)
```

**Données à minimiser :**
- Ne collecter que email + préférences (pas de localisation, pas de tracking comportemental excessif)
- Anonymiser les données analytiques (Plausible/Fathom vs Google Analytics)

**Analytics RGPD-friendly recommandé :**
- [Plausible Analytics](https://plausible.io/) — €9/mois, open source, sans cookies, conforme RGPD sans bannière
- Alternative gratuite : Umami self-hosted

### 7.2 Conditions d'utilisation TMDB

**Statut actuel : ⚠️ Partiellement conforme**

**Obligations TMDB :**
1. ✅ Usage gratuit avec attribution obligatoire
2. ❌ **Logo TMDB manquant dans le footer** (violation ToS)
3. ✅ Pas de revente des données TMDB
4. ✅ Cache autorisé (30 jours max)
5. ✅ Usage commercial autorisé avec attribution

**Attribution obligatoire à ajouter dans Footer.jsx :**
```jsx
<a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
  <img
    src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
    alt="The Movie Database (TMDB)"
    width="100"
  />
</a>
<p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
```

**Formulation légale sur le site :**
> "Les données et images de films sont fournies par The Movie Database (TMDB). Ce produit utilise l'API TMDB mais n'est pas approuvé ou certifié par TMDB."

### 7.3 YouTube / Google

**Embeds YouTube :**
- ✅ Autorisés selon [YouTube ToS](https://www.youtube.com/t/terms)
- ✅ `allowFullScreen` présent dans le code
- ✅ Pas d'extraction de contenu vidéo
- ⚠️ **RGPD :** Les embeds YouTube chargent des cookies Google → consentement requis

**Solution :** Utiliser "youtube-nocookie.com" pour les embeds :
```jsx
// AVANT
src={`https://www.youtube.com/embed/${trailer}`}
// APRÈS (privacy-enhanced)
src={`https://www.youtube-nocookie.com/embed/${trailer}`}
```

### 7.4 Droits d'auteur et propriété intellectuelle

| Asset | Statut | Licence |
|---|---|---|
| Affiches films | Fournies par TMDB sous licence | Attribution TMDB requise ✅ |
| Polices Roboto/Ubuntu | Open Font License | ✅ Libre d'utilisation commerciale |
| Code source projet | MIT License | ✅ Utilisation commerciale permise |
| Logo CineGenius | À déposer ? | Envisager dépôt INPI si commercialisation |
| Nom "CineGenius" | À vérifier | Recherche d'antériorité INPI recommandée |

**Recommandation :** Avant lancement commercial, vérifier la disponibilité du nom "CineGenius" sur [INPI Marques](https://data.inpi.fr/) et déposer si disponible (~€200).

### 7.5 Accessibilité (RGAA / WCAG 2.1)

**Obligations légales (France) :**
Les sites publics et services en ligne sont soumis au RGAA. Pour un service privé non-ERP, c'est une bonne pratique mais pas obligatoire.

**Points à corriger :**
```jsx
// Bouton sans label accessible
<button onClick={refreshPage}>   // ❌ pas d'aria-label
  <span>autre suggestion</span>
</button>

// Images sans alt descriptif
<img src={poster} alt={movie.title} />  // ✅ déjà fait

// Iframe YouTube sans title
<iframe title="Bande-annonce du film" .../>  // ❌ manque title
```

### 7.6 Mentions légales obligatoires (France)

```
Éditeur : [Votre nom / société]
Siège social : [Adresse]
Email : contact@cinegenie.fr
Hébergeur : [Nom, adresse, pays]
Directeur de publication : [Votre nom]
SIRET : [Si société]
```

---

## 8. Roadmap de Développement

### Vue d'ensemble

```
Semaine 1-2    Semaine 3-4    Semaine 5-7    Semaine 8
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ Phase 1  │→  │ Phase 2  │→  │ Phase 3  │→  │ Phase 4  │
│Stabilisa-│   │Perfor-   │   │Fonction- │   │Lancement │
│tion      │   │mance &   │   │nalités   │   │          │
│          │   │Qualité   │   │          │   │          │
└──────────┘   └──────────┘   └──────────┘   └──────────┘
```

### Phase 1 — Stabilisation (Semaines 1-2) 🔴 CRITIQUE

**Objectif :** Rendre l'application sécurisée et fonctionnelle en dehors de localhost.

- [ ] **SEC-01** Proxy TMDB backend — `backend/src/controllers/tmdbController.js`
- [ ] **SEC-02** Retirer `VITE_TMDB_API_KEY` du frontend, ajouter `TMDB_API_KEY` backend
- [ ] **BUG-01** Fix URL hardcodée `Quiz.jsx:18` → `import.meta.env.VITE_BACKEND_URL`
- [ ] **BUG-02** Guard null state `Movie.jsx:11` → redirect vers `/`
- [ ] **PERF-01** Réduire 100 pages → 3 pages max avec pagination UI
- [ ] **SEC-03** CORS configuré — whitelist `FRONTEND_URL`
- [ ] **OPS-01** Upgrade Node 16 → 20 dans les deux Dockerfiles
- [ ] **UX-01** Footer complet — attribution TMDB + liens légaux
- [ ] **UX-02** `youtube-nocookie.com` pour les embeds

**Livrable :** Application déployable en production avec sécurité de base.

---

### Phase 2 — Performance & Qualité (Semaines 3-4)

**Objectif :** Rendre l'application rapide, fiable et testée.

- [ ] **PERF-02** Cache in-memory node-cache (30min reco, 60min populaires)
- [ ] **SEC-04** Rate limiting — `express-rate-limit` 100 req/15min
- [ ] **SEC-05** Validation paramètres quiz côté backend (Joi ou validation manuelle)
- [ ] **OPS-02** Compression gzip backend — `compression` middleware
- [ ] **TEST-01** Setup Vitest + React Testing Library (frontend)
- [ ] **TEST-02** Setup Jest + Supertest (backend)
- [ ] **TEST-03** Tests Quiz.jsx (navigation, validation)
- [ ] **TEST-04** Tests Movie.jsx (guard null, affichage)
- [ ] **TEST-05** Tests router.js (endpoints API)
- [ ] **TEST-06** Tests tmdbController.js (cache, proxy)
- [ ] **LEGAL-01** Pages CGU + Politique confidentialité
- [ ] **LEGAL-02** Mentions légales dans le footer
- [ ] **OPS-03** Variables d'environnement documentées dans `.env.sample`

**Livrable :** Application testée (60%+ couverture) + conforme légalement.

---

### Phase 3 — Fonctionnalités (Semaines 5-7)

**Objectif :** Ajouter les fonctionnalités différenciantes pour la rétention.

- [ ] **FEAT-01** Schéma DB v2 — tables `users`, `sessions`, `favorites`, `quiz_history`
- [ ] **FEAT-02** Authentification JWT (email/password)
- [ ] **FEAT-03** OAuth Google (Passport.js)
- [ ] **FEAT-04** Endpoints API favoris (POST/DELETE/GET)
- [ ] **FEAT-05** Interface favoris (page `/favorites`)
- [ ] **FEAT-06** Historique quiz (page `/history`)
- [ ] **FEAT-07** Page profil utilisateur (`/profile`)
- [ ] **FEAT-08** Migration DB non-destructive (scripts versionnés)
- [ ] **SEO-01** Meta tags Open Graph (titre, description, image) sur toutes les pages
- [ ] **SEO-02** Sitemap XML + robots.txt

**Livrable :** Application avec comptes utilisateurs et favoris.

---

### Phase 4 — Lancement (Semaine 8)

**Objectif :** Déployer en production et activer la monétisation.

- [ ] **OPS-04** Configuration DNS domaine (ex: cinegenie.fr)
- [ ] **OPS-05** Déploiement production (Railway + Vercel OU CapRover)
- [ ] **OPS-06** Variables d'env production configurées
- [ ] **OPS-07** Migration DB initiale
- [ ] **MON-01** Monitoring erreurs — Sentry (free tier)
- [ ] **MON-02** Uptime monitoring — UptimeRobot (free)
- [ ] **ANA-01** Analytics RGPD — Plausible ou Umami
- [ ] **REV-01** Intégration liens affiliés VOD (Amazon Associates)
- [ ] **OPS-08** Backup automatique DB (hebdomadaire minimum)
- [ ] **MKT-01** Page de présentation / landing SEO-optimisée

**Livrable :** Application en production, monitorée, avec premiers revenus.

---

### Post-lancement — Évolutions (Mois 3+)

- [ ] **v2.0** Quiz étendu (plus de genres, sous-genres, ambiance)
- [ ] **v2.1** "Soirée cinéma" — Recommandation pour 2 profils différents
- [ ] **v2.2** Internationalisation (EN, ES, IT)
- [ ] **v2.3** Mode watchlist partagée (lien partage)
- [ ] **v3.0** Recommandations ML basées sur l'historique (Collaborative Filtering)
- [ ] **v3.1** Application mobile (React Native)
- [ ] **v4.0** Intégration JustWatch API ("Où regarder ce film ?")
- [ ] **v4.1** Notifications "nouveau film dans votre style"

---

## 9. Analyse des Risques

### Matrice des risques

| # | Risque | Prob. | Impact | Score | Mitigation |
|---|---|---|---|---|---|
| R1 | Quota TMDB dépassé (sans cache) | Élevée | Critique | 🔴 | Cache 30min + max 3 pages + monitoring |
| R2 | Clé TMDB volée/exposée | Moyenne (si non fixé) | Critique | 🔴 | Proxy backend — Phase 1 |
| R3 | Node.js 16 faille 0-day | Certaine | Élevé | 🔴 | Upgrade Node 20 — Phase 1 |
| R4 | Amende CNIL (RGPD) | Moyenne | Élevé | 🟠 | CGU + politique privée — Phase 2 |
| R5 | Régressions sans tests | Élevée | Moyen | 🟠 | Tests — Phase 2 |
| R6 | TMDB change ToS/tarification | Faible | Critique | 🟠 | Architecture découplée, cache max |
| R7 | Coûts infra > revenus | Moyenne | Moyen | 🟡 | Start avec Railway gratuit, scale progressif |
| R8 | Concurrent majeur copie le concept | Faible | Élevé | 🟡 | Brand + communauté + vitesse exécution |
| R9 | Perte données (bug migration DB) | Faible | Élevé | 🟡 | Backups + migration non-destructive |
| R10 | DDoS / spam API | Moyenne | Moyen | 🟡 | Rate limiting + Cloudflare WAF |
| R11 | Nom "CineGenius" déjà déposé | Inconnue | Moyen | 🟡 | Vérification INPI + fallback name |

### Plan de mitigation détaillé

**R1 — Quota TMDB :**
```
Action immédiate : Implémenter cache node-cache (Phase 1)
Indicateur : Surveiller nb requêtes TMDB/jour via dashboard TMDB
Seuil d'alerte : > 7000 req/jour → activer throttling
Fallback : Réduire à 1 page par requête si quota à 80%
```

**R4 — RGPD :**
```
Action : Créer documents légaux avant tout utilisateur enregistré
Responsable : Vous (responsable de traitement)
Contact DPO : privacy@[domaine]
Plan de réponse incident : Notification CNIL dans 72h si data breach
```

**R6 — Dépendance TMDB :**
```
Architecture : Backend proxy facilite remplacement par autre API
Alternative : OMDb API (moins complète), Cinemagoer (Python)
Cache max : Stocker en DB les données souvent consultées
```

---

## 10. KPIs et Métriques de Succès

### 10.1 Métriques techniques (Tableau de bord infra)

| Métrique | Objectif | Outil de mesure |
|---|---|---|
| Uptime | > 99.5% | UptimeRobot |
| LCP (Largest Contentful Paint) | < 2.5s | Lighthouse / Web Vitals |
| TTFB (Time to First Byte) | < 500ms | Lighthouse |
| Temps réponse API (P95) | < 500ms | Sentry Performance |
| Taux d'erreur API | < 1% | Sentry |
| Couverture tests | > 60% | Vitest / Jest coverage |
| Core Web Vitals | Vert | Google Search Console |

### 10.2 Métriques produit (Analytics)

| Métrique | Objectif Mois 3 | Objectif Mois 12 |
|---|---|---|
| Utilisateurs actifs mensuels (MAU) | 2000 | 20000 |
| Taux complétion quiz | > 70% | > 75% |
| Taux de rebond | < 65% | < 55% |
| Durée session moyenne | > 2min | > 4min |
| Retour J+7 | > 15% | > 25% |
| Pages vues / session | > 3 | > 5 |
| Clics "autre suggestion" / session | > 2 | > 3 |

### 10.3 Métriques business

| Métrique | Objectif Mois 6 | Objectif Mois 18 |
|---|---|---|
| Revenus mensuels | > €100 | > €1000 |
| Utilisateurs Premium | 20 | 300 |
| Taux conversion gratuit → premium | > 2% | > 5% |
| CTR liens affiliés | > 2% | > 4% |
| Coût acquisition utilisateur (CAC) | < €1 | < €0.5 |
| NPS (Net Promoter Score) | > 20 | > 40 |

### 10.4 Tableau de bord recommandé

**Stack analytique (budget minimal, RGPD-compliant) :**
```
Plausible Analytics (€9/mois)
├── Trafic en temps réel
├── Sources d'acquisition
├── Comportement utilisateurs
└── Événements custom (quiz_completed, movie_favorited)

Sentry (gratuit)
├── Erreurs JavaScript
├── Performance API
└── Alertes

UptimeRobot (gratuit)
└── Ping toutes les 5 min + alertes email/SMS
```

---

## 11. Verdict Final de Faisabilité

### Synthèse

CineGenius est un projet **viable et lanceable**, avec un concept différenciant et un potentiel commercial réel sur le marché français du streaming.

### Forces du projet

1. **Concept solide** — La friction "qu'est-ce qu'on regarde ?" est un vrai problème de masse
2. **Différenciation claire** — 3 clics, sans compte, interface épurée, français natif
3. **Coût de démarrage très faible** — €6/mois d'infrastructure
4. **Stack moderne** — React + Vite + Express bien maintenu
5. **CI/CD déjà configuré** — GitHub Actions + CapRover
6. **TMDB gratuit** — Catalogue énorme sans coût initial
7. **Potentiel de revenus** — Affiliés + Premium atteignables rapidement

### Faiblesses à corriger AVANT lancement

1. ❌ **Sécurité critique** — Clé API exposée + URL hardcodée (1 semaine de travail)
2. ❌ **Performance** — 100 requêtes/visite (1 semaine)
3. ❌ **Tests absents** — Risque de régression (2 semaines)
4. ❌ **Conformité RGPD** — Manque documents légaux (1 semaine)

### Score de maturité

| Critère | Avant | Après Phase 1-2 | Après Phase 3-4 |
|---|---|---|---|
| Sécurité | 2/10 | 8/10 | 9/10 |
| Performance | 2/10 | 7/10 | 8/10 |
| Fonctionnalités | 4/10 | 5/10 | 8/10 |
| Tests | 0/10 | 6/10 | 8/10 |
| Infrastructure | 4/10 | 8/10 | 9/10 |
| Légal/RGPD | 1/10 | 7/10 | 9/10 |
| Monétisation | 0/10 | 3/10 | 7/10 |
| **Score global** | **3/10** | **6.3/10** | **8.3/10** |

### Recommandation finale

> **✅ GO — Lancement faisable en 8 semaines de développement solo**
>
> Démarrer par la Phase 1 (2 semaines) qui règle les problèmes bloquants de sécurité. L'application sera alors déployable en production sécurisée. La Phase 2 (tests + légal) est obligatoire avant toute acquisition d'utilisateurs réels. Les Phases 3-4 ajoutent la rétention et la monétisation.
>
> **Budget total estimé :**
> - Développement : 160h (solo) ou €8000-12000 (freelance)
> - Infrastructure : €6-20/mois (lancement) → €50-90/mois (croissance)
> - Domaine : €10/an
> - Analytics : €9/mois (Plausible)
>
> **Potentiel de revenus :**
> - Mois 6 : €100-300/mois (affiliés)
> - Mois 12 : €500-1500/mois (affiliés + premium)
> - Mois 18 : €1000-3000/mois
>
> **Seuil de rentabilité infra :** Mois 3-4 avec ~1000 utilisateurs actifs

---

*Étude réalisée en mars 2026 — à réviser si changement de stratégie ou de contexte marché.*

*Fichiers critiques modifiés dans cette branche :*
- `frontend/src/components/Quiz.jsx` — Fix URL hardcodée
- `frontend/src/components/Movie.jsx` — Guard null state + réduction pages TMDB
- `frontend/src/components/Footer.jsx` — Attribution TMDB + liens légaux
- `backend/src/controllers/tmdbController.js` — **NOUVEAU** : Proxy TMDB sécurisé
- `backend/src/router.js` — Routes proxy TMDB ajoutées
- `frontend/Dockerfile` — Node 16 → 20
- `backend/Dockerfile` — Node 16 → 20
