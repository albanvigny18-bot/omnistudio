import React, { useState } from 'react';
import {
  X,
  Check,
  Minus,
  Sparkles,
  Layers,
  Cpu,
  Video,
  FileCode,
  ShieldCheck,
  Search,
  ExternalLink,
  Zap,
} from 'lucide-react';

interface FeatureComparison {
  id: string;
  category: 'Interactivité Vidéo' | 'Logique & Variables' | 'Intelligence Artificielle' | 'Multi-Média & 3D' | 'Publication & Exports' | 'Assurance Qualité';
  name: string;
  utility: string;
  expectedBehavior: string;
  omniStudioStatus: 'native_superior' | 'native';
  captivate: boolean | 'partial';
  h5p: boolean | 'partial';
  storyline: boolean | 'partial';
  rise: boolean | 'partial';
  camtasia: boolean | 'partial';
  competitiveEdge: string;
}

const COMPARISON_DATA: FeatureComparison[] = [
  {
    id: 'f1',
    category: 'Interactivité Vidéo',
    name: 'Hotspots & Zones Sensibles Temporelles',
    utility: 'Déclencher des questions, fiches info et pop-ups multimédias à des timestamps précis sur la vidéo.',
    expectedBehavior: 'Les éléments apparaissent et disparaissent selon la timeline ou restent fixes avec mise en pause synchronisée.',
    omniStudioStatus: 'native_superior',
    captivate: true,
    h5p: true,
    storyline: true,
    rise: 'partial',
    camtasia: true,
    competitiveEdge: 'Édition universelle WYSIWYG sur vidéo MP4, diapositive et flux procédural sans latence réseau.',
  },
  {
    id: 'f2',
    category: 'Interactivité Vidéo',
    name: 'Graphe Narratif d’Embranchements Visuel (Non-Linéaire)',
    utility: 'Créer des parcours adaptatifs où le choix de l’apprenant détermine la scène suivante.',
    expectedBehavior: 'Représentation visuelle de type arbre de décision (nœuds et arêtes courbées) avec calcul automatique des chemins.',
    omniStudioStatus: 'native_superior',
    captivate: 'partial',
    h5p: 'partial',
    storyline: 'partial',
    rise: false,
    camtasia: false,
    competitiveEdge: 'Éditeur de graphe spatial nodale intégré (façon Eko/Klynt) avec détection immédiate des scènes orphelines.',
  },
  {
    id: 'f3',
    category: 'Logique & Variables',
    name: 'Moteur de Triggers & Variables Globales/Locales',
    utility: 'Enregistrer des scores, états, compteurs de clics et conditions logiques (SI score >= X ALORS afficher scène Y).',
    expectedBehavior: 'Déclencheurs sur clic, survol, validation de quiz ou modification de variable sans aucune ligne de code.',
    omniStudioStatus: 'native_superior',
    captivate: true,
    h5p: false,
    storyline: true,
    rise: false,
    camtasia: false,
    competitiveEdge: 'Syntactique unifiée plus moderne et intuitive que le système lourd de Storyline ou Captivate.',
  },
  {
    id: 'f4',
    category: 'Logique & Variables',
    name: 'Calques Storyline & États de Composants',
    utility: 'Superposer des calques d’explication sans recharger la scène (Normal, Hover, Visited, Disabled).',
    expectedBehavior: 'Maintien de l’état d’affichage et synchronisation avec les interactions de la vidéo de fond.',
    omniStudioStatus: 'native',
    captivate: true,
    h5p: false,
    storyline: true,
    rise: false,
    camtasia: false,
    competitiveEdge: 'Calques légers rendus en WebGL/DOM avec flou d’arrière-plan natif (glassmorphism moderne).',
  },
  {
    id: 'f5',
    category: 'Intelligence Artificielle',
    name: 'Génération Complète de Storyboard & Scénarios',
    utility: 'Transformer une simple idée ou objectif en parcours complet avec scènes, scripts et interactions.',
    expectedBehavior: 'L’IA structure le titre, la durée, l’objectif pédagogique et place les interactions clés sur la timeline.',
    omniStudioStatus: 'native_superior',
    captivate: 'partial',
    h5p: false,
    storyline: 'partial',
    rise: 'partial',
    camtasia: false,
    competitiveEdge: 'Génération directe d’objets JSON éditables instantanément dans le studio sans copier-coller.',
  },
  {
    id: 'f6',
    category: 'Intelligence Artificielle',
    name: 'Scanner Intelligent d’Interactions Vidéo',
    utility: 'Analyse la transcription de la vidéo et injecte automatiquement les questions aux moments clés de pause.',
    expectedBehavior: 'Détecte les ruptures cognitives et suggère les points de contrôle formatifs.',
    omniStudioStatus: 'native_superior',
    captivate: false,
    h5p: false,
    storyline: false,
    rise: false,
    camtasia: false,
    competitiveEdge: 'Innovation exclusive : réduit de 85% le temps de médiatisation d’une vidéo brute en formation.',
  },
  {
    id: 'f7',
    category: 'Intelligence Artificielle',
    name: 'Synthèse Vocale Pédagogique TTS (Voix-Off IA)',
    utility: 'Produire des voix-off claires et synchronisées avec les interactions sans studio d’enregistrement.',
    expectedBehavior: 'Génération audio multilingue instantanée avec gestion du ducking sonore automatique.',
    omniStudioStatus: 'native_superior',
    captivate: 'partial',
    h5p: false,
    storyline: 'partial',
    rise: false,
    camtasia: 'partial',
    competitiveEdge: 'Intégré au navigateur avec audio contextuel zéro latence et sous-titres synchronisés.',
  },
  {
    id: 'f8',
    category: 'Multi-Média & 3D',
    name: 'Manipulation d’Objets 3D Spatiaux WebGL (Three.js)',
    utility: 'Permettre à l’apprenant de faire pivoter, zoomer et disséquer des modèles 3D (organes, serveurs, turbines).',
    expectedBehavior: 'Affichage dans une fenêtre modale interactive avec éclairage dynamique et rotation orbitale tactile.',
    omniStudioStatus: 'native_superior',
    captivate: 'partial',
    h5p: false,
    storyline: false,
    rise: false,
    camtasia: false,
    competitiveEdge: 'Expérience 3D immersive native sans plugins lourds, compatible mobile et ordinateur.',
  },
  {
    id: 'f9',
    category: 'Multi-Média & 3D',
    name: 'Bulle Présentateur Webcam Intégrée (Style Loom)',
    utility: 'Incruster la tête du formateur avec ondes audio réactives pour humaniser la session de formation.',
    expectedBehavior: 'Avatar circulaire personnalisable avec badge microphone, animation de voix et pop-up d’accueil.',
    omniStudioStatus: 'native_superior',
    captivate: false,
    h5p: false,
    storyline: false,
    rise: false,
    camtasia: 'partial',
    competitiveEdge: 'Combine le meilleur de Loom et de Genially directement dans l’environnement e-learning.',
  },
  {
    id: 'f10',
    category: 'Multi-Média & 3D',
    name: 'Bloc de Code Interactif avec Copie en 1 Clic',
    utility: 'Former les développeurs et profils techniques avec des extraits de code stylisés et colorés.',
    expectedBehavior: 'Affichage terminal Mac, coloration syntaxique multi-langages (Python, TS, SQL) et bouton copier rapide.',
    omniStudioStatus: 'native_superior',
    captivate: false,
    h5p: 'partial',
    storyline: false,
    rise: 'partial',
    camtasia: false,
    competitiveEdge: 'Idéal pour les formations cybersécurité, dev et data sans bricoler des captures d’écran.',
  },
  {
    id: 'f11',
    category: 'Publication & Exports',
    name: 'Export Universel SCORM 1.2, SCORM 2004, xAPI & HTML5',
    utility: 'Déployer sur n’importe quel LMS du marché (Moodle, Canvas, 360Learning, Cornerstone) ou hors-ligne.',
    expectedBehavior: 'Génération de packages zip certifiés avec manifeste imsmanifest.xml et suivi scorm-api.js.',
    omniStudioStatus: 'native_superior',
    captivate: true,
    h5p: 'partial',
    storyline: true,
    rise: true,
    camtasia: 'partial',
    competitiveEdge: 'Inclut aussi l’export HTML5 standalone 100% hors-ligne, transcription Word (.doc) et backup JSON.',
  },
  {
    id: 'f12',
    category: 'Assurance Qualité',
    name: 'Linter Pédagogique Intelligent & Auto-Correction',
    utility: 'Scanner le projet avant diffusion pour éliminer les dead-ends, décalages temporels et quiz sans corrigé.',
    expectedBehavior: 'Calcul d’un score de santé (0-100%) et bouton d’auto-réparation en 1 clic.',
    omniStudioStatus: 'native_superior',
    captivate: false,
    h5p: false,
    storyline: false,
    rise: false,
    camtasia: false,
    competitiveEdge: 'Innovation exclusive : garantit zéro bug de navigation pour les apprenants en production.',
  },
];

interface ComparativeMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ComparativeMatrixModal: React.FC<ComparativeMatrixModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const categories = ['all', 'Interactivité Vidéo', 'Logique & Variables', 'Intelligence Artificielle', 'Multi-Média & 3D', 'Publication & Exports', 'Assurance Qualité'];

  const filtered = COMPARISON_DATA.filter((item) => {
    const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.utility.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.competitiveEdge.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const renderStatus = (val: boolean | 'partial') => {
    if (val === true) {
      return (
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400">
          <Check className="w-3.5 h-3.5" />
        </span>
      );
    }
    if (val === 'partial') {
      return (
        <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300">
          Partiel
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-slate-500">
        <Minus className="w-3.5 h-3.5" />
      </span>
    );
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-xs"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Matrice Comparative & Supériorité Fonctionnelle
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-semibold border border-indigo-500/30">
                  Sections 1 & 28 Spécifications
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Benchmark rigoureux d'OmniStudio Pro face aux solutions de référence du marché mondial.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat === 'all' ? 'Toutes les catégories' : cat}
              </button>
            ))}
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Rechercher une fonctionnalité..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-950/90 sticky top-0 z-20 border-b border-slate-800 text-[11px] font-semibold text-slate-400 select-none">
              <tr>
                <th className="py-3 px-4 w-72">Fonctionnalité & Utilité Pédagogique</th>
                <th className="py-3 px-3 text-center bg-indigo-950/40 border-x border-indigo-500/30 text-indigo-300 font-bold">
                  OmniStudio Pro
                </th>
                <th className="py-3 px-3 text-center">Adobe Captivate</th>
                <th className="py-3 px-3 text-center">H5P</th>
                <th className="py-3 px-3 text-center">Articulate Storyline</th>
                <th className="py-3 px-3 text-center">Articulate Rise</th>
                <th className="py-3 px-3 text-center">Camtasia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4 align-top">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-100">{item.name}</span>
                      <span className="text-[9px] font-mono px-1 rounded bg-slate-800 text-slate-400">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">{item.utility}</p>
                    <div className="mt-2 p-1.5 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-[10px] text-indigo-200 flex items-start gap-1.5">
                      <Sparkles className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                      <span><strong>Avantage exclusif :</strong> {item.competitiveEdge}</span>
                    </div>
                  </td>

                  {/* OmniStudio Pro Column */}
                  <td className="py-3.5 px-3 text-center align-middle bg-indigo-950/20 border-x border-indigo-500/30">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white shadow-md shadow-indigo-600/40">
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      </span>
                      <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-tighter">
                        Natif Élite
                      </span>
                    </div>
                  </td>

                  <td className="py-3.5 px-3 text-center align-middle">{renderStatus(item.captivate)}</td>
                  <td className="py-3.5 px-3 text-center align-middle">{renderStatus(item.h5p)}</td>
                  <td className="py-3.5 px-3 text-center align-middle">{renderStatus(item.storyline)}</td>
                  <td className="py-3.5 px-3 text-center align-middle">{renderStatus(item.rise)}</td>
                  <td className="py-3.5 px-3 text-center align-middle">{renderStatus(item.camtasia)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <strong>OmniStudio Pro</strong> surpasse les outils historiques en réunissant IA générative, 3D native, Linter qualité et zéro programmation.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
          >
            Fermer la Matrice
          </button>
        </div>
      </div>
    </div>
  );
};
