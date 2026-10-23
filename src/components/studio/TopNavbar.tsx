import React from 'react';
import { InteractiveProject } from '../../types';
import {
  Play,
  Sparkles,
  Download,
  GitBranch,
  Layers,
  ChevronDown,
  LayoutDashboard,
  ShieldCheck,
  Zap,
  Users,
  Undo2,
  Redo2,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { projectRepository } from '../../services/projectEngine';

interface TopNavbarProps {
  currentProject: InteractiveProject;
  onSelectProject: (project: InteractiveProject) => void;
  onOpenNewProjectModal: () => void;
  activeView: 'dashboard' | 'studio' | 'graph';
  onChangeView: (view: 'dashboard' | 'studio' | 'graph') => void;
  onOpenAiStudio: () => void;
  onOpenExport: () => void;
  onOpenAnalytics: () => void;
  onOpenLearnerPlayer: () => void;
  onOpenQualityLinter: () => void;
  onOpenComparativeMatrix: () => void;
  onOpenTeamModal: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onManualSave?: () => void;
  saveStatusText?: string;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  currentProject,
  onSelectProject,
  onOpenNewProjectModal,
  activeView,
  onChangeView,
  onOpenAiStudio,
  onOpenExport,
  onOpenLearnerPlayer,
  onOpenQualityLinter,
  onOpenComparativeMatrix,
  onOpenTeamModal,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onManualSave,
  saveStatusText = 'Sauvegardé',
}) => {
  const allProjects = projectRepository.listProjects();

  return (
    <header className="h-14 px-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between gap-4 z-30 select-none">
      {/* Zone 1: Brand + Project Switcher + Undo/Redo/Save */}
      <div className="flex items-center gap-2.5 shrink-0">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onChangeView('dashboard');
          }}
          className="text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
          <span>OmniStudio</span>
        </a>

        {/* Project Switcher */}
        <div className="relative group ml-1">
          <button className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium flex items-center gap-1.5 hover:border-slate-700 transition-colors">
            <span className="truncate max-w-[140px]">{currentProject.metadata.title}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <div className="absolute top-full left-0 mt-1 w-72 p-1 rounded-xl glass-dropdown shadow-2xl hidden group-hover:block z-50 bg-slate-900 border border-slate-800">
            <div className="px-2.5 py-1.5 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
              Projets Enregistrés ({allProjects.length})
            </div>
            <div className="max-h-60 overflow-y-auto">
              {allProjects.map((p) => (
                <button
                  key={p.metadata.id}
                  onClick={() => onSelectProject(p)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                    p.metadata.id === currentProject.metadata.id
                      ? 'bg-indigo-600/30 text-indigo-200 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{p.metadata.title}</span>
                  <span className="text-[10px] font-mono text-slate-400 ml-2 shrink-0">
                    {p.metadata.category}
                  </span>
                </button>
              ))}
            </div>

            <div className="border-t border-slate-800 mt-1 pt-1">
              <button
                onClick={onOpenNewProjectModal}
                className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-indigo-400 hover:bg-indigo-950/40 font-medium flex items-center gap-2"
              >
                <span className="text-sm font-bold">+</span>
                <span>Créer un Nouveau Projet...</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick New Project Button */}
        <button
          onClick={onOpenNewProjectModal}
          className="px-2 py-1 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 text-xs font-medium hover:bg-indigo-600/30 flex items-center gap-1 transition-colors"
          title="Créer un nouveau projet"
        >
          <span className="font-bold text-sm leading-none">+</span>
          <span className="hidden sm:inline">Nouveau</span>
        </button>

        {/* Undo / Redo / Save Controls (Section 7.3 & 7.4) */}
        <div className="hidden md:flex items-center gap-1 ml-1 pl-2 border-l border-slate-800">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-35 text-slate-300 border border-slate-800"
            title="Annuler (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-35 text-slate-300 border border-slate-800"
            title="Rétablir (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
          {onManualSave && (
            <button
              onClick={onManualSave}
              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] flex items-center gap-1"
              title="Sauvegarder et créer un point de restauration (Ctrl+S)"
            >
              <Save className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-mono">{saveStatusText}</span>
            </button>
          )}
        </div>
      </div>

      {/* Zone 2: Navigation views & Tools */}
      <nav className="hidden lg:flex items-center gap-1 text-xs font-medium text-slate-400">
        <button
          onClick={() => onChangeView('dashboard')}
          className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
            activeView === 'dashboard'
              ? 'bg-slate-800 text-white font-semibold'
              : 'hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
          <span>Tableau de Bord</span>
        </button>

        <button
          onClick={() => onChangeView('studio')}
          className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
            activeView === 'studio'
              ? 'bg-slate-800 text-white font-semibold'
              : 'hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Éditeur Studio</span>
        </button>

        <button
          onClick={() => onChangeView('graph')}
          className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
            activeView === 'graph'
              ? 'bg-slate-800 text-white font-semibold'
              : 'hover:text-slate-200'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>Graphe Narratif</span>
        </button>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        <button
          onClick={onOpenAiStudio}
          className="px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 hover:text-white transition-colors text-indigo-300 hover:bg-indigo-950/40"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Copilote IA</span>
        </button>

        <button
          onClick={onOpenQualityLinter}
          className="px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 hover:text-white transition-colors text-emerald-300 hover:bg-emerald-950/30"
          title="Contrôle Qualité Intelligent"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Audit Qualité</span>
        </button>

        <button
          onClick={onOpenComparativeMatrix}
          className="px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 hover:text-white transition-colors text-amber-300 hover:bg-amber-950/30"
          title="Matrice comparative vs Captivate, H5P, Storyline"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Benchmark</span>
        </button>

        <button
          onClick={onOpenTeamModal}
          className="px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 hover:text-white transition-colors"
          title="Gestion des membres, rôles et journal d'audit"
        >
          <Users className="w-3.5 h-3.5" />
          <span>Équipe</span>
        </button>

        <button
          onClick={onOpenExport}
          className="px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 hover:text-white transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exporter</span>
        </button>
      </nav>

      {/* Zone 3: Primary Learner Player CTA */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenLearnerPlayer}
          className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 active:scale-95 transition-all shadow-md shadow-indigo-600/30 whitespace-nowrap shrink-0 flex items-center gap-1.5"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Aperçu Apprenant</span>
        </button>
      </div>
    </header>
  );
};
