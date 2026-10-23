import React, { useState, useEffect, useRef } from 'react';
import {
  InteractiveProject,
  VideoScene,
  InteractionItem,
  QuizData,
} from '../../types';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  X,
  Award,
  Box,
  Compass,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Briefcase,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Check,
  MousePointerClick,
  Type,
  Image as ImageIcon,
  Copy,
  Mic,
  Star,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ThreeDObjectViewer } from '../studio/ThreeDObjectViewer';
import { RichPopupModal } from './RichPopupModal';
import { getAdaptiveFeedback, playTtsVoiceover } from '../../services/geminiService';
import { soundFX } from '../../services/soundEffects';
import { analyticsService } from '../../services/analyticsService';
import {
  executeTriggersForEvent,
  projectRepository,
  LearnerAssessmentRecord,
} from '../../services/projectEngine';

interface LearnerPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: InteractiveProject;
}

export const LearnerPlayerModal: React.FC<LearnerPlayerModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  const [currentSceneId, setCurrentSceneId] = useState(project.startSceneId);
  const currentScene =
    project.scenes.find((s) => s.id === currentSceneId) || project.scenes[0];

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [score, setScore] = useState(0);
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>([]);
  const [inventory, setInventory] = useState(project.gamification.inventory || []);
  const [active3DType, setActive3DType] = useState<'heart' | 'turbine' | 'server' | 'molecule' | null>(null);
  const [choicesHistory, setChoicesHistory] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState<string[]>([]);

  // PiP (Picture-in-Picture) secondary video state
  const [showPipVideo, setShowPipVideo] = useState(false);

  // Visual effects state (shake / halo)
  const [isScreenShaking, setIsScreenShaking] = useState(false);
  const [isLuminousHalo, setIsLuminousHalo] = useState(false);

  // Timed quiz countdown
  const [quizTimeLeft, setQuizTimeLeft] = useState<number | null>(null);

  // Quiz active state
  const [activeQuizItem, setActiveQuizItem] = useState<InteractionItem | null>(null);
  const [selectedQuizOption, setSelectedQuizOption] = useState<string | null>(null);
  const [selectedMultipleOptions, setSelectedMultipleOptions] = useState<string[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [sequenceOrder, setSequenceOrder] = useState<string[]>([]);
  const [activeRichPopup, setActiveRichPopup] = useState<InteractionItem | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [likertVotes, setLikertVotes] = useState<{ [id: string]: number }>({});
  const [speakingPresenter, setSpeakingPresenter] = useState<boolean>(true);

  // AI Debriefing modal
  const [showDebrief, setShowDebrief] = useState(false);
  const [debriefData, setDebriefData] = useState<any>(null);
  const [isLoadingDebrief, setIsLoadingDebrief] = useState(false);
  const [runtimeVariables, setRuntimeVariables] = useState(() =>
    JSON.parse(JSON.stringify(project.variables || {}))
  );
  const [lastCertificateId, setLastCertificateId] = useState<string | undefined>(undefined);
  const [visitedScenes, setVisitedScenes] = useState<string[]>([project.startSceneId]);
  const [answersGiven, setAnswersGiven] = useState<
    { interactionId: string; questionTitle: string; correct: boolean; pointsEarned: number }[]
  >([]);

  // Track already-triggered pause items so resuming doesn't re-pause at the same millisecond (Section 10.1)
  const triggeredPauseIdsRef = useRef<Set<string>>(new Set());

  // Canvas & Video refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Sync HTML5 video if currentScene has videoUrl
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !currentScene.videoUrl) return;
    if (isPlaying && !activeQuizItem && !active3DType && !showDebrief) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [isPlaying, activeQuizItem, active3DType, showDebrief, currentScene.videoUrl, currentSceneId]);

  const applyRuleTriggers = (
    event: 'on_click' | 'on_quiz_correct' | 'on_quiz_incorrect' | 'on_timeline_reach',
    item: InteractionItem
  ) => {
    if (!item.triggers || item.triggers.length === 0) return;
    const res = executeTriggersForEvent(event, item.triggers, {
      variables: runtimeVariables,
      currentSceneId,
      currentTime,
      isPlaying,
      score,
      inventory: inventory.map((i) => i.name),
      activeLayers: [],
    });
    setRuntimeVariables(res.updatedVariables);
    if (res.shouldPause) setIsPlaying(false);
    if (res.shouldResume) setIsPlaying(true);
    if (typeof res.targetTime === 'number') setCurrentTime(res.targetTime);
    if (res.targetSceneId && project.scenes.some((s) => s.id === res.targetSceneId)) {
      triggeredPauseIdsRef.current.clear();
      setCurrentSceneId(res.targetSceneId);
      setVisitedScenes((prev) => (prev.includes(res.targetSceneId!) ? prev : [...prev, res.targetSceneId!]));
      setCurrentTime(0);
    }
  };

  // Playback timer loop
  useEffect(() => {
    if (!isOpen) return;
    let animId: number;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;

      if (isPlaying && !activeQuizItem && !active3DType && !showDebrief) {
        setCurrentTime((prev) => {
          const next = prev + dt;
          if (next >= currentScene.duration) {
            setIsPlaying(false);
            return currentScene.duration;
          }
          return next;
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, isPlaying, activeQuizItem, active3DType, showDebrief, currentScene.duration]);

  // Check for pause triggers at currentTime (with deduplication per pass - Section 10.1)
  useEffect(() => {
    if (!isPlaying) return;

    (currentScene.interactions || []).forEach((item) => {
      const isHit = Math.abs(currentTime - item.timestamp) < 0.45;
      if (isHit && !triggeredPauseIdsRef.current.has(item.id)) {
        if (item.pauseOnTrigger) {
          triggeredPauseIdsRef.current.add(item.id);
          if (item.type === 'quiz') {
            setIsPlaying(false);
            setActiveQuizItem(item);
            setSelectedQuizOption(null);
            setQuizSubmitted(false);
            if (item.quiz?.sequenceItems) {
              setSequenceOrder(item.quiz.sequenceItems.map((s) => s.id));
            }
          } else if (item.type === 'object_3d') {
            setIsPlaying(false);
            setActive3DType(item.object3dType || 'heart');
          }
        }
        applyRuleTriggers('on_timeline_reach', item);
      }
    });
  }, [currentTime, currentScene.interactions, isPlaying]);

  // Procedural canvas video rendering for learner
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Gradient styling
    const grad = ctx.createRadialGradient(w / 2, h / 2, 60, w / 2, h / 2, w);
    if (project.metadata.category === 'Medical') {
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(0.5, '#0f172a');
      grad.addColorStop(1, '#020617');
    } else if (project.metadata.category === 'Cybersecurity') {
      grad.addColorStop(0, '#042f2e');
      grad.addColorStop(0.5, '#022c22');
      grad.addColorStop(1, '#020617');
    } else {
      grad.addColorStop(0, '#064e3b');
      grad.addColorStop(0.5, '#022c22');
      grad.addColorStop(1, '#020617');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Glowing wave
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = 0; x < w; x += 10) {
      const y = h / 2 + Math.sin(x * 0.015 + currentTime * 2.5) * 35;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Scene Title Overlay
    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(currentScene.title, 32, 44);

    ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
    ctx.font = '13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(currentScene.learningObjective, 32, 70);
  }, [currentTime, currentScene, project.metadata.category]);

  const handleSelectBranch = (targetSceneId: string, label: string) => {
    soundFX.play('transition');
    triggeredPauseIdsRef.current.clear();
    setChoicesHistory((prev) => [...prev, label]);
    setVisitedScenes((prev) => (prev.includes(targetSceneId) ? prev : [...prev, targetSceneId]));
    setCurrentSceneId(targetSceneId);
    setCurrentTime(0);
    setIsPlaying(true);
    setActiveQuizItem(null);
  };

  const handleQuizAnswer = (optId: string) => {
    if (quizSubmitted || !activeQuizItem?.quiz) return;
    soundFX.play('click');
    setSelectedQuizOption(optId);
    setQuizSubmitted(true);

    const chosen = activeQuizItem.quiz.options?.find((o) => o.id === optId);
    const pts = activeQuizItem.quiz.points || 20;
    if (chosen?.isCorrect) {
      soundFX.play('correct');
      setIsLuminousHalo(true);
      setTimeout(() => setIsLuminousHalo(false), 900);
      setScore((s) => s + pts);
      setAnswersGiven((prev) => [
        ...prev,
        {
          interactionId: activeQuizItem.id,
          questionTitle: activeQuizItem.quiz?.title || activeQuizItem.title,
          correct: true,
          pointsEarned: pts,
        },
      ]);
      applyRuleTriggers('on_quiz_correct', activeQuizItem);
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.65 } });
      playTtsVoiceover('Excellente réponse !');
    } else {
      soundFX.play('wrong');
      setIsScreenShaking(true);
      setTimeout(() => setIsScreenShaking(false), 500);
      setMistakes((m) => [...m, activeQuizItem.quiz?.title || 'Question']);
      setAnswersGiven((prev) => [
        ...prev,
        {
          interactionId: activeQuizItem.id,
          questionTitle: activeQuizItem.quiz?.title || activeQuizItem.title,
          correct: false,
          pointsEarned: 0,
        },
      ]);
      applyRuleTriggers('on_quiz_incorrect', activeQuizItem);
    }
  };

  const handleValidateMultipleChoice = () => {
    if (quizSubmitted || !activeQuizItem?.quiz) return;
    setQuizSubmitted(true);
    const allOptions = activeQuizItem.quiz.options || [];
    const correctIds = allOptions.filter((o) => o.isCorrect).map((o) => o.id);
    const isAllCorrect =
      correctIds.length === selectedMultipleOptions.length &&
      correctIds.every((id) => selectedMultipleOptions.includes(id));

    if (isAllCorrect) {
      soundFX.play('correct');
      setIsLuminousHalo(true);
      setTimeout(() => setIsLuminousHalo(false), 900);
      const pts = activeQuizItem.quiz.points || 20;
      setScore((s) => s + pts);
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.65 } });
      playTtsVoiceover('Excellente sélection, toutes les bonnes réponses ont été cochées !');
    } else {
      soundFX.play('wrong');
      setIsScreenShaking(true);
      setTimeout(() => setIsScreenShaking(false), 500);
      setMistakes((m) => [...m, activeQuizItem.quiz?.title || 'Question à choix multiples']);
    }
  };

  const handleSequenceMove = (fromIndex: number, toIndex: number) => {
    soundFX.play('click');
    const updated = [...sequenceOrder];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setSequenceOrder(updated);
  };

  const handleValidateSequence = () => {
    if (!activeQuizItem?.quiz?.correctSequence) return;
    setQuizSubmitted(true);
    const isCorrect =
      JSON.stringify(sequenceOrder) === JSON.stringify(activeQuizItem.quiz.correctSequence);
    if (isCorrect) {
      soundFX.play('correct');
      setIsLuminousHalo(true);
      setTimeout(() => setIsLuminousHalo(false), 900);
      setScore((s) => s + (activeQuizItem.quiz?.points || 25));
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      playTtsVoiceover('Ordre chronologique parfaitement respecté.');
    } else {
      soundFX.play('wrong');
      setIsScreenShaking(true);
      setTimeout(() => setIsScreenShaking(false), 500);
      setMistakes((m) => [...m, 'Séquence ordonnée']);
    }
  };

  const handleOpenDebrief = async () => {
    setIsLoadingDebrief(true);
    setShowDebrief(true);

    // Record real learner assessment in persistence engine
    const maxScore = 100;
    const pct = Math.min(100, Math.round((score / maxScore) * 100));
    const passed = pct >= (project.scormSettings?.passingScorePercent || 75);
    const savedRecord = projectRepository.recordAssessment({
      projectId: project.metadata.id,
      projectTitle: project.metadata.title,
      learnerName: 'Apprenant Certifié',
      score,
      maxScore,
      percentage: pct,
      passed,
      timeSpentSeconds: Math.round(currentTime),
      visitedScenes,
      answersGiven,
    });
    setLastCertificateId(savedRecord.certificateId);

    try {
      const res = await getAdaptiveFeedback(
        'Apprenant',
        score,
        100,
        choicesHistory,
        mistakes,
        score > 70 ? 'confiant' : 'hésitant'
      );
      setDebriefData(res.feedback);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingDebrief(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col select-none">
      {/* Learner Top Header Bar */}
      <div className="h-14 px-6 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-sm font-semibold text-slate-100 truncate max-w-md">
            {project.metadata.title}
          </h2>
          <span className="text-xs text-slate-500">· {currentScene.title}</span>
        </div>

        {/* Gamification HUD */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
            <Award className="w-4 h-4 text-indigo-400" />
            <span>Score : <strong className="text-white text-sm font-bold">{score}</strong> / 100</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
            <Briefcase className="w-3.5 h-3.5 text-amber-400" />
            <span>Inventaire ({inventory.length})</span>
          </div>

          <button
            onClick={() => setShowPipVideo(!showPipVideo)}
            className={`px-2.5 py-1 rounded-full border text-xs font-mono transition-colors ${
              showPipVideo ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
            title="Activer la vidéo secondaire en Picture-in-Picture"
          >
            PiP
          </button>

          <button
            onClick={handleOpenDebrief}
            className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-sans font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Bilan IA & Débrief</span>
          </button>

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            title="Quitter le mode apprenant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Video Stage Viewport */}
      <div
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
          const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
          analyticsService.recordClick(xPercent, yPercent, currentTime, 'click');
        }}
        className={`flex-1 relative bg-slate-950 flex items-center justify-center overflow-hidden transition-all ${
          isScreenShaking ? 'animate-shake' : ''
        } ${isLuminousHalo ? 'animate-halo' : ''}`}
      >
        {/* Background Canvas or Slide/Hybrid Presentation */}
        {currentScene.mediaMode === 'slide' || currentScene.mediaMode === 'hybrid_loom' ? (
          <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 select-none">
            {currentScene.slideImageUrl && (
              <img
                src={currentScene.slideImageUrl}
                alt={currentScene.title}
                className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none"
              />
            )}
            <div className="relative z-10 max-w-2xl text-center space-y-3">
              <span className="text-[11px] font-mono uppercase tracking-widest text-indigo-400 font-semibold px-2.5 py-1 rounded-full bg-indigo-950/60 border border-indigo-500/30">
                Diapositive Interactive
              </span>
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                {currentScene.title}
              </h2>
              {currentScene.learningObjective && (
                <p className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
                  {currentScene.learningObjective}
                </p>
              )}
            </div>
          </div>
        ) : currentScene.videoUrl ? (
          <video
            ref={videoRef}
            src={currentScene.videoUrl}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            onTimeUpdate={(e) => {
              const t = e.currentTarget.currentTime;
              if (Math.abs(t - currentTime) > 0.35) {
                setCurrentTime(t);
              }
            }}
          />
        ) : (
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Picture-in-Picture Secondary Video Overlay */}
        {showPipVideo && (
          <div className="absolute top-4 right-4 z-30 w-64 aspect-video rounded-xl overflow-hidden border border-indigo-500/60 shadow-2xl bg-slate-900">
            <video
              src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute top-1 left-2 text-[9px] font-mono font-bold text-white px-1.5 py-0.5 rounded bg-black/60">
              FLUX SECONDAIRE (PiP)
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPipVideo(false);
              }}
              className="absolute top-1 right-1 p-1 rounded bg-black/60 text-white hover:bg-black"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* 3D Object Overlay if active */}
        {active3DType && (
          <div className="absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-md p-8 flex items-center justify-center">
            <div className="w-full max-w-2xl h-[420px]">
              <ThreeDObjectViewer
                type={active3DType}
                title={`Manipulation 3D : ${active3DType.toUpperCase()}`}
                onClose={() => {
                  setActive3DType(null);
                  setIsPlaying(true);
                }}
              />
            </div>
          </div>
        )}

        {/* Interactive Overlays on the video */}
        {currentScene.interactions.map((item) => {
          const isVisible =
            currentTime >= item.timestamp &&
            currentTime <= item.timestamp + (item.duration || 8);
          if (!isVisible || activeQuizItem) return null;

          return (
            <div
              key={item.id}
              style={{
                left: `${item.xPercent}%`,
                top: `${item.yPercent}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className="absolute z-20 transition-all duration-300"
            >
              {/* Type: Hotspot */}
              {item.type === 'hotspot' && (
                <button
                  onClick={() => {
                    if (item.actionOnClick === 'open_popup' || !item.actionOnClick) {
                      setIsPlaying(false);
                      soundFX.play('click');
                      setActiveRichPopup(item);
                      setScore((s) => s + 10);
                    } else if (item.actionOnClick === 'open_link' && (item.targetUrl || item.popupButtonUrl)) {
                      window.open(item.targetUrl || item.popupButtonUrl, '_blank');
                    } else if (item.actionOnClick === 'jump_to_time' && item.targetTime !== undefined) {
                      soundFX.play('transition');
                      setCurrentTime(item.targetTime);
                    }
                  }}
                  className="relative group p-1"
                >
                  <div className="w-12 h-12 rounded-full bg-indigo-500/40 border-2 border-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/50 group-hover:scale-110 active:scale-95 transition-transform">
                    <div className="w-4 h-4 rounded-full bg-indigo-400 animate-ping" />
                  </div>
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 rounded-lg bg-slate-950/90 border border-slate-700 text-xs font-semibold text-slate-100 shadow-xl">
                    {item.title}
                  </div>
                </button>
              )}

              {/* Type: Button */}
              {item.type === 'button' && (
                <button
                  onClick={() => {
                    if (item.actionOnClick === 'open_popup' || !item.actionOnClick) {
                      setIsPlaying(false);
                      soundFX.play('click');
                      setActiveRichPopup(item);
                      setScore((s) => s + 5);
                    } else if (item.actionOnClick === 'open_link' && (item.targetUrl || item.popupButtonUrl)) {
                      window.open(item.targetUrl || item.popupButtonUrl, '_blank');
                    } else if (item.actionOnClick === 'jump_to_time' && item.targetTime !== undefined) {
                      soundFX.play('transition');
                      setCurrentTime(item.targetTime);
                    }
                  }}
                  style={{
                    backgroundColor: item.backgroundColor || '#4f46e5',
                    color: item.textColor || '#ffffff',
                    fontSize: `${item.fontSize || 14}px`,
                  }}
                  className="px-4 py-2 rounded-xl font-semibold text-xs shadow-xl border border-white/20 hover:scale-105 active:scale-95 transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
                >
                  <MousePointerClick className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.content || item.title || 'Bouton'}</span>
                </button>
              )}

              {/* Type: Text Overlay */}
              {item.type === 'text_overlay' && (
                <div
                  onClick={() => {
                    if (item.popupText || item.popupImageUrl) {
                      setIsPlaying(false);
                      soundFX.play('click');
                      setActiveRichPopup(item);
                    }
                  }}
                  style={{
                    backgroundColor: item.backgroundColor || 'rgba(15, 23, 42, 0.85)',
                    color: item.textColor || '#ffffff',
                    fontSize: `${item.fontSize || 14}px`,
                  }}
                  className="p-3.5 rounded-xl border border-white/10 shadow-2xl backdrop-blur-sm max-w-sm font-medium leading-relaxed text-xs"
                >
                  {item.content || item.title}
                </div>
              )}

              {/* Type: Image Overlay */}
              {item.type === 'image_overlay' && (
                <div
                  onClick={() => {
                    setIsPlaying(false);
                    soundFX.play('click');
                    setActiveRichPopup(item);
                  }}
                  className="relative rounded-xl overflow-hidden border border-white/20 shadow-2xl group max-w-xs cursor-pointer"
                >
                  <img
                    src={item.imageUrl || item.popupImageUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80'}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-auto max-h-44 object-cover rounded-xl"
                  />
                  <div className="absolute bottom-0 inset-x-0 p-1.5 bg-slate-950/80 text-[10px] text-white text-center font-medium truncate">
                    {item.title}
                  </div>
                </div>
              )}

              {item.type === 'object_3d' && (
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setActive3DType(item.object3dType || 'heart');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-semibold text-xs shadow-xl border border-indigo-400/50 flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform"
                >
                  <Box className="w-4 h-4 text-cyan-200 animate-pulse" />
                  <span>{item.title} (Vue 3D)</span>
                </button>
              )}

              {item.type === 'info_card' && (
                <div className="w-72 p-4 rounded-xl glass-panel text-slate-100 border border-white/10 shadow-2xl">
                  <h4 className="text-xs font-bold text-indigo-400 mb-1">{item.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{item.content}</p>
                </div>
              )}

              {/* Type: Loom Presenter Webcam Bubble */}
              {item.type === 'loom_bubble' && (
                <div
                  onClick={() => {
                    soundFX.play('transition');
                    setSpeakingPresenter((s) => !s);
                    playTtsVoiceover(item.content || item.title || 'Bonjour et bienvenue dans cette session !');
                  }}
                  className="group relative flex flex-col items-center cursor-pointer"
                >
                  <div
                    className={`relative w-24 h-24 rounded-full p-1 transition-all ${
                      speakingPresenter
                        ? 'bg-gradient-to-tr from-emerald-500 via-indigo-500 to-cyan-400 shadow-lg shadow-emerald-500/30'
                        : 'bg-slate-700/80'
                    }`}
                  >
                    {speakingPresenter && (
                      <div className="absolute inset-0 rounded-full border-2 border-emerald-400/80 animate-ping opacity-60 pointer-events-none" />
                    )}
                    <img
                      src={item.imageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'}
                      alt={item.title || 'Présentateur'}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover rounded-full border-2 border-slate-900 shadow-inner"
                    />
                    <div className="absolute bottom-0 right-1 px-1.5 py-0.5 rounded-full bg-slate-950/90 border border-slate-700 flex items-center gap-1 shadow-md">
                      <span className={`w-2 h-2 rounded-full ${speakingPresenter ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                      <Mic className="w-2.5 h-2.5 text-slate-300" />
                    </div>
                  </div>
                  <div className="mt-1.5 px-2.5 py-1 rounded-full bg-slate-950/90 border border-slate-800 text-[10px] font-medium text-slate-200 backdrop-blur-md shadow-xl flex items-center gap-1 whitespace-nowrap">
                    <span className="font-semibold text-white">{item.title || 'Formateur'}</span>
                    {item.description && (
                      <>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-400">{item.description}</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Type: Code Snippet Card */}
              {item.type === 'code_snippet' && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="w-80 rounded-xl bg-slate-950/95 border border-slate-700/80 shadow-2xl overflow-hidden backdrop-blur-md"
                >
                  <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 font-medium">
                        {item.codeLanguage || 'TypeScript'}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const codeToCopy = item.codeSnippet || item.content || '// Aucun code spécifié';
                        navigator.clipboard?.writeText(codeToCopy);
                        setCopiedCodeId(item.id);
                        soundFX.play('click');
                        setTimeout(() => setCopiedCodeId(null), 2000);
                      }}
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                      title="Copier le code dans le presse-papier"
                    >
                      {copiedCodeId === item.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-300 font-semibold">Copié !</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copier</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3 text-[11px] font-mono text-indigo-200 overflow-x-auto leading-relaxed max-h-48 scrollbar-thin">
                    <code>{item.codeSnippet || item.content || '// Exemple de code interactif\nconst result = calculateMetrics({ precision: 0.99 });\nconsole.log("Ready:", result);'}</code>
                  </pre>
                </div>
              )}

              {/* Type: Audio Spot / Narration Hotspot */}
              {item.type === 'audio_spot' && (
                <button
                  onClick={() => {
                    soundFX.play('transition');
                    playTtsVoiceover(item.content || item.title || 'Voici une explication audio complémentaire.');
                  }}
                  className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-slate-950/90 border border-indigo-500/50 text-slate-100 shadow-xl backdrop-blur-md hover:border-indigo-400 hover:scale-105 active:scale-95 transition-all group"
                >
                  <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0 group-hover:bg-indigo-500 shadow-sm">
                    <Volume2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-white leading-tight">
                      {item.title || 'Explication audio'}
                    </span>
                    <span className="text-[10px] text-slate-400">Écouter la capsule vocale</span>
                  </div>
                  <div className="flex items-end gap-0.5 h-3.5 ml-1">
                    <span className="w-0.5 h-2 bg-indigo-400 rounded-full animate-pulse" />
                    <span className="w-0.5 h-3.5 bg-indigo-300 rounded-full animate-bounce" />
                    <span className="w-0.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
                  </div>
                </button>
              )}

              {/* Type: Likert Scale Poll */}
              {item.type === 'poll_likert' && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="w-80 p-3.5 rounded-xl bg-slate-950/95 border border-indigo-500/40 shadow-2xl backdrop-blur-md space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-indigo-400">
                      <Star className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-bold uppercase tracking-wider">Sondage / Avis</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Échelle 1 à 5</span>
                  </div>
                  <p className="text-xs font-medium text-slate-200 leading-snug">
                    {item.title || 'Quel est votre niveau d’aisance sur cette étape ?'}
                  </p>
                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    {[1, 2, 3, 4, 5].map((val) => {
                      const isSelected = likertVotes[item.id] === val;
                      return (
                        <button
                          key={val}
                          onClick={(e) => {
                            e.stopPropagation();
                            setLikertVotes((prev) => ({ ...prev, [item.id]: val }));
                            soundFX.play('correct');
                            setScore((s) => s + 5);
                            confetti({ particleCount: 25, spread: 50, origin: { y: 0.7 } });
                          }}
                          className={`py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-400 shadow-md scale-105'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5">
                    <span>{item.likertScale?.minLabel || 'Pas à l’aise'}</span>
                    <span>{item.likertScale?.maxLabel || 'Parfaitement autonome'}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Modal Quiz Overlay */}
        {activeQuizItem && activeQuizItem.quiz && (
          <div className="absolute inset-0 z-30 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6">
            <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-xs text-slate-200">Point de Contrôle Formatif</span>
                </div>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  +{activeQuizItem.quiz.points || 20} pts
                </span>
              </div>

              <h3 className="text-sm font-semibold text-slate-100 leading-snug">
                {activeQuizItem.quiz.title}
              </h3>

              {/* Multiple Choice (Checkboxes) OR Single Choice (Radio) */}
              {(activeQuizItem.quiz.type === 'multiple_choice' ||
                activeQuizItem.quiz.type === 'true_false') && (
                activeQuizItem.quiz.isMultipleChoice ? (
                  <div className="space-y-3">
                    <p className="text-[11px] text-slate-400 font-medium">
                      ☑️ <strong>Question à choix multiples :</strong> cochez toutes les réponses valides, puis cliquez sur Valider.
                    </p>
                    <div className="space-y-2">
                      {activeQuizItem.quiz.options?.map((opt) => {
                        const isChecked = selectedMultipleOptions.includes(opt.id);
                        let btnStyle = 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-200';
                        if (quizSubmitted) {
                          if (opt.isCorrect) btnStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-semibold';
                          else if (isChecked) btnStyle = 'bg-red-950/80 border-red-500 text-red-200';
                        } else if (isChecked) {
                          btnStyle = 'bg-indigo-950/70 border-indigo-500 text-indigo-200';
                        }

                        return (
                          <div
                            key={opt.id}
                            onClick={() => {
                              if (quizSubmitted) return;
                              soundFX.play('click');
                              setSelectedMultipleOptions((prev) =>
                                prev.includes(opt.id) ? prev.filter((id) => id !== opt.id) : [...prev, opt.id]
                              );
                            }}
                            className={`w-full text-left p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${btnStyle}`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                  isChecked
                                    ? 'bg-indigo-600 border-indigo-400 text-white'
                                    : 'border-slate-600 bg-slate-900'
                                }`}
                              >
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span>{opt.text}</span>
                            </div>
                            {quizSubmitted && opt.isCorrect && (
                              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                            )}
                            {quizSubmitted && isChecked && !opt.isCorrect && (
                              <XCircle className="w-4 h-4 text-red-400 shrink-0 ml-2" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {!quizSubmitted && (
                      <button
                        disabled={selectedMultipleOptions.length === 0}
                        onClick={handleValidateMultipleChoice}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-semibold text-xs shadow-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <span>Valider mes réponses</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeQuizItem.quiz.options?.map((opt) => {
                      const isSelected = selectedQuizOption === opt.id;
                      let btnStyle = 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200';
                      if (quizSubmitted) {
                        if (opt.isCorrect) btnStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-bold';
                        else if (isSelected) btnStyle = 'bg-red-950/80 border-red-500 text-red-200';
                      }

                      return (
                        <button
                          key={opt.id}
                          disabled={quizSubmitted}
                          onClick={() => handleQuizAnswer(opt.id)}
                          className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between ${btnStyle}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isSelected ? 'border-indigo-400 bg-indigo-600' : 'border-slate-600 bg-slate-900'
                              }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <span>{opt.text}</span>
                          </div>
                          {quizSubmitted && opt.isCorrect && (
                            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                          )}
                          {quizSubmitted && isSelected && !opt.isCorrect && (
                            <XCircle className="w-4 h-4 text-red-400 shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )
              )}

              {/* Sequencing Quiz */}
              {activeQuizItem.quiz.type === 'sequence' && activeQuizItem.quiz.sequenceItems && (
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-400">
                    Utilisez les flèches pour placer les étapes dans le bon ordre chronologique :
                  </p>
                  <div className="space-y-1.5">
                    {sequenceOrder.map((itemId, idx) => {
                      const itemData = activeQuizItem.quiz?.sequenceItems?.find((s) => s.id === itemId);
                      return (
                        <div
                          key={itemId}
                          className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-between text-xs text-slate-200"
                        >
                          <span className="truncate">{itemData?.text}</span>
                          <div className="flex items-center gap-1">
                            {idx > 0 && (
                              <button
                                disabled={quizSubmitted}
                                onClick={() => handleSequenceMove(idx, idx - 1)}
                                className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold"
                              >
                                ↑
                              </button>
                            )}
                            {idx < sequenceOrder.length - 1 && (
                              <button
                                disabled={quizSubmitted}
                                onClick={() => handleSequenceMove(idx, idx + 1)}
                                className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold"
                              >
                                ↓
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {!quizSubmitted && (
                    <button
                      onClick={handleValidateSequence}
                      className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
                    >
                      Valider l'Ordonnancement
                    </button>
                  )}
                </div>
              )}

              {/* Explanation & Continue button */}
              {quizSubmitted && (
                <div className="pt-3 border-t border-slate-800 space-y-3">
                  <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 leading-relaxed">
                    💡 <strong>Correction :</strong> {activeQuizItem.quiz.explanation}
                  </p>
                  <button
                    onClick={() => {
                      setActiveQuizItem(null);
                      setSelectedQuizOption(null);
                      setSelectedMultipleOptions([]);
                      setIsPlaying(true);
                    }}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg transition-colors"
                  >
                    Reprendre la Vidéo Interactive
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Narrative Decision Branching Choices Overlay */}
        {currentScene.branchingChoices.length > 0 && currentTime >= currentScene.duration - 2 && (
          <div className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-8">
            <div className="w-full max-w-xl text-center space-y-5">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider border border-indigo-500/30">
                Choix Décisionnel Critique
              </span>
              <h2 className="text-xl font-bold text-slate-100">
                Quelle orientation donnez-vous à l'intervention ?
              </h2>
              <div className="space-y-3 pt-2">
                {currentScene.branchingChoices.map((choice) => (
                  <button
                    key={choice.id}
                    onClick={() => handleSelectBranch(choice.targetSceneId, choice.label)}
                    className="w-full p-4 rounded-2xl bg-slate-900/90 hover:bg-indigo-600 border border-slate-700/80 hover:border-indigo-400 text-slate-200 hover:text-white transition-all text-left flex items-center justify-between shadow-xl group"
                  >
                    <div>
                      <p className="text-sm font-semibold">{choice.label}</p>
                      <p className="text-xs text-slate-400 group-hover:text-indigo-100 mt-0.5">
                        {choice.pedagogicalImpact}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-indigo-400 group-hover:text-white group-hover:translate-x-1 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Timeline & Controls Bar */}
      <div className="h-16 px-6 border-t border-slate-800 bg-slate-900/95 flex flex-col justify-center gap-2 z-20">
        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            setCurrentTime(pct * currentScene.duration);
          }}
          className="w-full h-2 bg-slate-800 hover:h-2.5 rounded-full cursor-pointer relative overflow-hidden transition-all"
        >
          <div
            style={{ width: `${(currentTime / currentScene.duration) * 100}%` }}
            className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full transition-all"
          />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="text-white hover:text-indigo-400 transition-colors flex items-center gap-1.5"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'Pause' : 'Lecture'}</span>
            </button>
            <span className="tabular-nums">
              {currentTime.toFixed(1)}s / {currentScene.duration}s
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-300 font-sans text-xs">
            <span>Chapitre :</span>
            <strong className="text-slate-100">{currentScene.title}</strong>
          </div>
        </div>
      </div>

      {/* AI Debriefing Modal */}
      {showDebrief && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-xl p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-semibold text-slate-100">Bilan Pédagogique Adaptatif IA</h3>
              </div>
              <button
                onClick={() => setShowDebrief(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingDebrief ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Sparkles className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                <p>Analyse de vos choix et calcul du profil de maîtrise...</p>
              </div>
            ) : debriefData ? (
              <div className="space-y-3.5">
                <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-indigo-300">Niveau de Maîtrise :</span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold font-mono">
                      {debriefData.masteryLevel}
                    </span>
                  </div>
                  <p className="text-slate-200 mt-2 leading-relaxed">{debriefData.summary}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="font-semibold text-emerald-400 block mb-1">Points Forts :</span>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[11px]">
                      {debriefData.strengths?.map((s: string, i: number) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="font-semibold text-amber-400 block mb-1">Axes de Progrès :</span>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[11px]">
                      {debriefData.areasForImprovement?.map((a: string, i: number) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                  <p>
                    💡 <strong>Conseil Adaptatif :</strong> {debriefData.adaptiveTips}
                  </p>
                  <p className="text-indigo-300">
                    💙 <em>{debriefData.emotionalGuidance}</em>
                  </p>
                </div>

                {lastCertificateId && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Award className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-emerald-200">
                          Certificat de Réussite Vérifiable Délivré
                        </p>
                        <p className="text-[10px] font-mono text-emerald-300">
                          ID : {lastCertificateId} · Résultat enregistré dans le LMS
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[10px]">
                      VALIDÉ
                    </span>
                  </div>
                )}

                <button
                  onClick={() => setShowDebrief(false)}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
                >
                  Fermer le Débriefing
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Rich Popup Modal for Hotspots, Buttons, and Images */}
      <RichPopupModal
        item={activeRichPopup}
        onClose={() => setActiveRichPopup(null)}
        onResumeVideo={() => {
          setActiveRichPopup(null);
          setIsPlaying(true);
        }}
      />
    </div>
  );
};
