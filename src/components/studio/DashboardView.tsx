import React, { useState, useRef } from 'react';
import { InteractiveProject } from '../../types';
import {
  Sparkles,
  Play,
  Layers,
  ShieldCheck,
  Zap,
  Users,
  ArrowRight,
  Plus,
  BookOpen,
  CheckCircle2,
  Lock,
  Heart,
  Terminal,
  Briefcase,
  TrendingUp,
  Download,
  BarChart2,
  FileText,
  Search,
  Copy,
  Trash2,
  Upload,
  History,
  Award,
  FolderOpen,
  RotateCcw,
} from 'lucide-react';
import { SAMPLE_PROJECTS } from '../../data/sampleProjects';
import { soundFX } from '../../services/soundEffects';
import {
  projectRepository,
  normalizeProject,
  ProjectVersionSnapshot,
} from '../../services/projectEngine';

interface DashboardViewProps {
  currentProject: InteractiveProject;
  onSelectProject: (project: InteractiveProject) => void;
  onOpenNewProject: () => void;
  onOpenAiStudio: () => void;
  onOpenExport: () => void;
  onOpenLearnerPlayer: () => void;
  onOpenAnalytics: () => void;
  onOpenQualityLinter: () => void;
  onOpenComparativeMatrix: () => void;
  onOpenTeamModal: () => void;
  onSwitchToStudio: () => void;
  onSwitchToGraph: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentProject,
  onSelectProject,
  onOpenNewProject,
  onOpenAiStudio,
  onOpenExport,
  onOpenLearnerPlayer,
  onOpenAnalytics,
  onOpenQualityLinter,
  onOpenComparativeMatrix,
  onOpenTeamModal,
  onSwitchToStudio,
  onSwitchToGraph,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showVersionHistoryForId, setShowVersionHistoryForId] = useState<string | null>(null);
  const [, setRefreshTick] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allProjects = projectRepository.listProjects();
  const assessments = projectRepository.getAssessments();
  const auditLogs = projectRepository.getAuditLogs();

  const filteredProjects = allProjects.filter((p) => {
    const matchesSearch =
      p.metadata.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.metadata.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.metadata.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || p.metadata.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  // Institutional Templates
  const templates = [
    {
      id: 'tmpl-cyber',
      title: 'Sensibilisation Cybersécurité & Anti-Phishing',
      category: 'Cybersecurity',
      description:
        'Mise en situation interactive avec détection de mail malveillant, embranchements d’investigation et indice clé USB.',
      icon: Lock,
      color: 'from-rose-500/20 to-indigo-500/20 text-rose-400 border-rose-500/30',
      scenesCount: 4,
      duration: '4 min',
      projectRef:
        SAMPLE_PROJECTS.find((p) => p.metadata.category === 'Cybersecurity') || SAMPLE_PROJECTS[0],
    },
    {
      id: 'tmpl-med',
      title: 'Urgences & Triage Cardiovasculaire (3D)',
      category: 'Medical',
      description:
        'Simulation clinique haute-fidélité avec auscultation, manipulation anatomique d’artère en 3D et constantes vitales.',
      icon: Heart,
      color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
      scenesCount: 3,
      duration: '3 min',
      projectRef:
        SAMPLE_PROJECTS.find((p) => p.metadata.category === 'Medical') || SAMPLE_PROJECTS[0],
    },
    {
      id: 'tmpl-code',
      title: 'Tutoriel Technique & Architecture Logicielle',
      category: 'Engineering',
      description:
        'Formation pour développeurs avec terminal interactif, bloc de code syntaxé, copie 1 clic et présentateur Loom incrusté.',
      icon: Terminal,
      color: 'from-indigo-500/20 to-cyan-500/20 text-indigo-400 border-indigo-500/30',
      scenesCount: 4,
      duration: '5 min',
      projectRef: SAMPLE_PROJECTS[0],
    },
    {
      id: 'tmpl-business',
      title: 'Conformité Réglementaire & Entretien Conseil',
      category: 'Business',
      description:
        'Module d’intégration commerciale avec sondage de posture Likert, questionnaire sommatif et certification SCORM.',
      icon: Briefcase,
      color: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30',
      scenesCount: 3,
      duration: '4 min',
      projectRef: SAMPLE_PROJECTS[0],
    },
  ];

  const totalInteractions = (currentProject.scenes || []).reduce(
    (sum, sc) => sum + (sc.interactions || []).length,
    0
  );

  const handleImportProjectJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const normalized = normalizeProject(parsed);
        projectRepository.saveProject(normalized, {
          createSnapshot: true,
          snapshotLabel: 'Importation de fichier JSON natif',
        });
        projectRepository.logAudit(
          'IMPORT_PROJECT',
          `Projet importé depuis ${file.name} ("${normalized.metadata.title}")`,
          normalized.metadata.id
        );
        soundFX.playCorrect();
        onSelectProject(normalized);
        setRefreshTick((t) => t + 1);
      } catch (err) {
        alert('Fichier JSON de projet invalide.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDuplicate = (projectId: string) => {
    const duplicated = projectRepository.duplicateProject(projectId);
    if (duplicated) {
      soundFX.playClick();
      onSelectProject(duplicated);
      setRefreshTick((t) => t + 1);
    }
  };

  const handleDeleteConfirmed = (projectId: string) => {
    const ok = projectRepository.deleteProject(projectId);
    setConfirmDeleteId(null);
    if (ok) {
      soundFX.playClick();
      const remaining = projectRepository.listProjects();
      if (currentProject.metadata.id === projectId && remaining.length > 0) {
        onSelectProject(remaining[0]);
      }
      setRefreshTick((t) => t + 1);
    }
  };

  const versionsForModal: ProjectVersionSnapshot[] = showVersionHistoryForId
    ? projectRepository.getProjectVersions(showVersionHistoryForId)
    : [];

  return (
    <div className="flex-1 h-full bg-slate-950 overflow-y-auto p-8 select-none space-y-8 scrollbar-thin">
      {/* Hidden JSON File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleImportProjectJson}
        className="hidden"
      />

      {/* 1. Hero Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-white tracking-tight">
              Tableau de Bord OmniStudio Pro
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-mono font-bold border border-indigo-500/30">
              SaaS v3.2 Enterprise
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Plateforme tout-en-un de conception, production, scénarisation et diffusion d'expériences interactives assistée par IA (Captivate, H5P, Storyline 360, Camtasia).
          </p>
        </div>

        {/* Top Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              soundFX.playClick();
              onOpenNewProject();
            }}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nouveau Projet</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-medium text-xs flex items-center gap-1.5 transition-colors"
            title="Importer un projet au format natif JSON"
          >
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>Importer JSON</span>
          </button>

          <button
            onClick={() => {
              soundFX.playClick();
              onOpenAiStudio();
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-indigo-500/40 text-indigo-300 font-semibold text-xs flex items-center gap-2 transition-all hover:border-indigo-400"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Générer avec l'IA</span>
          </button>

          <button
            onClick={() => {
              soundFX.playClick();
              onOpenQualityLinter();
            }}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-medium text-xs flex items-center gap-1.5 transition-colors"
            title="Lancer l'audit qualité pré-publication"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Audit Qualité</span>
          </button>

          <button
            onClick={() => {
              soundFX.playClick();
              onOpenComparativeMatrix();
            }}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-medium text-xs flex items-center gap-1.5 transition-colors"
            title="Matrice comparative face à Captivate, H5P et Storyline"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Matrice Comparative</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics & Active Project Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Project Highlight Card */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-indigo-950/30 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-bold px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30">
                Projet Actif · v{currentProject.metadata.version}
              </span>
              <span className="text-xs font-mono text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Persistance Locale & Serveur Active
              </span>
            </div>

            <h2 className="text-lg font-bold text-white mt-3">{currentProject.metadata.title}</h2>
            <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
              {currentProject.metadata.description}
            </p>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-4 gap-3 py-3 border-y border-slate-800/80 text-xs">
            <div>
              <span className="text-slate-500 text-[10px] block">Scènes totales</span>
              <strong className="text-slate-200 font-mono text-sm">
                {(currentProject.scenes || []).length}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Interactions actives</span>
              <strong className="text-indigo-300 font-mono text-sm">{totalInteractions}</strong>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Score de validation</span>
              <strong className="text-emerald-400 font-mono text-sm">
                {currentProject.scormSettings.passingScorePercent}%
              </strong>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Format LMS</span>
              <strong className="text-slate-200 font-mono text-sm">
                SCORM {currentProject.scormSettings.scormVersion}
              </strong>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={() => {
                soundFX.playClick();
                onSwitchToStudio();
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/30 transition-transform active:scale-95"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Ouvrir dans l'Éditeur Studio</span>
            </button>

            <button
              onClick={() => {
                soundFX.playClick();
                onSwitchToGraph();
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center gap-1.5 transition-colors"
            >
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
              <span>Graphe Narratif</span>
            </button>

            <button
              onClick={() => {
                soundFX.playClick();
                onOpenLearnerPlayer();
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-medium text-xs flex items-center gap-1.5 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Tester la Lecture</span>
            </button>

            <button
              onClick={() => {
                soundFX.playClick();
                onOpenExport();
              }}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter / Publier</span>
            </button>

            <button
              onClick={() => setShowVersionHistoryForId(currentProject.metadata.id)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-medium text-xs flex items-center gap-1.5 transition-colors"
            >
              <History className="w-3.5 h-3.5" />
              <span>Versions</span>
            </button>
          </div>
        </div>

        {/* Global Activity & Health Overview Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Indicateurs de Formation & Qualité
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Conformité WCAG 2.2 AA, SCORM & suivi des sessions
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Santé Pédagogique</p>
                  <p className="text-[10px] text-slate-400">Audit structurel & accessibilité</p>
                </div>
              </div>
              <button
                onClick={onOpenQualityLinter}
                className="text-xs font-bold text-emerald-400 hover:underline"
              >
                Inspecter
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Sessions Apprenants</p>
                  <p className="text-[10px] text-slate-400">
                    {assessments.length} session(s) enregistrée(s)
                  </p>
                </div>
              </div>
              <button
                onClick={onOpenAnalytics}
                className="text-xs font-bold text-indigo-400 hover:underline"
              >
                Statistiques
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Équipe & Réviseurs</p>
                  <p className="text-[10px] text-slate-400">Rôles RBAC & validations</p>
                </div>
              </div>
              <button
                onClick={onOpenTeamModal}
                className="text-xs font-bold text-amber-400 hover:underline"
              >
                Gérer
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Projets sauvegardés : {allProjects.length}</span>
            <span className="font-mono text-emerald-400">Synchronisé</span>
          </div>
        </div>
      </div>

      {/* 3. Full Project Repository Management (Search, Filter, Duplicate, Delete, Versions) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-indigo-400" />
              <span>Mes Projets Enregistrés ({filteredProjects.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Gérez le cycle de vie complet de vos projets : recherche, duplication, historique des versions et suppression sécurisée.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un projet..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:border-indigo-500 outline-none w-52"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 outline-none"
            >
              <option value="ALL">Toutes catégories</option>
              <option value="Medical">Médical</option>
              <option value="Cybersecurity">Cybersécurité</option>
              <option value="Engineering">Ingénierie</option>
              <option value="Business">Business / Conformité</option>
              <option value="Custom">Personnalisé</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((proj) => {
            const isCurrent = proj.metadata.id === currentProject.metadata.id;
            const scCount = (proj.scenes || []).length;
            const intCount = (proj.scenes || []).reduce(
              (acc, s) => acc + (s.interactions || []).length,
              0
            );

            return (
              <div
                key={proj.metadata.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                  isCurrent
                    ? 'bg-indigo-950/25 border-indigo-500/60 shadow-lg shadow-indigo-500/10'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {proj.metadata.category}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      v{proj.metadata.version} · {proj.metadata.createdDate}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white mt-2 truncate">
                    {proj.metadata.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    {proj.metadata.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>
                    {scCount} scènes · {intCount} interactions
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        onSelectProject(proj);
                        onSwitchToStudio();
                      }}
                      className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-sans font-semibold text-[10px]"
                    >
                      Ouvrir
                    </button>
                    <button
                      onClick={() => handleDuplicate(proj.metadata.id)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title="Dupliquer ce projet"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setShowVersionHistoryForId(proj.metadata.id)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300"
                      title="Historique des versions"
                    >
                      <History className="w-3 h-3" />
                    </button>
                    {allProjects.length > 1 && (
                      <button
                        onClick={() => setConfirmDeleteId(proj.metadata.id)}
                        className="p-1 rounded bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300"
                        title="Supprimer ce projet"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Institutional Templates Library */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>Modèles Institutionnels & Scénarios Réutilisables</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Formations certifiantes pré-configurées avec vidéos, embranchements décisionnels et questionnaires SCORM.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {templates.map((tmpl) => {
            const IconComponent = tmpl.icon;
            return (
              <div
                key={tmpl.id}
                className={`p-5 rounded-2xl bg-slate-900 border transition-all hover:scale-[1.02] flex flex-col justify-between space-y-4 ${tmpl.color}`}
              >
                <div className="space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-slate-950/80 border border-white/10 flex items-center justify-center">
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-white leading-snug">{tmpl.title}</h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-3">
                    {tmpl.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <div className="text-[10px] font-mono text-slate-400">
                    <span>{tmpl.scenesCount} scènes</span> · <span>{tmpl.duration}</span>
                  </div>
                  <button
                    onClick={() => {
                      soundFX.playTransition();
                      onSelectProject(tmpl.projectRef);
                      onSwitchToStudio();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-[11px] flex items-center gap-1 transition-colors"
                  >
                    <span>Charger</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Recent Learner Assessments & Audit Trail */}
      {assessments.length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>Derniers Résultats d'Apprenants & Certificats Délivrés</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              {assessments.length} session(s) enregistrée(s)
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {assessments.slice(0, 3).map((rec) => (
              <div
                key={rec.recordId}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-100 truncate w-44">{rec.projectTitle}</p>
                  <p className="text-[10px] text-slate-400">
                    {rec.learnerName} · Score :{' '}
                    <strong className={rec.passed ? 'text-emerald-400' : 'text-amber-400'}>
                      {rec.percentage}%
                    </strong>
                  </p>
                  {rec.certificateId && (
                    <span className="text-[9px] font-mono text-indigo-300 block mt-0.5">
                      {rec.certificateId}
                    </span>
                  )}
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    rec.passed
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {rec.passed ? 'RÉUSSI' : 'À REVOIR'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Document to Course Conversion Banner (Section 9.2) */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">
                Transformer un Document (PDF, Word, PPT) en Formation Interactive
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Section 16 IA
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
              Collez le texte d'une procédure ou importez vos cours. L'IA extrait automatiquement les objectifs clés, découpe le parcours en scènes et injecte les points de contrôle formatifs.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            soundFX.playClick();
            onOpenAiStudio();
          }}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 shrink-0 transition-transform active:scale-95"
        >
          <Sparkles className="w-4 h-4" />
          <span>Ouvrir l'Assistant Document</span>
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white">Confirmer la suppression du projet</h3>
            <p className="text-slate-300 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer ce projet ? Cette opération est journalisée dans le registre d'audit de sécurité.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteConfirmed(confirmDeleteId)}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold"
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionHistoryForId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Historique des Versions & Restauration
                </h3>
              </div>
              <button
                onClick={() => setShowVersionHistoryForId(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {versionsForModal.length === 0 ? (
              <p className="text-slate-400 py-6 text-center">
                Aucun instantané de version enregistré pour ce projet pour le moment. Cliquez sur « Créer un instantané » ci-dessous.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {versionsForModal.map((ver) => (
                  <div
                    key={ver.versionId}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-300">
                          v{ver.versionNumber}
                        </span>
                        <span className="font-semibold text-slate-100">{ver.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Par {ver.author} · {new Date(ver.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const restored = projectRepository.restoreVersionSnapshot(
                          ver.projectId,
                          ver.versionId
                        );
                        if (restored) {
                          soundFX.playCorrect();
                          onSelectProject(restored);
                          setShowVersionHistoryForId(null);
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/40 font-semibold text-[11px] flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restaurer</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  const targetProj =
                    projectRepository.getProject(showVersionHistoryForId) || currentProject;
                  projectRepository.createVersionSnapshot(
                    targetProj,
                    'Point de restauration manuel',
                    targetProj.metadata.author
                  );
                  soundFX.playCorrect();
                  setRefreshTick((t) => t + 1);
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold"
              >
                + Créer un instantané de version
              </button>
              <button
                onClick={() => setShowVersionHistoryForId(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
