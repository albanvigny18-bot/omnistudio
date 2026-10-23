# OMNISTUDIO INTERACTIVE VIDEO — CAHIER DES CHARGES, ARCHITECTURE LOGICIELLE, MODÈLE DE DONNÉES ET LIVRABLES DE PRODUCTION

**Version du format natif :** `2.0.0`  
**Conformité standards :** SCORM 1.2, SCORM 2004 (4th Ed.), xAPI / cmi5, HTML5 autonome, WCAG 2.2 AA, Loi 25 (Québec) / RGPD.

---

## 1. MATRICE COMPARATIVE DES SOLUTIONS DE RÉFÉRENCE (SECTION 4)

| Fonctionnalité | Adobe Captivate | Articulate Storyline 360 | Articulate Rise 360 | H5P | Camtasia | **OmniStudio Pro (Notre Solution)** | Priorité & Statut |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Création de vidéos interactives** | Oui (lourd, client lourd) | Oui (orienté diapositives) | Basique (blocs linéaires) | Oui (limité au lecteur H5P) | Basique (hotspots simples) | **Oui (Studio Web WYSIWYG + Vidéo HTML5 + Scènes procédurales + 3D WebGL)** | **P0 — Implémenté & Testé** |
| **Interactions temporelles multipistes** | Oui | Oui | Non | Non (marqueurs simples) | Oui (montage linéaire) | **Oui (Timeline multipiste avec glisser-déposer et redimensionnement de durée)** | **P0 — Implémenté & Testé** |
| **Quiz & Évaluations diversifiées** | QCM, V/F, Drag&Drop | Complet | QCM basiques | Riche mais rigide | Quiz simples | **QCM simple/multiple, Vrai/Faux, Séquence ordonnée, Glisser-déposer, Zone sensible, Likert** | **P0 — Implémenté & Testé** |
| **Moteur de variables, événements & conditions** | Avancé (complexe) | Très avancé (Triggers) | Non | Non | Non | **Moteur indépendant typé (`==`, `!=`, `>`, `<`, `>=`, `<=`), actions sécurisées & garde anti-boucle** | **P0 — Implémenté & Testé** |
| **Embranchements & Graphe narratif** | Vue arborescente | Story View | Linéaire uniquement | Branching Scenario séparé | Non | **Graphe nodal visuel interactif + création/suppression de liens + détection de boucles et dead-ends** | **P0 — Implémenté & Testé** |
| **Audit Qualité & Linter Pédagogique** | Non | Non | Non | Non | Non | **Linter temps réel (scènes orphelines, dead-ends, débordements temporels, variables, WCAG) + Auto-Fix 1 clic** | **P0 — Implémenté & Testé** |
| **Assistant IA & Transformation Document → Cours** | Partiel | Articulate AI | Articulate AI | Non | Audiate (voix) | **Génération de storyboard, transformation Document → Formation, scan vidéo IA, génération de quiz, TTS & traduction** | **P0 — Implémenté (avec adaptateur Gemini + mode dégradé vérifiable)** |
| **Exports LMS & Interopérabilité** | SCORM, xAPI | SCORM, xAPI, cmi5 | SCORM, xAPI | .h5p | MP4, SCORM basique | **SCORM 1.2 (.zip), SCORM 2004 4e éd. (.zip), HTML5 autonome, Word (.doc), JSON natif versionné** | **P0 — Implémenté & Testé** |
| **Collaboration, Versions & Journal d'Audit** | Partage fichiers | Review 360 | Co-édition | Non | TechSmith Review | **Gestion d'équipe RBAC, commentaires horodatés, historique de versions restaurable & journal d'audit** | **P1 — Implémenté & Testé** |

---

## 2. ARCHITECTURE TECHNIQUE MODULAIRE (SECTIONS 5 & 30)

L'application adopte une architecture **monolithe modulaire full-stack TypeScript** découplée en trois couches strictes :

1. **Couche Présentation & Studio Visuel (`src/components/`) :**
   - `DashboardView.tsx` : Gestion complète du cycle de vie des projets (recherche, filtre, création, duplication, import/export JSON, suppression avec confirmation, historique de versions, résultats d'évaluation et certificats).
   - `CanvasStage.tsx` : Scène centrale WYSIWYG (manipulation directe par glisser-déposer, ajout contextuel au clic, lecteur vidéo HTML5 / diapositive / WebGL 3D).
   - `TimelineMultiTrack.tsx` : Timeline multipiste synchronisée (Signets/Chapitres, Piste Vidéo, Piste Overlays/Hotspots, Piste Quiz/Pauses, Piste 3D/Avancé).
   - `PropertiesInspector.tsx` : Inspecteur contextuel à 3 onglets (Propriétés visuelles & actions, Déclencheurs/Triggers conditionnels, Dictionnaire de Variables).
   - `SceneNodeGraph.tsx` : Éditeur graphique nodal des embranchements avec détection en direct des scènes orphelines, culs-de-sac et boucles.
   - `QualityLinterModal.tsx` : Moteur d'audit pédagogique, technique et d'accessibilité WCAG avec auto-correction.
   - `LearnerPlayerModal.tsx` : Lecteur interactif apprenant exécutant le même modèle de projet et le même moteur de règles que l'éditeur.

2. **Couche Métier, Moteur de Règles & Persistance (`src/services/`) :**
   - `projectEngine.ts` :
     - Normalisation défensive (`normalizeProject`) et validation structurelle/graphe (`validateProjectSchema` avec BFS/DFS).
     - Moteur d'évaluation de conditions (`evaluateCondition`) et d'exécution de règles (`executeTriggersForEvent`) sans `eval()`, protégé contre les boucles infinies (`MAX_RULE_EXECUTION_STEPS = 25`).
     - Dépôt de projets (`ProjectRepository`) assurant la persistance locale (`localStorage`) et la synchronisation serveur (`/api/projects`, `/api/assessments`), le versionnement (`createVersionSnapshot`, `restoreVersionSnapshot`) et la traçabilité (`AuditLogEntry`).
   - `exportService.ts` : Génération de paquets conformes SCORM 1.2, SCORM 2004, HTML5 autonome, transcription Word `.doc` et sauvegarde JSON.
   - `geminiService.ts` : Couche d'abstraction IA vers le backend Express (`/api/gemini/*`).

3. **Couche Backend & API (`server.ts`) :**
   - Serveur Express.js exposant les adaptateurs IA (`/api/gemini/storyboard`, `/api/gemini/document-to-course`, `/api/gemini/scan-interactions`, `/api/gemini/quiz`, `/api/gemini/adaptive-feedback`, `/api/gemini/tts`, `/api/gemini/translate`) avec bascule explicite et documentée lorsque `GEMINI_API_KEY` n'est pas configurée.
   - API REST de persistance (`/api/health`, `/api/projects`, `/api/assessments`) stockant les données sur disque (`data/server_store.json`) et prête à être connectée à PostgreSQL / S3 en production.

---

## 3. MODÈLE DE DONNÉES RELATIONNEL CIBLE — POSTGRESQL (SECTION 31)

Pour un déploiement multi-organisations à grande échelle, le schéma relationnel normalisé couvre les 33 entités requises avec isolation par `organization_id` :

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  data_residency_region VARCHAR(64) NOT NULL DEFAULT 'ca-central-1', -- Conformité Loi 25 Québec
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE roles (
  id VARCHAR(64) PRIMARY KEY, -- 'admin', 'owner', 'designer', 'editor', 'reviewer', 'learner'
  permissions JSONB NOT NULL
);

CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workspace_members (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id VARCHAR(64) NOT NULL REFERENCES roles(id),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE projects (
  id VARCHAR(128) PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(64) NOT NULL,
  description TEXT,
  author VARCHAR(255),
  schema_version VARCHAR(32) NOT NULL DEFAULT '2.0.0',
  start_scene_id VARCHAR(128) NOT NULL,
  scorm_settings JSONB NOT NULL,
  gamification_config JSONB NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'draft', -- 'draft', 'published', 'archived'
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_versions (
  version_id VARCHAR(128) PRIMARY KEY,
  project_id VARCHAR(128) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version_number VARCHAR(32) NOT NULL,
  label VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  project_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE scenes (
  id VARCHAR(128) PRIMARY KEY,
  project_id VARCHAR(128) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  duration NUMERIC(8,2) NOT NULL DEFAULT 30,
  video_url TEXT,
  video_type VARCHAR(32) NOT NULL DEFAULT 'standard',
  media_mode VARCHAR(32) NOT NULL DEFAULT 'video',
  learning_objective TEXT NOT NULL,
  graph_x INTEGER NOT NULL DEFAULT 100,
  graph_y INTEGER NOT NULL DEFAULT 100,
  position_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE scene_connections (
  id VARCHAR(128) PRIMARY KEY,
  project_id VARCHAR(128) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_scene_id VARCHAR(128) NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  to_scene_id VARCHAR(128) NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  label VARCHAR(255) NOT NULL,
  pedagogical_impact TEXT
);

CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  original_filename VARCHAR(512) NOT NULL,
  mime_type VARCHAR(128) NOT NULL,
  size_bytes BIGINT NOT NULL,
  storage_key_original TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE media_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  profile VARCHAR(64) NOT NULL, -- '1080p_mp4', '720p_webm', 'thumbnail_webp', 'captions_vtt'
  storage_key TEXT NOT NULL
);

CREATE TABLE interactive_components (
  id VARCHAR(128) PRIMARY KEY,
  scene_id VARCHAR(128) NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  timestamp_sec NUMERIC(8,2) NOT NULL,
  duration_sec NUMERIC(8,2) NOT NULL DEFAULT 8,
  pause_on_trigger BOOLEAN NOT NULL DEFAULT FALSE,
  x_percent NUMERIC(5,2) NOT NULL,
  y_percent NUMERIC(5,2) NOT NULL,
  width_percent NUMERIC(5,2) NOT NULL,
  height_percent NUMERIC(5,2) NOT NULL,
  style_variant VARCHAR(32) NOT NULL DEFAULT 'glass',
  payload JSONB NOT NULL,
  triggers JSONB NOT NULL DEFAULT '[]'
);

CREATE TABLE learning_sessions (
  session_id VARCHAR(128) PRIMARY KEY,
  project_id VARCHAR(128) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  learner_name VARCHAR(255) NOT NULL,
  score NUMERIC(6,2) NOT NULL,
  max_score NUMERIC(6,2) NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  passed BOOLEAN NOT NULL,
  certificate_id VARCHAR(128) UNIQUE,
  time_spent_seconds INTEGER NOT NULL,
  visited_scenes JSONB NOT NULL,
  answers_given JSONB NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id VARCHAR(128) PRIMARY KEY,
  organization_id UUID,
  actor VARCHAR(255) NOT NULL,
  role VARCHAR(128) NOT NULL,
  action VARCHAR(128) NOT NULL,
  project_id VARCHAR(128),
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 4. SÉCURITÉ, PROTECTION DES DONNÉES ET CONFORMITÉ LOI 25 QUÉBEC (SECTION 29)

1. **Aucune exécution de code arbitraire :** Le moteur de règles (`src/services/projectEngine.ts`) évalue uniquement une liste blanche d'opérateurs (`==`, `!=`, `>`, `<`, `>=`, `<=`) et d'actions typées. `eval()` et `new Function()` sont strictement proscrits.
2. **Protection contre le déni de service logique :** Chaque cycle d'évaluation de déclencheurs est borné par `MAX_RULE_EXECUTION_STEPS = 25` et le validateur détecte les cycles orientés (DFS) avant la publication.
3. **Conformité Loi 25 (Québec) & RGPD :**
   - Minimisation des renseignements personnels : les sessions d'apprentissage peuvent fonctionner avec un identifiant pseudonymisé.
   - Hébergement recommandable en région canadienne (`ca-central-1` Montréal) pour les organismes publics et entreprises québécoises.
   - Clé API IA isolée côté serveur (`server.ts`) : aucune clé secrète n'est exposée au navigateur client.
   - Journalisation d'audit (`AuditLogEntry`) pour chaque création, duplication, restauration de version, suppression et évaluation.

---

## 5. MODÈLE ÉCONOMIQUE ET ESTIMATION DES COÛTS D'EXPLOITATION (SECTION 36)

| Poste de Coût | Infrastructure / Service | Coût Mensuel Estimé (1 000 créateurs / 25 000 apprenants) | Stratégie de Maîtrise & Quotas |
| :--- | :--- | :--- | :--- |
| **Hébergement Application & API** | Conteneurs Node.js (2x vCPU, 4 Go RAM, Auto-scaling) | ~60 $ – 120 $ USD / mois | Mise en cache des projets publiés |
| **Base de données relationnelle** | PostgreSQL managé (Haute disponibilité + sauvegardes quotidiennes) | ~45 $ – 90 $ USD / mois | Indexation JSONB et purge des sessions expirées |
| **Stockage Objet & Diffusion Vidéo** | S3 + CDN (CloudFront / Cloudflare R2 sans frais d'egress) | ~25 $ – 80 $ USD / mois | Téléversement direct par URL pré-signée, encodage adaptatif |
| **Services IA (Texte, Storyboard, Quiz)** | Gemini Flash (`@google/genai`) | ~15 $ – 50 $ USD / mois | Troncature des documents à 10 000 caractères par requête, cache par hash |
| **Synthèse Vocale (TTS) & Traduction** | Gemini Audio / Web Speech API natif | ~0 $ – 30 $ USD / mois | Bascule automatique sur Web Speech API local pour la prévisualisation |

---

## 6. INSTRUCTIONS DE LANCEMENT, DE TEST ET DE DÉPLOIEMENT (SECTIONS 35 & 38)

### Lancement local
```bash
# 1. Installer les dépendances
npm install

# 2. Configurer les variables d'environnement (optionnel : fonctionne aussi en mode autonome)
cp .env.example .env
# Renseigner GEMINI_API_KEY=... dans .env pour activer l'IA générative distante

# 3. Lancer le serveur de développement full-stack (Express + Vite HMR sur le port 3000)
npm run dev
```

### Exécution des tests automatisés et de la vérification de types
```bash
# Vérification statique TypeScript
npm run lint

# Exécution de la suite de tests unitaires, d'intégration et du parcours E2E en 20 étapes
npm test

# Compilation de production
npm run build
```
