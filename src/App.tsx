import React, { useState, useEffect, useCallback } from 'react';
import {
  InteractiveProject,
  VideoScene,
  InteractionItem,
  InteractionType,
  TriggerRule,
  VariableDefinition,
  QuizData,
} from './types';
import { MEDICAL_PROJECT } from './data/sampleProjects';
import { projectRepository, normalizeProject } from './services/projectEngine';
import { TopNavbar } from './components/studio/TopNavbar';
import { CanvasStage } from './components/studio/CanvasStage';
import { TimelineMultiTrack } from './components/studio/TimelineMultiTrack';
import { PropertiesInspector } from './components/studio/PropertiesInspector';
import { SceneNodeGraph } from './components/studio/SceneNodeGraph';
import { AIStudioModal } from './components/studio/AIStudioModal';
import { ExportModal } from './components/studio/ExportModal';
import { LearnerPlayerModal } from './components/player/LearnerPlayerModal';
import { AnalyticsHeatmapModal } from './components/studio/AnalyticsHeatmapModal';
import { NewProjectModal } from './components/studio/NewProjectModal';
import { DashboardView } from './components/studio/DashboardView';
import { QualityLinterModal } from './components/studio/QualityLinterModal';
import { ComparativeMatrixModal } from './components/studio/ComparativeMatrixModal';
import { TeamCollaborationModal } from './components/studio/TeamCollaborationModal';
import { Plus, Video, Trash2 } from 'lucide-react';

export default function App() {
  const [project, setProjectState] = useState<InteractiveProject>(() =>
    projectRepository.getActiveProject() || normalizeProject(MEDICAL_PROJECT)
  );
  const [historyPast, setHistoryPast] = useState<InteractiveProject[]>([]);
  const [historyFuture, setHistoryFuture] = useState<InteractiveProject[]>([]);
  const [saveStatusText, setSaveStatusText] = useState<string>('Sauvegardé');

  const [activeSceneId, setActiveSceneId] = useState<string>(project.startSceneId);
  const [activeView, setActiveView] = useState<'dashboard' | 'studio' | 'graph'>('studio');

  // Wrapper around setProject that records Undo/Redo history and persists to localStorage + backend
  const setProject = useCallback(
    (
      updater: InteractiveProject | ((prev: InteractiveProject) => InteractiveProject),
      options?: { skipHistory?: boolean }
    ) => {
      setProjectState((prev) => {
        const nextRaw = typeof updater === 'function' ? updater(prev) : updater;
        const next = normalizeProject(nextRaw);
        if (!options?.skipHistory) {
          setHistoryPast((past) => [...past.slice(-24), prev]);
          setHistoryFuture([]);
        }
        projectRepository.saveProject(next);
        setSaveStatusText('Auto-sauvegardé');
        return next;
      });
    },
    []
  );

  const handleUndo = useCallback(() => {
    setHistoryPast((past) => {
      if (past.length === 0) return past;
      const previous = past[past.length - 1];
      setProjectState((curr) => {
        setHistoryFuture((fut) => [curr, ...fut.slice(0, 24)]);
        projectRepository.saveProject(previous);
        return previous;
      });
      setSaveStatusText('Annulé (Undo)');
      return past.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setHistoryFuture((fut) => {
      if (fut.length === 0) return fut;
      const next = fut[0];
      setProjectState((curr) => {
        setHistoryPast((past) => [...past.slice(-24), curr]);
        projectRepository.saveProject(next);
        return next;
      });
      setSaveStatusText('Rétabli (Redo)');
      return fut.slice(1);
    });
  }, []);

  const handleManualSave = useCallback(() => {
    projectRepository.saveProject(project, {
      createSnapshot: true,
      snapshotLabel: `Sauvegarde manuelle (${new Date().toLocaleTimeString()})`,
      actor: project.metadata.author,
    });
    setSaveStatusText('Version enregistrée ✓');
  }, [project]);

  // Global keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+S)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo, handleManualSave]);

  // Video playback & playhead state
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Selected item on canvas / timeline
  const [selectedInteractionId, setSelectedInteractionId] = useState<string | null>(null);

  // Modals state
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isLearnerPlayerOpen, setIsLearnerPlayerOpen] = useState<boolean>(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState<boolean>(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState<boolean>(false);
  const [isQualityLinterOpen, setIsQualityLinterOpen] = useState<boolean>(false);
  const [isComparativeMatrixOpen, setIsComparativeMatrixOpen] = useState<boolean>(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState<boolean>(false);

  // Workspace panel collapse state (clean, uncluttered view)
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState<boolean>(false);
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState<boolean>(false);

  // Resolve active scene safely
  const activeScene: VideoScene =
    project.scenes.find((s) => s.id === activeSceneId) || project.scenes[0];

  // Resolve selected interaction safely
  const selectedInteraction: InteractionItem | null =
    activeScene.interactions.find((it) => it.id === selectedInteractionId) || null;

  // Project selector handler
  const handleSelectProject = (newProject: InteractiveProject) => {
    setProject(newProject);
    setActiveSceneId(newProject.startSceneId);
    setCurrentTime(0);
    setIsPlaying(false);
    setSelectedInteractionId(null);
  };

  // Switch scene handler
  const handleSelectScene = (sceneId: string) => {
    setActiveSceneId(sceneId);
    setCurrentTime(0);
    setIsPlaying(false);
    setSelectedInteractionId(null);
  };

  // Add new blank scene
  const handleAddScene = () => {
    const newId = `scene-${Date.now()}`;
    const newScene: VideoScene = {
      id: newId,
      title: `Nouvelle Scène ${project.scenes.length + 1}`,
      description: 'Description pédagogique de la scène interactive.',
      duration: 30,
      videoType: 'procedural',
      learningObjective: 'Définir l\'objectif d\'apprentissage principal.',
      interactions: [],
      layers: [],
      branchingChoices: [],
      graphNodePosition: {
        x: 100 + (project.scenes.length % 3) * 360,
        y: 120 + Math.floor(project.scenes.length / 3) * 220,
      },
    };

    setProject((prev) => ({
      ...prev,
      scenes: [...prev.scenes, newScene],
    }));
    setActiveSceneId(newId);
  };

  // Delete scene
  const handleDeleteScene = (sceneId: string) => {
    if (project.scenes.length <= 1) return;
    const remaining = project.scenes.filter((s) => s.id !== sceneId);
    setProject((prev) => ({
      ...prev,
      scenes: remaining,
      startSceneId: prev.startSceneId === sceneId ? remaining[0].id : prev.startSceneId,
    }));
    if (activeSceneId === sceneId) {
      setActiveSceneId(remaining[0].id);
    }
  };

  // Add interaction item at current playhead
  const handleAddInteraction = (type: InteractionType) => {
    const newId = `int-${Date.now()}`;
    let title = 'Nouvel Élément';
    let content = 'Contenu interactif personnalisé.';
    let quizData: QuizData | undefined;
    let object3dType: 'heart' | 'turbine' | 'server' | 'molecule' | undefined;
    let actionOnClick: 'open_popup' | 'open_link' | 'jump_to_time' | 'jump_to_scene' | undefined = 'open_popup';
    let popupTitle: string | undefined = undefined;
    let popupText: string | undefined = undefined;
    let popupImageUrl: string | undefined = undefined;
    let popupButtonText: string | undefined = undefined;
    let popupButtonUrl: string | undefined = undefined;
    let imageUrl: string | undefined = undefined;
    let fontSize: number | undefined = undefined;
    let textColor: string | undefined = undefined;
    let backgroundColor: string | undefined = undefined;
    let codeLanguage: string | undefined = undefined;
    let codeSnippet: string | undefined = undefined;
    let likertScale: { minLabel: string; maxLabel: string; steps: number } | undefined = undefined;

    if (type === 'hotspot') {
      title = 'Zone Sensible';
      content = 'Cliquez pour examiner le composant.';
      popupTitle = 'Information Détaillée';
      popupText = 'Explications complémentaires révélées au clic sur cette zone sensible.';
      popupButtonText = 'Consulter la ressource';
      popupButtonUrl = 'https://example.com';
    } else if (type === 'button') {
      title = 'Bouton d\'Action';
      content = 'En savoir plus';
      popupTitle = 'Information Pédagogique';
      popupText = 'Voici les détails et consignes déclenchés par ce bouton interactif.';
      popupButtonText = 'Continuer le module';
    } else if (type === 'text_overlay') {
      title = 'Bloc Texte';
      content = 'Consigne ou explication affichée directement sur la vidéo.';
      fontSize = 16;
      textColor = '#ffffff';
      backgroundColor = 'rgba(15, 23, 42, 0.85)';
    } else if (type === 'image_overlay') {
      title = 'Schéma / Image';
      content = 'Illustration incrustée sur la vidéo';
      imageUrl = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80';
      popupTitle = 'Vue Agrandie & Analyse';
      popupText = 'Détails du schéma technique et points de vigilance associés.';
    } else if (type === 'loom_bubble') {
      title = 'Bulle Présentateur';
      content = 'Présentateur virtuel avec narration';
      imageUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80';
    } else if (type === 'code_snippet') {
      title = 'Extrait de Code';
      content = 'Code interactif avec coloration';
      codeLanguage = 'typescript';
      codeSnippet = '// Validation opérationnelle\nfunction verifierConformite(score: number): boolean {\n  return score >= 80;\n}';
    } else if (type === 'audio_spot') {
      title = 'Point Audio';
      content = 'Écouter la consigne audio du formateur';
      popupTitle = 'Podcast & Narration';
      popupText = 'Explications orales complémentaires pour approfondir les compétences du module.';
    } else if (type === 'poll_likert') {
      title = 'Auto-Évaluation';
      content = 'Comment évaluez-vous votre compréhension de ce point clé ?';
      likertScale = { minLabel: 'À approfondir', maxLabel: 'Maîtrisé', steps: 5 };
    } else if (type === 'quiz') {
      title = 'Quiz de Validation';
      quizData = {
        type: 'multiple_choice',
        title: 'Quelle décision devez-vous prendre à ce stade ?',
        explanation: 'La conformité aux règles opérationnelles est obligatoire.',
        points: 20,
        isMultipleChoice: false,
        options: [
          { id: 'opt-1', text: 'Option A (Conforme aux bonnes pratiques)', isCorrect: true, feedback: 'Parfait !' },
          { id: 'opt-2', text: 'Option B (Non conforme)', isCorrect: false, feedback: 'Incorrect.' },
        ],
      };
    } else if (type === 'object_3d') {
      title = 'Inspection 3D';
      object3dType = project.metadata.category === 'Medical' ? 'heart' : project.metadata.category === 'Cybersecurity' ? 'server' : 'turbine';
    } else if (type === 'info_card') {
      title = 'Fiche Clé';
      content = 'Rappel des consignes de sécurité.';
    } else if (type === 'inventory_item') {
      title = 'Indice / Artefact';
      content = 'Objet collecté dans votre inventaire.';
    }

    const newItem: InteractionItem = {
      id: newId,
      type,
      title,
      timestamp: Math.round(currentTime * 10) / 10,
      duration: type === 'quiz' ? 15 : 8,
      pauseOnTrigger: type === 'quiz' || type === 'object_3d',
      xPercent: 50,
      yPercent: 50,
      widthPercent: 20,
      heightPercent: 20,
      styleVariant: 'glass',
      content,
      quiz: quizData,
      object3dType,
      actionOnClick,
      popupTitle,
      popupText,
      popupImageUrl,
      popupButtonText,
      popupButtonUrl,
      imageUrl,
      fontSize,
      textColor,
      backgroundColor,
      codeLanguage,
      codeSnippet,
      likertScale,
      triggers: [],
    };

    const updatedScenes = project.scenes.map((s) => {
      if (s.id === activeScene.id) {
        return {
          ...s,
          interactions: [...s.interactions, newItem],
        };
      }
      return s;
    });

    setProject((prev) => ({ ...prev, scenes: updatedScenes }));
    setSelectedInteractionId(newId);
  };

  // Add interaction at specific (x, y) click coordinates on video
  const handleAddInteractionAtPosition = (type: InteractionType, xPercent: number, yPercent: number) => {
    const newId = `int-${Date.now()}`;
    let title = 'Nouvel Élément';
    let content = 'Contenu interactif.';
    let quizData: QuizData | undefined;
    let object3dType: 'heart' | 'turbine' | 'server' | 'molecule' | undefined;
    let actionOnClick: 'open_popup' | 'open_link' | 'jump_to_time' | 'jump_to_scene' | undefined = 'open_popup';
    let popupTitle: string | undefined = undefined;
    let popupText: string | undefined = undefined;
    let popupImageUrl: string | undefined = undefined;
    let popupButtonText: string | undefined = undefined;
    let popupButtonUrl: string | undefined = undefined;
    let imageUrl: string | undefined = undefined;
    let fontSize: number | undefined = undefined;
    let textColor: string | undefined = undefined;
    let backgroundColor: string | undefined = undefined;
    let codeLanguage: string | undefined = undefined;
    let codeSnippet: string | undefined = undefined;
    let likertScale: { minLabel: string; maxLabel: string; steps: number } | undefined = undefined;

    if (type === 'hotspot') {
      title = 'Zone Sensible';
      content = 'Information révélée au clic de l\'apprenant.';
      popupTitle = 'Information Détaillée';
      popupText = 'Explications complémentaires révélées au clic sur cette zone sensible.';
      popupButtonText = 'Consulter la ressource';
      popupButtonUrl = 'https://example.com';
    } else if (type === 'button') {
      title = 'Bouton d\'Action';
      content = 'En savoir plus';
      popupTitle = 'Information Pédagogique';
      popupText = 'Voici les détails et consignes déclenchés par ce bouton interactif.';
      popupButtonText = 'Continuer le module';
    } else if (type === 'text_overlay') {
      title = 'Bloc Texte';
      content = 'Consigne ou explication affichée directement sur la vidéo.';
      fontSize = 16;
      textColor = '#ffffff';
      backgroundColor = 'rgba(15, 23, 42, 0.85)';
    } else if (type === 'image_overlay') {
      title = 'Schéma / Image';
      content = 'Illustration incrustée sur la vidéo';
      imageUrl = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80';
      popupTitle = 'Zoom sur l\'illustration';
      popupText = 'Explications techniques détaillées relatives au schéma graphique.';
    } else if (type === 'loom_bubble') {
      title = 'Bulle Présentateur';
      content = 'Présentateur virtuel avec narration';
      imageUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80';
    } else if (type === 'code_snippet') {
      title = 'Extrait de Code';
      content = 'Code interactif avec coloration';
      codeLanguage = 'typescript';
      codeSnippet = '// Validation opérationnelle\nfunction verifierConformite(score: number): boolean {\n  return score >= 80;\n}';
    } else if (type === 'audio_spot') {
      title = 'Point Audio';
      content = 'Écouter la consigne audio du formateur';
      popupTitle = 'Podcast & Narration';
      popupText = 'Explications orales complémentaires pour approfondir les compétences du module.';
    } else if (type === 'poll_likert') {
      title = 'Auto-Évaluation';
      content = 'Comment évaluez-vous votre compréhension de ce point clé ?';
      likertScale = { minLabel: 'À approfondir', maxLabel: 'Maîtrisé', steps: 5 };
    } else if (type === 'quiz') {
      title = 'Question Interactive';
      quizData = {
        type: 'multiple_choice',
        title: 'Vérification de compréhension immédiate :',
        explanation: 'Réponse correcte indispensable pour la validation du protocole.',
        points: 20,
        isMultipleChoice: false,
        options: [
          { id: 'opt-1', text: 'Option A (Conforme aux bonnes pratiques)', isCorrect: true, feedback: 'Exactement !' },
          { id: 'opt-2', text: 'Option B (Non conforme)', isCorrect: false, feedback: 'Attention au risque...' },
        ],
      };
    } else if (type === 'object_3d') {
      title = 'Modèle 3D';
      object3dType = project.metadata.category === 'Medical' ? 'heart' : project.metadata.category === 'Cybersecurity' ? 'server' : 'turbine';
    } else if (type === 'info_card') {
      title = 'Consigne Pédagogique';
      content = 'Consultez attentivement les données affichées à l\'écran.';
    } else if (type === 'inventory_item') {
      title = 'Indice / Artefact';
      content = 'Objet collecté dans votre inventaire.';
    }

    const newItem: InteractionItem = {
      id: newId,
      type,
      title,
      timestamp: Math.round(currentTime * 10) / 10,
      duration: type === 'quiz' ? 15 : 8,
      pauseOnTrigger: type === 'quiz' || type === 'object_3d',
      xPercent,
      yPercent,
      widthPercent: 20,
      heightPercent: 20,
      styleVariant: 'glass',
      content,
      quiz: quizData,
      object3dType,
      actionOnClick,
      popupTitle,
      popupText,
      popupImageUrl,
      popupButtonText,
      popupButtonUrl,
      imageUrl,
      fontSize,
      textColor,
      backgroundColor,
      codeLanguage,
      codeSnippet,
      likertScale,
      triggers: [],
    };

    const updatedScenes = project.scenes.map((s) => {
      if (s.id === activeScene.id) {
        return {
          ...s,
          interactions: [...s.interactions, newItem],
        };
      }
      return s;
    });

    setProject((prev) => ({ ...prev, scenes: updatedScenes }));
    setSelectedInteractionId(newId);
  };

  // Duplicate an interaction item
  const handleDuplicateInteraction = (id: string) => {
    const item = activeScene.interactions.find((it) => it.id === id);
    if (!item) return;
    const duplicateId = `int-${Date.now()}`;
    const duplicated: InteractionItem = {
      ...JSON.parse(JSON.stringify(item)),
      id: duplicateId,
      title: `${item.title} (Copie)`,
      xPercent: Math.min(88, item.xPercent + 4),
      yPercent: Math.min(88, item.yPercent + 4),
    };
    const updatedScenes = project.scenes.map((s) => {
      if (s.id === activeScene.id) {
        return { ...s, interactions: [...s.interactions, duplicated] };
      }
      return s;
    });
    setProject((prev) => ({ ...prev, scenes: updatedScenes }));
    setSelectedInteractionId(duplicateId);
  };

  // Update scene properties (mediaMode, slideImageUrl, duration, title, etc.)
  const handleUpdateScene = (updatedFields: Partial<VideoScene>) => {
    const updatedScenes = project.scenes.map((s) => {
      if (s.id === activeScene.id) {
        return { ...s, ...updatedFields };
      }
      return s;
    });
    setProject((prev) => ({ ...prev, scenes: updatedScenes }));
  };

  // Update scene video URL (and duration if video metadata provides it)
  const handleUpdateSceneVideoUrl = (videoUrl: string, duration?: number) => {
    const updatedScenes = project.scenes.map((s) => {
      if (s.id === activeScene.id) {
        return {
          ...s,
          videoUrl,
          duration: duration || s.duration,
        };
      }
      return s;
    });
    setProject((prev) => ({ ...prev, scenes: updatedScenes }));
  };

  // Update interaction duration on timeline
  const handleUpdateInteractionDuration = (id: string, newDuration: number) => {
    const updatedScenes = project.scenes.map((s) => {
      if (s.id === activeScene.id) {
        return {
          ...s,
          interactions: s.interactions.map((it) => (it.id === id ? { ...it, duration: newDuration } : it)),
        };
      }
      return s;
    });
    setProject((prev) => ({ ...prev, scenes: updatedScenes }));
  };

  // Delete interaction
  const handleDeleteInteraction = (interactionId: string) => {
    const updatedScenes = project.scenes.map((s) => {
      if (s.id === activeScene.id) {
        return {
          ...s,
          interactions: s.interactions.filter((it) => it.id !== interactionId),
        };
      }
      return s;
    });
    setProject((prev) => ({ ...prev, scenes: updatedScenes }));
    if (selectedInteractionId === interactionId) {
      setSelectedInteractionId(null);
    }
  };

  // Update interaction position on canvas
  const handleUpdateInteractionPosition = (id: string, xPercent: number, yPercent: number) => {
    const updatedScenes = project.scenes.map((s) => {
      if (s.id === activeScene.id) {
        return {
          ...s,
          interactions: s.interactions.map((it) => {
            if (it.id === id) {
              return { ...it, xPercent, yPercent };
            }
            return it;
          }),
        };
      }
      return s;
    });
    setProject((prev) => ({ ...prev, scenes: updatedScenes }));
  };

  // Update interaction properties from inspector
  const handleUpdateInteraction = (updated: InteractionItem) => {
    const updatedScenes = project.scenes.map((s) => {
      if (s.id === activeScene.id) {
        return {
          ...s,
          interactions: s.interactions.map((it) => (it.id === updated.id ? updated : it)),
        };
      }
      return s;
    });
    setProject((prev) => ({ ...prev, scenes: updatedScenes }));
  };

  // Update project variables
  const handleUpdateProjectVariables = (variables: Record<string, VariableDefinition>) => {
    setProject((prev) => ({ ...prev, variables }));
  };

  // Add trigger to interaction
  const handleAddTriggerToInteraction = (interactionId: string, trigger: TriggerRule) => {
    const updatedScenes = project.scenes.map((s) => {
      if (s.id === activeScene.id) {
        return {
          ...s,
          interactions: s.interactions.map((it) => {
            if (it.id === interactionId) {
              return { ...it, triggers: [...(it.triggers || []), trigger] };
            }
            return it;
          }),
        };
      }
      return s;
    });
    setProject((prev) => ({ ...prev, scenes: updatedScenes }));
  };

  // Remove trigger from interaction
  const handleRemoveTriggerFromInteraction = (interactionId: string, triggerId: string) => {
    const updatedScenes = project.scenes.map((s) => {
      if (s.id === activeScene.id) {
        return {
          ...s,
          interactions: s.interactions.map((it) => {
            if (it.id === interactionId) {
              return { ...it, triggers: (it.triggers || []).filter((t) => t.id !== triggerId) };
            }
            return it;
          }),
        };
      }
      return s;
    });
    setProject((prev) => ({ ...prev, scenes: updatedScenes }));
  };

  // Apply AI Storyboard
  const handleApplyStoryboard = (scenes: VideoScene[]) => {
    setProject((prev) => {
      const normalized = normalizeProject({
        ...prev,
        scenes,
        startSceneId: scenes[0]?.id || prev.startSceneId,
      });
      return normalized;
    });
    setActiveSceneId(scenes[0]?.id || activeSceneId);
  };

  // Apply AI Scanned Interactions
  const handleApplyInteractions = (interactions: InteractionItem[]) => {
    const safeInteractions = (interactions || []).map((it, idx) => ({
      ...it,
      id: it.id || `ai-int-${Date.now()}-${idx}`,
      triggers: Array.isArray(it.triggers) ? it.triggers : [],
    }));
    const updatedScenes = project.scenes.map((s) => {
      if (s.id === activeScene.id) {
        return {
          ...s,
          interactions: [...(s.interactions || []), ...safeInteractions],
        };
      }
      return s;
    });
    setProject((prev) => ({ ...prev, scenes: updatedScenes }));
  };

  // Apply AI Generated Quiz Questions
  const handleApplyQuizQuestions = (questions: QuizData[]) => {
    const newItems: InteractionItem[] = questions.map((q, idx) => ({
      id: `ai-quiz-${Date.now()}-${idx}`,
      type: 'quiz',
      title: q.title,
      timestamp: Math.min(activeScene.duration - 2, 8 + idx * 7),
      duration: 15,
      pauseOnTrigger: true,
      xPercent: 50,
      yPercent: 50,
      widthPercent: 60,
      heightPercent: 65,
      styleVariant: 'glass',
      quiz: q,
      triggers: [],
    }));

    const updatedScenes = project.scenes.map((s) => {
      if (s.id === activeScene.id) {
        return {
          ...s,
          interactions: [...s.interactions, ...newItems],
        };
      }
      return s;
    });
    setProject((prev) => ({ ...prev, scenes: updatedScenes }));
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* 1. Universal Top Navigation Bar */}
      <TopNavbar
        currentProject={project}
        onSelectProject={handleSelectProject}
        onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
        activeView={activeView}
        onChangeView={setActiveView}
        onOpenAiStudio={() => setIsAiModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenAnalytics={() => setIsAnalyticsModalOpen(true)}
        onOpenLearnerPlayer={() => setIsLearnerPlayerOpen(true)}
        onOpenQualityLinter={() => setIsQualityLinterOpen(true)}
        onOpenComparativeMatrix={() => setIsComparativeMatrixOpen(true)}
        onOpenTeamModal={() => setIsTeamModalOpen(true)}
        canUndo={historyPast.length > 0}
        canRedo={historyFuture.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onManualSave={handleManualSave}
        saveStatusText={saveStatusText}
      />

      {/* 2. Scene Selector Strip (Displayed in Studio mode) */}
      {activeView === 'studio' && (
        <div className="h-10 px-6 border-b border-slate-800/80 bg-slate-950 flex items-center justify-between z-20 text-xs">
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px] mr-1">
              Scènes :
            </span>
          {project.scenes.map((scene, idx) => {
            const isActive = scene.id === activeScene.id;
            return (
              <div
                key={scene.id}
                onClick={() => handleSelectScene(scene.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg cursor-pointer whitespace-nowrap transition-colors border ${
                  isActive
                    ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 font-semibold shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Video className="w-3 h-3 text-indigo-400" />
                <span>
                  {idx + 1}. {scene.title}
                </span>
                <span className="text-[10px] font-mono text-slate-500 ml-1">
                  ({scene.duration}s)
                </span>
                {project.scenes.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteScene(scene.id);
                    }}
                    className="p-0.5 hover:text-red-400 ml-1 text-slate-500"
                    title="Supprimer la scène"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            );
          })}
          <button
            onClick={handleAddScene}
            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500 text-slate-400 hover:text-white flex items-center gap-1 text-[11px] transition-colors"
          >
            <Plus className="w-3 h-3 text-indigo-400" />
            <span>Ajouter Scène</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-slate-400 text-[11px]">
          <span>Projet : <strong className="text-slate-200">{project.metadata.category}</strong></span>
          <span>·</span>
          <span>SCORM Passing : <strong className="text-emerald-400 font-mono">{project.scormSettings.passingScorePercent}%</strong></span>
        </div>
      </div>
      )}

      {/* 3. Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {activeView === 'dashboard' ? (
          <DashboardView
            currentProject={project}
            onSelectProject={handleSelectProject}
            onOpenNewProject={() => setIsNewProjectModalOpen(true)}
            onOpenAiStudio={() => setIsAiModalOpen(true)}
            onOpenExport={() => setIsExportModalOpen(true)}
            onOpenLearnerPlayer={() => setIsLearnerPlayerOpen(true)}
            onOpenAnalytics={() => setIsAnalyticsModalOpen(true)}
            onOpenQualityLinter={() => setIsQualityLinterOpen(true)}
            onOpenComparativeMatrix={() => setIsComparativeMatrixOpen(true)}
            onOpenTeamModal={() => setIsTeamModalOpen(true)}
            onSwitchToStudio={() => setActiveView('studio')}
            onSwitchToGraph={() => setActiveView('graph')}
          />
        ) : activeView === 'studio' ? (
          <>
            {/* Center: Stage + Multi-track Timeline */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Interactive Video Stage (WYSIWYG) */}
              <div className="flex-1 relative overflow-hidden">
                <CanvasStage
                  scene={activeScene}
                  currentTime={currentTime}
                  isPlaying={isPlaying}
                  onTogglePlay={() => setIsPlaying(!isPlaying)}
                  onSeek={(t) => setCurrentTime(t)}
                  selectedInteractionId={selectedInteractionId}
                  onSelectInteraction={setSelectedInteractionId}
                  onUpdateInteractionPosition={handleUpdateInteractionPosition}
                  onAddInteractionAtPosition={handleAddInteractionAtPosition}
                  onDeleteInteraction={handleDeleteInteraction}
                  onDuplicateInteraction={handleDuplicateInteraction}
                  onUpdateInteraction={handleUpdateInteraction}
                  onUpdateScene={handleUpdateScene}
                  onUpdateSceneVideoUrl={handleUpdateSceneVideoUrl}
                  category={project.metadata.category}
                  isTimelineCollapsed={isTimelineCollapsed}
                  onToggleCollapseTimeline={() => setIsTimelineCollapsed(!isTimelineCollapsed)}
                  isInspectorCollapsed={isInspectorCollapsed}
                  onToggleCollapseInspector={() => setIsInspectorCollapsed(!isInspectorCollapsed)}
                />
              </div>

              {/* Multi-Track Timeline (Bottom) - Collapsible for full uncluttered workspace */}
              {!isTimelineCollapsed && (
                <div className="h-56 shrink-0 relative transition-all">
                  <TimelineMultiTrack
                    scene={activeScene}
                    currentTime={currentTime}
                    isPlaying={isPlaying}
                    onTogglePlay={() => setIsPlaying(!isPlaying)}
                    onSeek={(t) => setCurrentTime(t)}
                    selectedInteractionId={selectedInteractionId}
                    onSelectInteraction={setSelectedInteractionId}
                    onAddInteraction={handleAddInteraction}
                    onDeleteInteraction={handleDeleteInteraction}
                    onUpdateInteractionTime={(id, t) => {
                      const it = activeScene.interactions.find((x) => x.id === id);
                      if (it) handleUpdateInteraction({ ...it, timestamp: t });
                    }}
                    onUpdateInteractionDuration={handleUpdateInteractionDuration}
                  />
                </div>
              )}
            </div>

            {/* Right: Storyline Properties Inspector - Collapsible for clean layout */}
            {!isInspectorCollapsed && (
              <PropertiesInspector
                project={project}
                activeScene={activeScene}
                selectedInteraction={selectedInteraction}
                onUpdateInteraction={handleUpdateInteraction}
                onUpdateProjectVariables={handleUpdateProjectVariables}
                onAddTriggerToInteraction={handleAddTriggerToInteraction}
                onRemoveTriggerFromInteraction={handleRemoveTriggerFromInteraction}
              />
            )}
          </>
        ) : (
          /* Visual Node Branching Graph View */
          <div className="flex-1 h-full overflow-hidden">
            <SceneNodeGraph
              project={project}
              activeSceneId={activeScene.id}
              onSelectScene={(id) => {
                setActiveSceneId(id);
                setActiveView('studio');
              }}
              onAddScene={handleAddScene}
              onUpdateProject={(updated) => setProject(updated)}
            />
          </div>
        )}
      </div>

      {/* 4. Modals */}
      <AIStudioModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        activeScene={activeScene}
        onApplyStoryboard={handleApplyStoryboard}
        onApplyInteractions={handleApplyInteractions}
        onApplyQuizQuestions={handleApplyQuizQuestions}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        project={project}
        onUpdateProject={setProject}
      />

      <LearnerPlayerModal
        isOpen={isLearnerPlayerOpen}
        onClose={() => setIsLearnerPlayerOpen(false)}
        project={project}
      />

      <AnalyticsHeatmapModal
        isOpen={isAnalyticsModalOpen}
        onClose={() => setIsAnalyticsModalOpen(false)}
        scene={activeScene}
      />

      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onCreateProject={(newProj) => {
          handleSelectProject(newProj);
          setIsNewProjectModalOpen(false);
        }}
      />

      <QualityLinterModal
        isOpen={isQualityLinterOpen}
        onClose={() => setIsQualityLinterOpen(false)}
        project={project}
        onUpdateProject={setProject}
        onSelectScene={(id) => {
          setActiveSceneId(id);
          setActiveView('studio');
        }}
      />

      <ComparativeMatrixModal
        isOpen={isComparativeMatrixOpen}
        onClose={() => setIsComparativeMatrixOpen(false)}
      />

      <TeamCollaborationModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        project={project}
      />
    </div>
  );
}
