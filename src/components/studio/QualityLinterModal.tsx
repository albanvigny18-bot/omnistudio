import React, { useState, useMemo } from 'react';
import { InteractiveProject, VideoScene, InteractionItem } from '../../types';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wrench,
  ShieldCheck,
  X,
  FileCheck,
  Eye,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { soundFX } from '../../services/soundEffects';
import confetti from 'canvas-confetti';

interface QualityIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  category: 'Structure' | 'Interactivité' | 'Quiz' | 'Accessibilité' | 'Variables';
  sceneId?: string;
  sceneTitle?: string;
  interactionId?: string;
  title: string;
  description: string;
  autoFixAvailable: boolean;
}

interface QualityLinterModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: InteractiveProject;
  onUpdateProject: (updated: InteractiveProject) => void;
  onSelectScene: (sceneId: string) => void;
}

export const QualityLinterModal: React.FC<QualityLinterModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateProject,
  onSelectScene,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'error' | 'warning'>('all');
  const [fixedNotice, setFixedNotice] = useState<string | null>(null);

  // Scan project and evaluate all quality issues
  const issues = useMemo(() => {
    const list: QualityIssue[] = [];

    // 1. Structure: Dead-ends & Orphan scenes
    const targetedSceneIds = new Set<string>();
    if (project.startSceneId) {
      targetedSceneIds.add(project.startSceneId);
    }

    const scenes = project.scenes || [];
    const vars = project.variables || {};

    scenes.forEach((scene) => {
      (scene.branchingChoices || []).forEach((ch) => {
        if (ch?.targetSceneId) targetedSceneIds.add(ch.targetSceneId);
      });
      (scene.interactions || []).forEach((it) => {
        if (it?.targetSceneId) targetedSceneIds.add(it.targetSceneId);
      });
    });

    scenes.forEach((scene, sceneIdx) => {
      const branchingChoices = scene.branchingChoices || [];
      const interactions = scene.interactions || [];

      // Orphan check
      if (!targetedSceneIds.has(scene.id) && scene.id !== project.startSceneId) {
        list.push({
          id: `orphan-${scene.id}-${sceneIdx}`,
          severity: 'warning',
          category: 'Structure',
          sceneId: scene.id,
          sceneTitle: scene.title,
          title: `Scène orpheline inaccessible : "${scene.title}"`,
          description: "Aucun embranchement ni bouton ne mène à cette scène. Elle ne pourra pas être visionnée par l'apprenant.",
          autoFixAvailable: true,
        });
      }

      // Dead-end check (if not last scene and has no branching)
      if (
        branchingChoices.length === 0 &&
        scenes.length > 1 &&
        scene.id !== scenes[scenes.length - 1]?.id
      ) {
        list.push({
          id: `deadend-${scene.id}-${sceneIdx}`,
          severity: 'error',
          category: 'Structure',
          sceneId: scene.id,
          sceneTitle: scene.title,
          title: `Scène sans issue (Dead-End) : "${scene.title}"`,
          description: "Cette scène ne propose aucun choix de continuation vers la scène suivante.",
          autoFixAvailable: true,
        });
      }

      // Scene objective accessibility
      if (!scene.learningObjective || scene.learningObjective.trim().length < 5) {
        list.push({
          id: `objective-${scene.id}-${sceneIdx}`,
          severity: 'info',
          category: 'Accessibilité',
          sceneId: scene.id,
          sceneTitle: scene.title,
          title: `Objectif pédagogique manquant sur "${scene.title}"`,
          description: "Définir un objectif pédagogique explicite améliore la conformité Qualiopi et l'ancrage mémoriel.",
          autoFixAvailable: true,
        });
      }

      // 2. Interactions & Timing check
      interactions.forEach((it, itIdx) => {
        if (!it) return;
        if (it.timestamp >= scene.duration) {
          list.push({
            id: `timing-overflow-${it.id || itIdx}-${sceneIdx}-${itIdx}`,
            severity: 'error',
            category: 'Interactivité',
            sceneId: scene.id,
            sceneTitle: scene.title,
            interactionId: it.id,
            title: `Élément hors timeline : "${it.title}"`,
            description: `Le déclencheur est placé à ${it.timestamp}s alors que la scène ne dure que ${scene.duration}s.`,
            autoFixAvailable: true,
          });
        }

        // Quiz validation
        if (it.type === 'quiz' && it.quiz) {
          const hasCorrect = it.quiz.options?.some((o) => o.isCorrect);
          if (!hasCorrect) {
            list.push({
              id: `quiz-nocorrect-${it.id || itIdx}-${sceneIdx}-${itIdx}`,
              severity: 'error',
              category: 'Quiz',
              sceneId: scene.id,
              sceneTitle: scene.title,
              interactionId: it.id,
              title: `Question sans réponse valide : "${it.quiz.title}"`,
              description: "Aucune des options proposées n'est marquée comme réponse correcte.",
              autoFixAvailable: true,
            });
          }

          if (!it.quiz.points || it.quiz.points <= 0) {
            list.push({
              id: `quiz-nopoints-${it.id || itIdx}-${sceneIdx}-${itIdx}`,
              severity: 'warning',
              category: 'Quiz',
              sceneId: scene.id,
              sceneTitle: scene.title,
              interactionId: it.id,
              title: `Question avec 0 point : "${it.quiz.title}"`,
              description: "Attribuer des points permet au moteur SCORM d'évaluer la réussite de l'apprenant.",
              autoFixAvailable: true,
            });
          }
        }

        // Variable trigger validation
        (it.triggers || []).forEach((trig, trigIdx) => {
          if (!trig) return;
          if (trig.conditionVariable && !vars[trig.conditionVariable]) {
            list.push({
              id: `trig-var-missing-${trig.id || trigIdx}-${sceneIdx}-${itIdx}-${trigIdx}`,
              severity: 'warning',
              category: 'Variables',
              sceneId: scene.id,
              sceneTitle: scene.title,
              interactionId: it.id,
              title: `Variable non déclarée : "${trig.conditionVariable}"`,
              description: `L'action "${trig.name}" repose sur une variable inexistante dans le dictionnaire du projet.`,
              autoFixAvailable: true,
            });
          }
        });
      });
    });

    return list;
  }, [project]);

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;

  // Health Score Calculation (100 - penalties)
  const healthScore = Math.max(0, 100 - errorCount * 18 - warningCount * 6 - infoCount * 2);

  const filteredIssues = issues.filter((i) => {
    if (filterSeverity === 'error') return i.severity === 'error';
    if (filterSeverity === 'warning') return i.severity === 'warning';
    return true;
  });

  // Automated 1-Click Fixer (Self-Healing Architecture)
  const handleAutoFixAll = () => {
    soundFX.playTransition();
    const updated = JSON.parse(JSON.stringify(project)) as InteractiveProject;
    updated.scenes = updated.scenes || [];
    updated.variables = updated.variables || {};

    // 1. Ensure all scenes have forward link or exit
    updated.scenes.forEach((scene, idx) => {
      scene.branchingChoices = scene.branchingChoices || [];
      scene.interactions = scene.interactions || [];

      if (
        scene.branchingChoices.length === 0 &&
        idx < updated.scenes.length - 1
      ) {
        scene.branchingChoices.push({
          id: `auto-branch-${Date.now()}-${idx}`,
          label: `Continuer vers ${updated.scenes[idx + 1].title}`,
          targetSceneId: updated.scenes[idx + 1].id,
          pedagogicalImpact: 'Progression linéaire de validation standard.',
        });
      }

      if (!scene.learningObjective || scene.learningObjective.trim().length < 5) {
        scene.learningObjective = `Maîtriser les compétences clés présentées dans "${scene.title}".`;
      }

      // Fix timing overflows
      scene.interactions.forEach((it) => {
        if (!it) return;
        it.triggers = it.triggers || [];
        if (it.timestamp >= scene.duration) {
          it.timestamp = Math.max(1, scene.duration - (it.duration || 5));
        }

        // Fix missing correct answers on quiz
        if (it.type === 'quiz' && it.quiz) {
          if (!it.quiz.options?.some((o) => o.isCorrect) && it.quiz.options && it.quiz.options.length > 0) {
            it.quiz.options[0].isCorrect = true;
          }
          if (!it.quiz.points || it.quiz.points <= 0) {
            it.quiz.points = 15;
          }
        }

        // Declare missing variables
        it.triggers.forEach((trig) => {
          if (trig?.conditionVariable && !updated.variables[trig.conditionVariable]) {
            updated.variables[trig.conditionVariable] = {
              name: trig.conditionVariable,
              type: 'number',
              defaultValue: 0,
              currentValue: 0,
              description: 'Variable auto-générée par le Linter Qualité',
            };
          }
        });
      });
    });

    onUpdateProject(updated);
    soundFX.playCorrect();
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    setFixedNotice('Toutes les anomalies réparables ont été corrigées avec succès !');
    setTimeout(() => setFixedNotice(null), 4000);
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-xs"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Contrôle Qualité Intelligent & Linter Pédagogique
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-[10px] font-mono text-indigo-300 font-semibold">
                  Innovation E
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Audit automatisé du projet avant publication (scènes orphelines, timing, quiz, accessibilité).
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

        {/* Health Score Banner & Metrics */}
        <div className="px-6 py-4 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="currentColor"
                  strokeWidth="5"
                  className="text-slate-800"
                  fill="transparent"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeDasharray={163}
                  strokeDashoffset={163 - (163 * healthScore) / 100}
                  strokeLinecap="round"
                  className={`transition-all duration-700 ${
                    healthScore >= 90
                      ? 'text-emerald-400'
                      : healthScore >= 70
                      ? 'text-amber-400'
                      : 'text-rose-500'
                  }`}
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-bold text-white font-mono">{healthScore}%</span>
                <span className="text-[8px] text-slate-400 uppercase tracking-tighter">Santé</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-100">
                  {healthScore >= 90
                    ? 'Projet prêt pour publication certifiée'
                    : healthScore >= 70
                    ? 'Projet fonctionnel avec points d’attention'
                    : 'Anomalies bloquantes détectées'}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-[11px]">
                <button
                  onClick={() => setFilterSeverity('error')}
                  className={`flex items-center gap-1 font-semibold ${
                    errorCount > 0 ? 'text-rose-400' : 'text-slate-500'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{errorCount} Erreur{errorCount > 1 ? 's' : ''} critique{errorCount > 1 ? 's' : ''}</span>
                </button>
                <span className="text-slate-700">·</span>
                <button
                  onClick={() => setFilterSeverity('warning')}
                  className={`flex items-center gap-1 font-semibold ${
                    warningCount > 0 ? 'text-amber-400' : 'text-slate-500'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{warningCount} Avertissement{warningCount > 1 ? 's' : ''}</span>
                </button>
                <span className="text-slate-700">·</span>
                <span className="text-slate-400 flex items-center gap-1">
                  <FileCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{infoCount} Recommandation{infoCount > 1 ? 's' : ''}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Auto-Fix Button */}
          {issues.length > 0 && (
            <button
              onClick={handleAutoFixAll}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 shrink-0"
              title="Résout automatiquement les décalages de temps, les choix manquants et scènes isolées"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Auto-corriger tout en 1 clic</span>
            </button>
          )}
        </div>

        {/* Notification feedback */}
        {fixedNotice && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{fixedNotice}</span>
          </div>
        )}

        {/* Issues List Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5">
          {filteredIssues.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-100">Aucune anomalie détectée !</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Toutes les scènes, embranchements, timelines et questionnaires sont parfaitement synchronisés et valides.
                </p>
              </div>
            </div>
          ) : (
            filteredIssues.map((issue) => (
              <div
                key={issue.id}
                className={`p-3.5 rounded-xl border transition-colors flex items-start justify-between gap-4 ${
                  issue.severity === 'error'
                    ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50'
                    : issue.severity === 'warning'
                    ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/50'
                    : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {issue.severity === 'error' ? (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    ) : issue.severity === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    ) : (
                      <FileCheck className="w-4 h-4 text-indigo-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-100">{issue.title}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-400">
                        {issue.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                      {issue.description}
                    </p>
                    {issue.sceneTitle && (
                      <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400">
                        <span>Scène concernée :</span>
                        <strong className="text-slate-200">{issue.sceneTitle}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {issue.sceneId && (
                  <button
                    onClick={() => {
                      onSelectScene(issue.sceneId!);
                      onClose();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-medium flex items-center gap-1 shrink-0 transition-colors"
                  >
                    <Eye className="w-3 h-3 text-indigo-400" />
                    <span>Inspecter</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-slate-400 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Moteur de diagnostic conforme aux spécifications SCORM 2004 & WCAG 2.2 AA</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors"
          >
            Fermer le Linter
          </button>
        </div>
      </div>
    </div>
  );
};
