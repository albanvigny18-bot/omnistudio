import React, { useState, useMemo } from 'react';
import { InteractiveProject } from '../../types';
import {
  GitBranch,
  Plus,
  Video,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Flag,
  Link2,
} from 'lucide-react';
import { validateProjectSchema } from '../../services/projectEngine';

interface SceneNodeGraphProps {
  project: InteractiveProject;
  activeSceneId: string;
  onSelectScene: (sceneId: string) => void;
  onAddScene: () => void;
  onUpdateProject?: (updated: InteractiveProject) => void;
}

export const SceneNodeGraph: React.FC<SceneNodeGraphProps> = ({
  project,
  activeSceneId,
  onSelectScene,
  onAddScene,
  onUpdateProject,
}) => {
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>(() => {
    const pos: Record<string, { x: number; y: number }> = {};
    (project.scenes || []).forEach((s, idx) => {
      pos[s.id] = s.graphNodePosition || {
        x: 100 + (idx % 3) * 360,
        y: 120 + Math.floor(idx / 3) * 240,
      };
    });
    return pos;
  });

  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [linkingFromSceneId, setLinkingFromSceneId] = useState<string | null>(null);
  const [newBranchLabel, setNewBranchLabel] = useState<string>('Continuer vers la suite');
  const [newBranchTargetId, setNewBranchTargetId] = useState<string>('');

  const validation = useMemo(() => validateProjectSchema(project), [project]);

  const handleMouseDown = (e: React.MouseEvent, sceneId: string) => {
    e.stopPropagation();
    const current = nodePositions[sceneId] || { x: 100, y: 100 };
    setDraggingNodeId(sceneId);
    setDragOffset({
      x: e.clientX - current.x,
      y: e.clientY - current.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingNodeId) return;
    setNodePositions((prev) => ({
      ...prev,
      [draggingNodeId]: {
        x: Math.max(20, e.clientX - dragOffset.x),
        y: Math.max(20, e.clientY - dragOffset.y),
      },
    }));
  };

  const handleMouseUp = () => {
    if (draggingNodeId && onUpdateProject) {
      const pos = nodePositions[draggingNodeId];
      if (pos) {
        const updatedScenes = (project.scenes || []).map((s) =>
          s.id === draggingNodeId ? { ...s, graphNodePosition: pos } : s
        );
        onUpdateProject({ ...project, scenes: updatedScenes });
      }
    }
    setDraggingNodeId(null);
  };

  const handleSetStartScene = (sceneId: string) => {
    if (!onUpdateProject) return;
    onUpdateProject({ ...project, startSceneId: sceneId });
  };

  const handleAddBranchConnection = (fromSceneId: string) => {
    if (!onUpdateProject || !newBranchTargetId) return;
    const targetScene = project.scenes.find((s) => s.id === newBranchTargetId);
    const updatedScenes = (project.scenes || []).map((s) => {
      if (s.id === fromSceneId) {
        return {
          ...s,
          branchingChoices: [
            ...(s.branchingChoices || []),
            {
              id: `br-${Date.now()}`,
              label: newBranchLabel.trim() || `Aller vers ${targetScene?.title || 'Scène'}`,
              targetSceneId: newBranchTargetId,
              pedagogicalImpact: 'Connexion créée dans le graphe narratif.',
            },
          ],
        };
      }
      return s;
    });
    onUpdateProject({ ...project, scenes: updatedScenes });
    setLinkingFromSceneId(null);
    setNewBranchLabel('Continuer vers la suite');
  };

  const handleRemoveBranchConnection = (fromSceneId: string, branchId: string) => {
    if (!onUpdateProject) return;
    const updatedScenes = (project.scenes || []).map((s) => {
      if (s.id === fromSceneId) {
        return {
          ...s,
          branchingChoices: (s.branchingChoices || []).filter((b) => b.id !== branchId),
        };
      }
      return s;
    });
    onUpdateProject({ ...project, scenes: updatedScenes });
  };

  // Helper to draw SVG connecting bezier lines
  const renderConnections = () => {
    const lines: React.ReactNode[] = [];

    (project.scenes || []).forEach((scene, sIdx) => {
      const fromPos = nodePositions[scene.id] || {
        x: 100 + (sIdx % 3) * 360,
        y: 120 + Math.floor(sIdx / 3) * 240,
      };
      const fromX = fromPos.x + 290;
      const fromY = fromPos.y + 75;

      (scene.branchingChoices || []).forEach((choice, cIdx) => {
        const toPos = nodePositions[choice.targetSceneId];
        if (!toPos) return;
        const toX = toPos.x;
        const toY = toPos.y + 75;

        const deltaX = Math.max(60, Math.abs(toX - fromX) * 0.5);
        const pathData = `M ${fromX} ${fromY} C ${fromX + deltaX} ${fromY}, ${toX - deltaX} ${toY}, ${toX} ${toY}`;

        lines.push(
          <g key={`edge-${scene.id}-${choice.targetSceneId}-${cIdx}`}>
            <path
              d={pathData}
              fill="none"
              stroke="#6366f1"
              strokeWidth="2.5"
              strokeDasharray="5 4"
              className="opacity-75 hover:opacity-100 transition-opacity"
            />
            <circle cx={toX} cy={toY} r="4.5" fill="#a5b4fc" />
          </g>
        );
      });
    });

    return lines;
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="relative w-full h-full bg-slate-950 overflow-auto select-none p-8"
      style={{
        backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
      }}
    >
      {/* Top Banner Toolbar */}
      <div className="sticky top-2 left-2 z-30 flex flex-wrap items-center justify-between gap-4 bg-slate-900/95 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-800 shadow-xl max-w-4xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold text-slate-100">Graphe Narratif & Embranchements</span>
          </div>
          <span className="text-[11px] text-slate-400">
            · {(project.scenes || []).length} scènes
          </span>
          {validation.errorsCount === 0 && validation.warningsCount === 0 ? (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] text-emerald-300 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3 h-3" />
              Parcours cohérent
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] text-amber-300 flex items-center gap-1 font-medium">
              <AlertTriangle className="w-3 h-3" />
              {validation.errorsCount} erreur(s), {validation.warningsCount} alerte(s)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onAddScene}
            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1 shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouvelle Scène</span>
          </button>
        </div>
      </div>

      {/* SVG Connecting Curves */}
      <svg className="absolute inset-0 w-[2400px] h-[1600px] pointer-events-none z-0">
        {renderConnections()}
      </svg>

      {/* Render Scene Nodes */}
      <div className="relative w-[2400px] h-[1600px] mt-4">
        {(project.scenes || []).map((scene, sIdx) => {
          const pos = nodePositions[scene.id] || {
            x: 100 + (sIdx % 3) * 360,
            y: 120 + Math.floor(sIdx / 3) * 240,
          };
          const isActive = activeSceneId === scene.id;
          const isStart = scene.id === project.startSceneId;
          const isReachable = validation.reachableSceneIds.includes(scene.id) || isStart;
          const sceneIssues = validation.issues.filter((i) => i.sceneId === scene.id);

          return (
            <div
              key={`node-${scene.id}-${sIdx}`}
              onMouseDown={(e) => handleMouseDown(e, scene.id)}
              style={{
                transform: `translate(${pos.x}px, ${pos.y}px)`,
                width: '290px',
              }}
              className={`absolute z-10 rounded-xl cursor-grab active:cursor-grabbing transition-shadow duration-150 border ${
                isActive
                  ? 'bg-slate-900 border-indigo-500 shadow-2xl shadow-indigo-500/20 ring-2 ring-indigo-400'
                  : 'bg-slate-900/95 border-slate-800 hover:border-slate-700 shadow-xl'
              }`}
            >
              {/* Node Header */}
              <div className="px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between">
                <div
                  onClick={() => onSelectScene(scene.id)}
                  className="flex items-center gap-2 cursor-pointer hover:text-indigo-300"
                  title="Cliquer pour ouvrir cette scène dans le Studio"
                >
                  <Video className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="text-xs font-semibold text-slate-100 truncate w-36">
                    {scene.title}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {isStart ? (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      Départ
                    </span>
                  ) : (
                    onUpdateProject && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetStartScene(scene.id);
                        }}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-emerald-950 text-slate-400 hover:text-emerald-300 border border-slate-700"
                        title="Définir comme scène de départ"
                      >
                        <Flag className="w-2.5 h-2.5 inline mr-0.5" />
                        Départ
                      </button>
                    )
                  )}
                  <span className="text-[10px] font-mono text-slate-400">{scene.duration}s</span>
                </div>
              </div>

              {/* Node Body */}
              <div className="p-3 space-y-2 text-xs">
                <p className="text-slate-400 text-[11px] line-clamp-2">{scene.description}</p>

                {/* Diagnostics badges if any */}
                {!isReachable && (
                  <div className="px-2 py-1 rounded bg-amber-950/60 border border-amber-500/40 text-[10px] text-amber-300 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>Scène orpheline (inaccessible)</span>
                  </div>
                )}
                {sceneIssues
                  .filter((iss) => iss.code === 'DEAD_END_SCENE' || iss.code === 'CIRCULAR_LOOP')
                  .map((iss, iIdx) => (
                    <div
                      key={`iss-${iss.id}-${iIdx}`}
                      className="px-2 py-1 rounded bg-rose-950/60 border border-rose-500/40 text-[10px] text-rose-300 flex items-center gap-1"
                    >
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span className="truncate">{iss.code === 'DEAD_END_SCENE' ? 'Sans issue (Dead-End)' : 'Boucle détectée'}</span>
                    </div>
                  ))}

                <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1 border-t border-slate-800/80">
                  <span>Interactions :</span>
                  <span className="font-mono font-semibold text-indigo-300">
                    {(scene.interactions || []).length} points
                  </span>
                </div>

                {/* Branching outputs */}
                <div className="pt-1.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Liens sortants ({(scene.branchingChoices || []).length}) :
                    </span>
                    {onUpdateProject && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const defaultTarget =
                            project.scenes.find((s) => s.id !== scene.id)?.id || scene.id;
                          setNewBranchTargetId(defaultTarget);
                          setLinkingFromSceneId(
                            linkingFromSceneId === scene.id ? null : scene.id
                          );
                        }}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 font-semibold"
                      >
                        <Link2 className="w-3 h-3" />
                        <span>+ Lier</span>
                      </button>
                    )}
                  </div>

                  {(scene.branchingChoices || []).map((b, bIdx) => {
                    const targetTitle =
                      project.scenes.find((s) => s.id === b.targetSceneId)?.title ||
                      b.targetSceneId;
                    return (
                      <div
                        key={`branch-${b.id || bIdx}-${bIdx}`}
                        className="px-2 py-1 rounded bg-slate-950/90 border border-slate-800 text-[10px] text-slate-300 flex items-center justify-between gap-1 group"
                      >
                        <div className="truncate flex-1">
                          <span className="font-medium text-slate-200">{b.label}</span>
                          <span className="text-slate-500 block text-[9px] truncate">
                            → {targetTitle}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <ArrowRight className="w-3 h-3 text-indigo-400" />
                          {onUpdateProject && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveBranchConnection(scene.id, b.id);
                              }}
                              className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Supprimer ce lien"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Inline Add Connection Form */}
                  {linkingFromSceneId === scene.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 rounded-lg bg-slate-950 border border-indigo-500/50 space-y-1.5 mt-1"
                    >
                      <input
                        type="text"
                        value={newBranchLabel}
                        onChange={(e) => setNewBranchLabel(e.target.value)}
                        placeholder="Intitulé du bouton de choix..."
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] text-white"
                      />
                      <select
                        value={newBranchTargetId}
                        onChange={(e) => setNewBranchTargetId(e.target.value)}
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] text-white"
                      >
                        {(project.scenes || []).map((targetSc) => (
                          <option key={targetSc.id} value={targetSc.id}>
                            Cible : {targetSc.title}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center justify-end gap-1 pt-0.5">
                        <button
                          onClick={() => setLinkingFromSceneId(null)}
                          className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={() => handleAddBranchConnection(scene.id)}
                          className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[10px]"
                        >
                          Ajouter
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onSelectScene(scene.id)}
                  className="w-full mt-1 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-200 font-semibold text-[11px] transition-colors"
                >
                  Éditer dans le Studio
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
