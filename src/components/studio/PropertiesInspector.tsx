import React, { useState } from 'react';
import {
  InteractionItem,
  InteractiveProject,
  VideoScene,
  TriggerRule,
  VariableDefinition,
  InteractionState,
} from '../../types';
import {
  Sliders,
  Layers,
  Zap,
  Database,
  Plus,
  Trash2,
  Clock,
  Square,
  HelpCircle,
  Eye,
  CheckCircle,
  Code,
  Mic,
  Star,
  Volume2,
  Lock,
  Unlock,
  User,
} from 'lucide-react';

interface PropertiesInspectorProps {
  project: InteractiveProject;
  activeScene: VideoScene;
  selectedInteraction: InteractionItem | null;
  onUpdateInteraction: (updated: InteractionItem) => void;
  onUpdateProjectVariables: (variables: Record<string, VariableDefinition>) => void;
  onAddTriggerToInteraction: (interactionId: string, trigger: TriggerRule) => void;
  onRemoveTriggerFromInteraction: (interactionId: string, triggerId: string) => void;
}

export const PropertiesInspector: React.FC<PropertiesInspectorProps> = ({
  project,
  activeScene,
  selectedInteraction,
  onUpdateInteraction,
  onUpdateProjectVariables,
  onAddTriggerToInteraction,
  onRemoveTriggerFromInteraction,
}) => {
  const [activeTab, setActiveTab] = useState<'properties' | 'layers' | 'triggers' | 'variables'>('properties');

  // Trigger form state
  const [newTriggerEvent, setNewTriggerEvent] = useState<any>('on_click');
  const [newTriggerAction, setNewTriggerAction] = useState<any>('set_variable');
  const [newTriggerVar, setNewTriggerVar] = useState('score');
  const [newTriggerDelta, setNewTriggerDelta] = useState(10);

  // Variable form state
  const [newVarName, setNewVarName] = useState('');
  const [newVarType, setNewVarType] = useState<'number' | 'boolean' | 'string'>('number');
  const [newVarVal, setNewVarVal] = useState<any>('0');

  const handleAddTrigger = () => {
    if (!selectedInteraction) return;
    const rule: TriggerRule = {
      id: `trig-${Date.now()}`,
      name: `Action sur ${newTriggerEvent}`,
      event: newTriggerEvent,
      conditionVariable: newTriggerVar,
      conditionOperator: '==',
      action: newTriggerAction,
      variableDelta: Number(newTriggerDelta),
    };
    onAddTriggerToInteraction(selectedInteraction.id, rule);
  };

  const handleCreateVariable = () => {
    if (!newVarName.trim()) return;
    const updated = { ...project.variables };
    updated[newVarName.trim()] = {
      name: newVarName.trim(),
      type: newVarType,
      defaultValue: newVarType === 'number' ? Number(newVarVal) : newVarVal,
      currentValue: newVarType === 'number' ? Number(newVarVal) : newVarVal,
      description: 'Variable personnalisée définie dans OmniStudio',
    };
    onUpdateProjectVariables(updated);
    setNewVarName('');
    setNewVarVal('0');
  };

  return (
    <div className="w-80 h-full bg-slate-950 border-l border-slate-800 flex flex-col text-xs select-none">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-800 bg-slate-900/70 p-1 gap-1">
        <button
          onClick={() => setActiveTab('properties')}
          className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 font-medium transition-colors ${
            activeTab === 'properties'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Propriétés de l'élément sélectionné"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Propriétés</span>
        </button>
        <button
          onClick={() => setActiveTab('layers')}
          className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 font-medium transition-colors ${
            activeTab === 'layers'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Calques Storyline & États"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Calques</span>
        </button>
        <button
          onClick={() => setActiveTab('triggers')}
          className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 font-medium transition-colors ${
            activeTab === 'triggers'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Triggers & Logique conditionnelle"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Triggers</span>
        </button>
        <button
          onClick={() => setActiveTab('variables')}
          className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 font-medium transition-colors ${
            activeTab === 'variables'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Variables globales du projet"
        >
          <Database className="w-3.5 h-3.5" />
          <span>Variables</span>
        </button>
      </div>

      {/* Tab 1: Properties */}
      {activeTab === 'properties' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {selectedInteraction ? (
            <>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Titre de l'élément
                </label>
                <input
                  type="text"
                  value={selectedInteraction.title}
                  onChange={(e) =>
                    onUpdateInteraction({ ...selectedInteraction, title: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Début (secondes)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={selectedInteraction.timestamp}
                    onChange={(e) =>
                      onUpdateInteraction({
                        ...selectedInteraction,
                        timestamp: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Durée (secondes)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={selectedInteraction.duration || 6}
                    onChange={(e) =>
                      onUpdateInteraction({
                        ...selectedInteraction,
                        duration: parseFloat(e.target.value) || 1,
                      })
                    }
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono"
                  />
                </div>
              </div>

              {/* Pause on trigger toggle */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div>
                  <p className="font-semibold text-slate-200">Mettre la vidéo en pause</p>
                  <p className="text-[10px] text-slate-400">Suspend la lecture jusqu'à action</p>
                </div>
                <input
                  type="checkbox"
                  checked={selectedInteraction.pauseOnTrigger}
                  onChange={(e) =>
                    onUpdateInteraction({
                      ...selectedInteraction,
                      pauseOnTrigger: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer"
                />
              </div>

              {/* Position coordinates */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Position sur la vidéo (%)
                </label>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                    <span className="text-slate-500">X:</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={selectedInteraction.xPercent}
                      onChange={(e) =>
                        onUpdateInteraction({
                          ...selectedInteraction,
                          xPercent: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full bg-transparent text-slate-200 focus:outline-none"
                    />
                    <span className="text-slate-500">%</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                    <span className="text-slate-500">Y:</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={selectedInteraction.yPercent}
                      onChange={(e) =>
                        onUpdateInteraction({
                          ...selectedInteraction,
                          yPercent: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full bg-transparent text-slate-200 focus:outline-none"
                    />
                    <span className="text-slate-500">%</span>
                  </div>
                </div>
              </div>

              {/* Style Variant Selector */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Style Visuel de l'Élément
                </label>
                <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
                  {(['glass', 'neon', 'minimal', 'flat', 'cyber'] as const).map((sty) => (
                    <button
                      key={sty}
                      onClick={() => onUpdateInteraction({ ...selectedInteraction, styleVariant: sty })}
                      className={`py-1 rounded border capitalize transition-colors ${
                        selectedInteraction.styleVariant === sty
                          ? 'bg-indigo-600 text-white border-indigo-400 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {sty}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action On Click Selector (Canva / Genially style) */}
              {selectedInteraction.type !== 'quiz' && (
                <div className="p-3 rounded-xl bg-slate-900/90 border border-indigo-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-indigo-300">Action au Clic de l'Apprenant</span>
                    <span className="text-[10px] text-slate-400">Interactivité</span>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Comportement au clic :</label>
                    <select
                      value={selectedInteraction.actionOnClick || 'open_popup'}
                      onChange={(e) =>
                        onUpdateInteraction({
                          ...selectedInteraction,
                          actionOnClick: e.target.value as any,
                        })
                      }
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200"
                    >
                      <option value="open_popup">Ouvrir un Pop-up Multimédia Riche (Texte, Image, Audio)</option>
                      <option value="open_link">Ouvrir un Lien Web Externe</option>
                      <option value="jump_to_time">Sauter à un moment précis de la vidéo</option>
                      <option value="jump_to_scene">Sauter à une autre scène (Embranchement)</option>
                    </select>
                  </div>

                  {/* Pop-up Multimedia Editor */}
                  {(!selectedInteraction.actionOnClick || selectedInteraction.actionOnClick === 'open_popup') && (
                    <div className="space-y-2 pt-1 border-t border-slate-800">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Titre du Pop-up :</label>
                        <input
                          type="text"
                          placeholder="Ex: Analyse Approfondie"
                          value={selectedInteraction.popupTitle || ''}
                          onChange={(e) =>
                            onUpdateInteraction({
                              ...selectedInteraction,
                              popupTitle: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Texte explicatif affiché :</label>
                        <textarea
                          rows={3}
                          placeholder="Contenu détaillé qui apparaîtra lorsque l'apprenant clique sur la zone..."
                          value={selectedInteraction.popupText || selectedInteraction.content || ''}
                          onChange={(e) =>
                            onUpdateInteraction({
                              ...selectedInteraction,
                              popupText: e.target.value,
                              content: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200 text-xs leading-relaxed"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">URL de l'image (optionnelle) :</label>
                        <input
                          type="text"
                          placeholder="https://images.example.com/schema.jpg"
                          value={selectedInteraction.popupImageUrl || selectedInteraction.imageUrl || ''}
                          onChange={(e) =>
                            onUpdateInteraction({
                              ...selectedInteraction,
                              popupImageUrl: e.target.value,
                              imageUrl: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200 font-mono text-[11px]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Bouton CTA (Libellé) :</label>
                          <input
                            type="text"
                            placeholder="Ex: Voir le guide"
                            value={selectedInteraction.popupButtonText || ''}
                            onChange={(e) =>
                              onUpdateInteraction({
                                ...selectedInteraction,
                                popupButtonText: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Lien Web Externe :</label>
                          <input
                            type="text"
                            placeholder="https://..."
                            value={selectedInteraction.popupButtonUrl || ''}
                            onChange={(e) =>
                              onUpdateInteraction({
                                ...selectedInteraction,
                                popupButtonUrl: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Jump to time editor */}
                  {selectedInteraction.actionOnClick === 'jump_to_time' && (
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Seconde cible dans la vidéo :</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="Ex: 14.5"
                        value={selectedInteraction.targetTime || 0}
                        onChange={(e) =>
                          onUpdateInteraction({
                            ...selectedInteraction,
                            targetTime: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Complete Flexible Quiz Editor */}
              {selectedInteraction.type === 'quiz' && selectedInteraction.quiz && (
                <div className="space-y-3.5 p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/40 shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 text-xs">Éditeur Universel de Quiz</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={selectedInteraction.quiz.points}
                        onChange={(e) =>
                          onUpdateInteraction({
                            ...selectedInteraction,
                            quiz: {
                              ...selectedInteraction.quiz!,
                              points: parseInt(e.target.value, 10) || 10,
                            },
                          })
                        }
                        className="w-12 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-emerald-300 font-mono text-center text-xs"
                      />
                      <span className="text-[10px] text-slate-400 font-mono">pts</span>
                    </div>
                  </div>

                  {/* Single Choice vs Multiple Choice Selector */}
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Type de Sélection :</label>
                    <div className="grid grid-cols-2 gap-1.5 p-0.5 rounded-lg bg-slate-950 border border-slate-800">
                      <button
                        onClick={() =>
                          onUpdateInteraction({
                            ...selectedInteraction,
                            quiz: {
                              ...selectedInteraction.quiz!,
                              isMultipleChoice: false,
                            },
                          })
                        }
                        className={`py-1 rounded text-[11px] font-semibold transition-colors ${
                          !selectedInteraction.quiz.isMultipleChoice
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        🔘 Réponse Unique
                      </button>

                      <button
                        onClick={() =>
                          onUpdateInteraction({
                            ...selectedInteraction,
                            quiz: {
                              ...selectedInteraction.quiz!,
                              isMultipleChoice: true,
                            },
                          })
                        }
                        className={`py-1 rounded text-[11px] font-semibold transition-colors ${
                          selectedInteraction.quiz.isMultipleChoice
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        ☑️ Réponses Multiples
                      </button>
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Intitulé de la question : *</label>
                    <textarea
                      rows={2}
                      value={selectedInteraction.quiz.title}
                      onChange={(e) =>
                        onUpdateInteraction({
                          ...selectedInteraction,
                          quiz: { ...selectedInteraction.quiz!, title: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs leading-relaxed"
                    />
                  </div>

                  {/* List of Options with Add / Remove and Checkbox */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-semibold text-slate-300">
                        Options de réponse (Cochez les bonnes réponses) :
                      </label>
                      <button
                        onClick={() => {
                          const newOpt = {
                            id: `opt-${Date.now()}`,
                            text: `Nouvelle option ${ (selectedInteraction.quiz?.options?.length || 0) + 1 }`,
                            isCorrect: false,
                            feedback: 'Bonne réponse !',
                          };
                          const updatedOpts = [...(selectedInteraction.quiz?.options || []), newOpt];
                          onUpdateInteraction({
                            ...selectedInteraction,
                            quiz: { ...selectedInteraction.quiz!, options: updatedOpts },
                          });
                        }}
                        className="px-2 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 text-[10px] font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Ajouter Option</span>
                      </button>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selectedInteraction.quiz.options?.map((opt, idx) => (
                        <div
                          key={opt.id}
                          className="p-2 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type={selectedInteraction.quiz?.isMultipleChoice ? 'checkbox' : 'radio'}
                              name="quiz_choice_marker"
                              checked={opt.isCorrect}
                              onChange={(e) => {
                                const isMultiple = selectedInteraction.quiz?.isMultipleChoice;
                                const updatedOpts = selectedInteraction.quiz!.options!.map((o, i) => {
                                  if (isMultiple) {
                                    return i === idx ? { ...o, isCorrect: e.target.checked } : o;
                                  } else {
                                    return { ...o, isCorrect: i === idx };
                                  }
                                });
                                onUpdateInteraction({
                                  ...selectedInteraction,
                                  quiz: { ...selectedInteraction.quiz!, options: updatedOpts },
                                });
                              }}
                              className="text-emerald-500 focus:ring-0 cursor-pointer w-4 h-4 rounded"
                              title="Marquer comme bonne réponse"
                            />

                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => {
                                const updatedOpts = [...selectedInteraction.quiz!.options!];
                                updatedOpts[idx].text = e.target.value;
                                onUpdateInteraction({
                                  ...selectedInteraction,
                                  quiz: { ...selectedInteraction.quiz!, options: updatedOpts },
                                });
                              }}
                              className="flex-1 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-100 font-medium"
                              placeholder={`Option ${idx + 1}`}
                            />

                            {(selectedInteraction.quiz?.options?.length || 0) > 2 && (
                              <button
                                onClick={() => {
                                  const updatedOpts = selectedInteraction.quiz!.options!.filter(
                                    (_, i) => i !== idx
                                  );
                                  onUpdateInteraction({
                                    ...selectedInteraction,
                                    quiz: { ...selectedInteraction.quiz!, options: updatedOpts },
                                  });
                                }}
                                className="text-slate-500 hover:text-red-400 p-1"
                                title="Supprimer cette option"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <input
                            type="text"
                            placeholder="Feedback personnalisé affiché à l'apprenant..."
                            value={opt.feedback || ''}
                            onChange={(e) => {
                              const updatedOpts = [...selectedInteraction.quiz!.options!];
                              updatedOpts[idx].feedback = e.target.value;
                              onUpdateInteraction({
                                ...selectedInteraction,
                                quiz: { ...selectedInteraction.quiz!, options: updatedOpts },
                              });
                            }}
                            className="w-full px-2 py-0.5 rounded bg-slate-900/60 border border-slate-800 text-[10px] text-slate-400"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Explanation feedback */}
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">
                      Explication pédagogique globale après réponse :
                    </label>
                    <textarea
                      rows={2}
                      value={selectedInteraction.quiz.explanation}
                      onChange={(e) =>
                        onUpdateInteraction({
                          ...selectedInteraction,
                          quiz: { ...selectedInteraction.quiz!, explanation: e.target.value },
                        })
                      }
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-slate-200 leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* Loom Bubble Inspector */}
              {selectedInteraction.type === 'loom_bubble' && (
                <div className="space-y-3 p-3 rounded-xl bg-slate-900/90 border border-emerald-500/40 shadow-xl">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <Mic className="w-4 h-4" />
                    <span>Bulle Présentateur Loom</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Nom du Présentateur :</label>
                    <input
                      type="text"
                      value={selectedInteraction.title || ''}
                      onChange={(e) => onUpdateInteraction({ ...selectedInteraction, title: e.target.value })}
                      placeholder="Ex: Dr. Sarah Martin"
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Rôle / Sous-titre :</label>
                    <input
                      type="text"
                      value={selectedInteraction.description || ''}
                      onChange={(e) => onUpdateInteraction({ ...selectedInteraction, description: e.target.value })}
                      placeholder="Ex: Responsable Pédagogique"
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Photo Avatar URL :</label>
                    <input
                      type="text"
                      value={selectedInteraction.imageUrl || ''}
                      onChange={(e) => onUpdateInteraction({ ...selectedInteraction, imageUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Message d'accueil / Audio TTS :</label>
                    <textarea
                      rows={2}
                      value={selectedInteraction.content || ''}
                      onChange={(e) => onUpdateInteraction({ ...selectedInteraction, content: e.target.value })}
                      placeholder="Texte prononcé lors du clic sur le présentateur..."
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-slate-200"
                    />
                  </div>
                </div>
              )}

              {/* Code Snippet Inspector */}
              {selectedInteraction.type === 'code_snippet' && (
                <div className="space-y-3 p-3 rounded-xl bg-slate-900/90 border border-indigo-500/40 shadow-xl">
                  <div className="flex items-center gap-1.5 text-indigo-400 font-bold">
                    <Code className="w-4 h-4" />
                    <span>Bloc Code Interactif</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Langage :</label>
                    <select
                      value={selectedInteraction.codeLanguage || 'TypeScript'}
                      onChange={(e) => onUpdateInteraction({ ...selectedInteraction, codeLanguage: e.target.value })}
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-slate-200"
                    >
                      {['TypeScript', 'JavaScript', 'Python', 'HTML', 'CSS', 'SQL', 'JSON', 'Rust', 'Go', 'Bash', 'C++'].map((lang) => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Code Source :</label>
                    <textarea
                      rows={6}
                      value={selectedInteraction.codeSnippet || selectedInteraction.content || ''}
                      onChange={(e) => onUpdateInteraction({
                        ...selectedInteraction,
                        codeSnippet: e.target.value,
                        content: e.target.value,
                      })}
                      placeholder="Collez ou saisissez votre code ici..."
                      className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs font-mono text-indigo-200 leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* Audio Spot Inspector */}
              {selectedInteraction.type === 'audio_spot' && (
                <div className="space-y-3 p-3 rounded-xl bg-slate-900/90 border border-cyan-500/40 shadow-xl">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                    <Volume2 className="w-4 h-4" />
                    <span>Capsule Audio / Narration</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Libellé du bouton audio :</label>
                    <input
                      type="text"
                      value={selectedInteraction.title || ''}
                      onChange={(e) => onUpdateInteraction({ ...selectedInteraction, title: e.target.value })}
                      placeholder="Ex: Écouter l'analyse"
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Texte à vocaliser (Synthèse IA TTS) :</label>
                    <textarea
                      rows={3}
                      value={selectedInteraction.content || ''}
                      onChange={(e) => onUpdateInteraction({ ...selectedInteraction, content: e.target.value })}
                      placeholder="Texte de l'explication audio..."
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-slate-200"
                    />
                  </div>
                </div>
              )}

              {/* Likert Scale Poll Inspector */}
              {selectedInteraction.type === 'poll_likert' && (
                <div className="space-y-3 p-3 rounded-xl bg-slate-900/90 border border-amber-500/40 shadow-xl">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                    <Star className="w-4 h-4" />
                    <span>Sondage / Échelle de Likert</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Question posée :</label>
                    <input
                      type="text"
                      value={selectedInteraction.title || ''}
                      onChange={(e) => onUpdateInteraction({ ...selectedInteraction, title: e.target.value })}
                      placeholder="Ex: Évaluez votre compréhension..."
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-slate-200"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Libellé Min (1) :</label>
                      <input
                        type="text"
                        value={selectedInteraction.likertScale?.minLabel || 'Pas à l’aise'}
                        onChange={(e) => onUpdateInteraction({
                          ...selectedInteraction,
                          likertScale: {
                            minLabel: e.target.value,
                            maxLabel: selectedInteraction.likertScale?.maxLabel || 'Parfaitement autonome',
                            steps: selectedInteraction.likertScale?.steps || 5,
                          },
                        })}
                        className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Libellé Max (5) :</label>
                      <input
                        type="text"
                        value={selectedInteraction.likertScale?.maxLabel || 'Parfaitement autonome'}
                        onChange={(e) => onUpdateInteraction({
                          ...selectedInteraction,
                          likertScale: {
                            minLabel: selectedInteraction.likertScale?.minLabel || 'Pas à l’aise',
                            maxLabel: e.target.value,
                            steps: selectedInteraction.likertScale?.steps || 5,
                          },
                        })}
                        className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500 px-4">
              <Sliders className="w-8 h-8 stroke-1 mb-2 text-slate-600" />
              <p className="font-medium">Aucun élément sélectionné</p>
              <p className="text-[11px] text-slate-600 mt-1">
                Cliquez sur un hotspot, un quiz ou un repère sur la timeline pour inspecter ses propriétés.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Storyline Layers & States */}
      {activeTab === 'layers' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Calques de la scène (Storyline Layers)
            </h4>
            <div className="space-y-1.5">
              <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/40 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-indigo-300">Calque de Base (Vidéo)</span>
                  <p className="text-[10px] text-slate-400">Flux vidéo principal de la scène</p>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-mono">
                  Principal
                </span>
              </div>

              {activeScene.layers?.map((layer) => (
                <div
                  key={layer.id}
                  className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold text-slate-200">{layer.name}</span>
                    <p className="text-[10px] text-slate-400">
                      Opacité : {Math.round(layer.opacity * 100)}%
                    </p>
                  </div>
                  <Eye className="w-4 h-4 text-slate-400 hover:text-white cursor-pointer" />
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              États de l'élément (States)
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {['Normal', 'Hover (Survol)', 'Visited (Visité)', 'Disabled'].map((stateName) => (
                <div
                  key={stateName}
                  className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-center text-slate-300 text-xs font-medium hover:border-indigo-500 cursor-pointer"
                >
                  {stateName}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Triggers & Conditional Logic */}
      {activeTab === 'triggers' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {selectedInteraction ? (
            <>
              <div>
                <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Triggers actifs sur cet élément
                </h4>
                {(selectedInteraction.triggers || []).length > 0 ? (
                  <div className="space-y-2">
                    {(selectedInteraction.triggers || []).map((trig, trigIdx) => (
                      <div
                        key={`trig-${trig.id || trigIdx}-${trigIdx}`}
                        className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1 relative group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-indigo-300">{trig.name}</span>
                          <button
                            onClick={() =>
                              onRemoveTriggerFromInteraction(selectedInteraction.id, trig.id)
                            }
                            className="text-slate-500 hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          QUAND : <strong className="text-slate-200">{trig.event}</strong>
                        </p>
                        <p className="text-[11px] text-slate-400">
                          ALORS : <strong className="text-slate-200">{trig.action}</strong> (
                          {trig.conditionVariable} +{trig.variableDelta})
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">Aucun trigger actif pour l'instant.</p>
                )}
              </div>

              {/* Add New Trigger Form */}
              <div className="p-3 rounded-lg bg-slate-900/80 border border-indigo-500/30 space-y-2.5">
                <span className="font-semibold text-indigo-300 block">Nouveau Trigger Storyline</span>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Événement déclencheur (QUAND) :</label>
                  <select
                    value={newTriggerEvent}
                    onChange={(e) => setNewTriggerEvent(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200"
                  >
                    <option value="on_click">Clic simple de l'apprenant</option>
                    <option value="on_double_click">Double clic</option>
                    <option value="on_hover_enter">Survol de la souris (Hover)</option>
                    <option value="on_long_press">Maintien prolongé (Long press)</option>
                    <option value="on_timeline_reach">Atteinte du repère temporel</option>
                    <option value="on_quiz_correct">Réponse exacte au quiz</option>
                    <option value="on_quiz_incorrect">Erreur au quiz</option>
                    <option value="on_variable_change">Condition variable (Score, etc.)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Action exécutée (ALORS) :</label>
                  <select
                    value={newTriggerAction}
                    onChange={(e) => setNewTriggerAction(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200"
                  >
                    <option value="set_variable">Modifier la variable (Score/Points)</option>
                    <option value="pause_video">Mettre la vidéo en pause</option>
                    <option value="resume_video">Reprendre la lecture vidéo</option>
                    <option value="play_sfx">Jouer un effet sonore (Fanfare, Buzz, Clic)</option>
                    <option value="shake_screen">Déclencher une secousse visuelle d'écran</option>
                    <option value="trigger_halo">Déclencher un halo lumineux de réussite</option>
                    <option value="trigger_pip_video">Déclencher la vidéo secondaire PiP</option>
                    <option value="jump_to_scene">Sauter vers la scène / embranchement</option>
                  </select>
                </div>

                {newTriggerAction === 'set_variable' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Variable :</label>
                      <select
                        value={newTriggerVar}
                        onChange={(e) => setNewTriggerVar(e.target.value)}
                        className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200 font-mono text-[11px]"
                      >
                        {Object.keys(project.variables).map((vKey) => (
                          <option key={vKey} value={vKey}>
                            {vKey}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Ajout (+pts) :</label>
                      <input
                        type="number"
                        value={newTriggerDelta}
                        onChange={(e) => setNewTriggerDelta(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200 font-mono"
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleAddTrigger}
                  className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter le Trigger</span>
                </button>
              </div>
            </>
          ) : (
            <p className="text-slate-500 text-center py-10">
              Sélectionnez un élément pour lui attacher des règles logiques.
            </p>
          )}
        </div>
      )}

      {/* Tab 4: Global Variables */}
      {activeTab === 'variables' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Variables globales du module
            </h4>
            <div className="space-y-2">
              {Object.values(project.variables).map((v) => (
                <div
                  key={v.name}
                  className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-emerald-400">{v.name}</span>
                    <span className="text-[10px] uppercase font-mono px-1 rounded bg-slate-800 text-slate-400">
                      {v.type}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300 font-mono">
                    <span>Valeur initiale :</span>
                    <strong className="text-white">{String(v.defaultValue)}</strong>
                  </div>
                  <p className="text-[10px] text-slate-500">{v.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Create new variable */}
          <div className="border-t border-slate-800 pt-3 space-y-2">
            <span className="font-semibold text-slate-300 block">Créer une Variable</span>
            <input
              type="text"
              placeholder="Nom (ex: patient_stress)"
              value={newVarName}
              onChange={(e) => setNewVarName(e.target.value)}
              className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newVarType}
                onChange={(e) => setNewVarType(e.target.value as any)}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200"
              >
                <option value="number">Nombre</option>
                <option value="boolean">Booléen</option>
                <option value="string">Texte</option>
              </select>
              <input
                type="text"
                placeholder="Valeur par défaut"
                value={newVarVal}
                onChange={(e) => setNewVarVal(e.target.value)}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs"
              />
            </div>
            <button
              onClick={handleCreateVariable}
              className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors flex items-center justify-center gap-1 border border-slate-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Enregistrer la variable</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
