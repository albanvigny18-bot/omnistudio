import React, { useRef, useEffect, useState } from 'react';
import { VideoScene, InteractionItem, InteractionType, QuizData } from '../../types';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Compass,
  Box,
  HelpCircle,
  Sparkles,
  Info,
  CheckCircle,
  XCircle,
  Upload,
  Link,
  Layers,
  ArrowRight,
  Eye,
  Edit3,
  Trash2,
  Move,
  Check,
  FastForward,
  Type,
  Image as ImageIcon,
  MousePointerClick,
  Copy,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  Code,
  Video as VideoIcon,
  Presentation,
  Radio,
  Mic,
  Star,
  Grid,
  ZoomIn,
  ZoomOut,
  PanelBottomClose,
  PanelBottomOpen,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { ThreeDObjectViewer } from './ThreeDObjectViewer';
import { RichPopupModal } from '../player/RichPopupModal';
import { soundFX } from '../../services/soundEffects';
import confetti from 'canvas-confetti';

interface CanvasStageProps {
  scene: VideoScene;
  currentTime: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  selectedInteractionId: string | null;
  onSelectInteraction: (id: string | null) => void;
  onUpdateInteractionPosition: (id: string, xPercent: number, yPercent: number) => void;
  onAddInteractionAtPosition: (type: InteractionType, xPercent: number, yPercent: number) => void;
  onDeleteInteraction: (id: string) => void;
  onDuplicateInteraction?: (id: string) => void;
  onUpdateInteraction?: (item: InteractionItem) => void;
  onUpdateScene?: (updatedScene: Partial<VideoScene>) => void;
  onUpdateSceneVideoUrl: (url: string, duration?: number) => void;
  category: string;
  isTimelineCollapsed?: boolean;
  onToggleCollapseTimeline?: () => void;
  isInspectorCollapsed?: boolean;
  onToggleCollapseInspector?: () => void;
}

export const CanvasStage: React.FC<CanvasStageProps> = ({
  scene,
  currentTime,
  isPlaying,
  onTogglePlay,
  onSeek,
  selectedInteractionId,
  onSelectInteraction,
  onUpdateInteractionPosition,
  onAddInteractionAtPosition,
  onDeleteInteraction,
  onDuplicateInteraction,
  onUpdateInteraction,
  onUpdateScene,
  onUpdateSceneVideoUrl,
  category,
  isTimelineCollapsed,
  onToggleCollapseTimeline,
  isInspectorCollapsed,
  onToggleCollapseInspector,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Studio Mode: 'edit' (WYSIWYG authoring) vs 'preview' (Live learner interactive test)
  const [stageMode, setStageMode] = useState<'edit' | 'preview'>('edit');

  // Creation tool active
  const [activeCreationTool, setActiveCreationTool] = useState<InteractionType | null>(null);

  // Video playback controls
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isVrMode, setIsVrMode] = useState(false);
  const [vrPanX, setVrPanX] = useState(0);

  // Active 3D model
  const [active3DModel, setActive3DModel] = useState<'heart' | 'turbine' | 'server' | 'molecule' | null>(null);

  // Interactive Live Preview State (when user tests in preview mode)
  const [previewScore, setPreviewScore] = useState(0);
  const [activePreviewQuiz, setActivePreviewQuiz] = useState<InteractionItem | null>(null);
  const [previewQuizChoice, setPreviewQuizChoice] = useState<string | null>(null);
  const [previewMultipleChoices, setPreviewMultipleChoices] = useState<string[]>([]);
  const [previewQuizSubmitted, setPreviewQuizSubmitted] = useState(false);
  const [fillBlankInput, setFillBlankInput] = useState('');
  const [activeRichPopup, setActiveRichPopup] = useState<InteractionItem | null>(null);

  // Dragging interaction state
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Viewport & Canvas Ergonomics
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showAlignmentGrid, setShowAlignmentGrid] = useState<boolean>(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [likertSelections, setLikertSelections] = useState<{ [id: string]: number }>({});
  const [speakingPresenter, setSpeakingPresenter] = useState<boolean>(true);

  // Video source dialog
  const [showVideoSourceMenu, setShowVideoSourceMenu] = useState(false);
  const [customVideoUrlInput, setCustomVideoUrlInput] = useState('');

  // Synchronize HTML5 <video> element with playback state
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !scene.videoUrl) return;

    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying, scene.videoUrl]);

  // Synchronize HTML5 <video> currentTime when seeking
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !scene.videoUrl) return;

    if (Math.abs(video.currentTime - currentTime) > 0.4) {
      video.currentTime = currentTime;
    }
  }, [currentTime, scene.videoUrl]);

  // Handle native video timeupdate
  const handleNativeTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !isPlaying) return;
    onSeek(video.currentTime);

    // If in Live Preview mode, check if we hit a pause trigger!
    if (stageMode === 'preview') {
      scene.interactions.forEach((item) => {
        const isHit = Math.abs(video.currentTime - item.timestamp) < 0.35;
        if (isHit && item.pauseOnTrigger) {
          if (item.type === 'quiz') {
            video.pause();
            onTogglePlay();
            setActivePreviewQuiz(item);
            setPreviewQuizChoice(null);
            setPreviewQuizSubmitted(false);
            setFillBlankInput('');
          } else if (item.type === 'object_3d') {
            video.pause();
            onTogglePlay();
            setActive3DModel(item.object3dType || 'heart');
          }
        }
      });
    }
  };

  // Video loaded metadata
  const handleVideoLoadedMetadata = () => {
    const video = videoRef.current;
    if (video && video.duration && !isNaN(video.duration)) {
      onUpdateSceneVideoUrl(scene.videoUrl || '', Math.round(video.duration));
    }
  };

  // Procedural canvas video rendering (active when no video file is provided)
  useEffect(() => {
    if (scene.videoUrl) return; // Native video takes precedence

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      const grad = ctx.createRadialGradient(
        w / 2 + vrPanX,
        h / 2,
        40,
        w / 2 + vrPanX,
        h / 2,
        Math.max(w, h)
      );

      if (category === 'Medical') {
        grad.addColorStop(0, '#1e1b4b');
        grad.addColorStop(0.4, '#0f172a');
        grad.addColorStop(1, '#020617');
      } else if (category === 'Cybersecurity') {
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

      // High-tech animated waveform
      ctx.strokeStyle = category === 'Medical' ? '#22c55e' : category === 'Cybersecurity' ? '#10b981' : '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      for (let x = 0; x < w; x += 8) {
        let y = h * 0.65 + Math.sin(x * 0.015 + currentTime * 3) * 30;
        if (category === 'Medical') {
          const t = (x / w) * 12 - currentTime * 3;
          const cycle = (t % 3 + 3) % 3;
          if (cycle > 0.8 && cycle < 1.0) y -= 55 * Math.sin((cycle - 0.8) / 0.2 * Math.PI);
        }
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Category HUD
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillText(
        category === 'Medical'
          ? `HR: 138 BPM | SpO2: 89% | ECG SCOPE ST+`
          : category === 'Cybersecurity'
          ? `SIEM ALERT: PORT 4444 | ANOMALY SCORE: CRITICAL`
          : `POWER: 3.4 MW | TURBINE SPEED: 8.7 m/s`,
        24,
        h - 24
      );

      // Scene Title Overlay
      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(scene.title, 24, 34);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [category, currentTime, scene, vrPanX]);

  // Resize canvas when container size changes
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      canvasRef.current.width = containerRef.current.clientWidth;
      canvasRef.current.height = containerRef.current.clientHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle stage click:
  // If creation tool is active -> places new interaction at exact (xPercent, yPercent)!
  const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    if (activeCreationTool) {
      const rect = containerRef.current.getBoundingClientRect();
      const xPercent = Math.round(Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100)));
      const yPercent = Math.round(Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100)));

      onAddInteractionAtPosition(activeCreationTool, xPercent, yPercent);
      setActiveCreationTool(null);
    } else {
      onSelectInteraction(null);
    }
  };

  // Dragging interaction logic
  const handleMouseDownOnItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (stageMode !== 'edit') return;
    onSelectInteraction(id);
    setDraggingId(id);
  };

  const handleMouseMoveOnStage = (e: React.MouseEvent) => {
    if (!draggingId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100));
    onUpdateInteractionPosition(draggingId, Math.round(x), Math.round(y));
  };

  const handleMouseUpOnStage = () => {
    setDraggingId(null);
  };

  // File upload for user video
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    onUpdateSceneVideoUrl(objectUrl);
    setShowVideoSourceMenu(false);
  };

  // Preloaded sample educational video sources
  const sampleVideos = [
    {
      name: 'Tears of Steel (Sci-Fi / Tech HD)',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    },
    {
      name: 'Big Buck Bunny (Animation HD)',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    },
    {
      name: 'Elephants Dream (Laboratoire & Tech)',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    },
    {
      name: 'Flux Procédural Haute Fréquence (Sans vidéo externe)',
      url: '',
    },
  ];

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMoveOnStage}
      onMouseUp={handleMouseUpOnStage}
      onClick={handleStageClick}
      className={`relative w-full h-full bg-slate-950 overflow-hidden select-none flex items-center justify-center ${
        activeCreationTool ? 'cursor-crosshair' : 'cursor-default'
      }`}
    >
      {/* 1. H5P-Style Interactive Creation Toolbar (Sticky at Top of Canvas) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-3 left-4 right-4 z-30 flex items-center justify-between pointer-events-auto"
      >
        {/* Creation Tools Ribbon */}
        <div className="flex items-center gap-1 p-1 rounded-xl glass-panel shadow-xl border border-white/10">
          <span className="text-[10px] uppercase font-semibold text-slate-400 px-2 tracking-wider">
            Ajouter :
          </span>

          <button
            onClick={() => setActiveCreationTool(activeCreationTool === 'hotspot' ? null : 'hotspot')}
            className={`px-2 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
              activeCreationTool === 'hotspot'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Zone Sensible (Hotspot cliquable avec popup multimédia)"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Hotspot</span>
          </button>

          <button
            onClick={() => setActiveCreationTool(activeCreationTool === 'button' ? null : 'button')}
            className={`px-2 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
              activeCreationTool === 'button'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Bouton interactif d'action, popup ou navigation"
          >
            <MousePointerClick className="w-3.5 h-3.5 text-blue-400" />
            <span>Bouton</span>
          </button>

          <button
            onClick={() => setActiveCreationTool(activeCreationTool === 'text_overlay' ? null : 'text_overlay')}
            className={`px-2 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
              activeCreationTool === 'text_overlay'
                ? 'bg-pink-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Bloc Texte explicatif ou consigne pédagogique sur la vidéo"
          >
            <Type className="w-3.5 h-3.5 text-pink-400" />
            <span>Texte</span>
          </button>

          <button
            onClick={() => setActiveCreationTool(activeCreationTool === 'image_overlay' ? null : 'image_overlay')}
            className={`px-2 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
              activeCreationTool === 'image_overlay'
                ? 'bg-violet-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Image / Schéma technique incrusté sur la vidéo"
          >
            <ImageIcon className="w-3.5 h-3.5 text-violet-400" />
            <span>Image</span>
          </button>

          <button
            onClick={() => setActiveCreationTool(activeCreationTool === 'quiz' ? null : 'quiz')}
            className={`px-2 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
              activeCreationTool === 'quiz'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Ajouter un Quiz interactif avec pause vidéo (choix unique ou multiple)"
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Quiz / QCM</span>
          </button>

          <button
            onClick={() => setActiveCreationTool(activeCreationTool === 'object_3d' ? null : 'object_3d')}
            className={`px-2 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
              activeCreationTool === 'object_3d'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Incruster un modèle 3D Three.js manipulable"
          >
            <Box className="w-3.5 h-3.5 text-cyan-400" />
            <span>Modèle 3D</span>
          </button>

          <button
            onClick={() => setActiveCreationTool(activeCreationTool === 'loom_bubble' ? null : 'loom_bubble')}
            className={`px-2 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
              activeCreationTool === 'loom_bubble'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Bulle Présentateur / Webcam virtuelle (Style Loom)"
          >
            <VideoIcon className="w-3.5 h-3.5 text-rose-400" />
            <span>Loom</span>
          </button>

          <button
            onClick={() => setActiveCreationTool(activeCreationTool === 'code_snippet' ? null : 'code_snippet')}
            className={`px-2 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
              activeCreationTool === 'code_snippet'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Bloc de code interactif avec syntaxe et copie rapide"
          >
            <Code className="w-3.5 h-3.5 text-emerald-400" />
            <span>Code</span>
          </button>

          <button
            onClick={() => setActiveCreationTool(activeCreationTool === 'audio_spot' ? null : 'audio_spot')}
            className={`px-2 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
              activeCreationTool === 'audio_spot'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Spot d'écoute audio ou narration synchronisée"
          >
            <Mic className="w-3.5 h-3.5 text-amber-400" />
            <span>Audio</span>
          </button>

          <button
            onClick={() => setActiveCreationTool(activeCreationTool === 'poll_likert' ? null : 'poll_likert')}
            className={`px-2 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
              activeCreationTool === 'poll_likert'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Échelle d'évaluation ou sondage Likert"
          >
            <Star className="w-3.5 h-3.5 text-teal-400" />
            <span>Sondage</span>
          </button>

          <button
            onClick={() => setActiveCreationTool(activeCreationTool === 'info_card' ? null : 'info_card')}
            className={`px-2 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
              activeCreationTool === 'info_card'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Incruster une fiche d'information ou consigne"
          >
            <Info className="w-3.5 h-3.5 text-amber-400" />
            <span>Fiche Info</span>
          </button>

          <button
            onClick={() => setActiveCreationTool(activeCreationTool === 'inventory_item' ? null : 'inventory_item')}
            className={`px-2 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
              activeCreationTool === 'inventory_item'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Ajouter un objet d'inventaire / indice (Escape Game)"
          >
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>Indice</span>
          </button>
        </div>

        {/* Mode Switcher, Media Mode, Grid & Panels Tools */}
        <div className="flex items-center gap-2">
          {/* Media Mode Switcher (Video, Slide, Hybrid Loom, VR 360) */}
          <div className="flex items-center p-0.5 rounded-xl glass-panel border border-white/10 text-xs">
            <button
              onClick={() => onUpdateScene?.({ mediaMode: 'video' })}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors ${
                (scene.mediaMode || 'video') === 'video'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Mode Vidéo en continu"
            >
              <VideoIcon className="w-3 h-3" />
              <span>Vidéo</span>
            </button>

            <button
              onClick={() => onUpdateScene?.({ mediaMode: 'slide' })}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors ${
                scene.mediaMode === 'slide'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Mode Diaporama / Slide interactif (Style Genially / Canva)"
            >
              <Presentation className="w-3 h-3" />
              <span>Diapo</span>
            </button>

            <button
              onClick={() => onUpdateScene?.({ mediaMode: 'hybrid_loom' })}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors ${
                scene.mediaMode === 'hybrid_loom'
                  ? 'bg-rose-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Mode Hybride : Diapositive avec Présentateur Loom incrusté"
            >
              <Mic className="w-3 h-3" />
              <span>Hybride</span>
            </button>
          </div>

          {/* Grid Toggle */}
          <button
            onClick={() => setShowAlignmentGrid(!showAlignmentGrid)}
            className={`p-1.5 rounded-xl glass-panel border border-white/10 transition-colors ${
              showAlignmentGrid ? 'text-indigo-400 bg-indigo-950/60' : 'text-slate-400 hover:text-white'
            }`}
            title="Afficher/Masquer la grille d'alignement au pixel près"
          >
            <Grid className="w-4 h-4" />
          </button>

          {/* Zoom Viewport Controls */}
          <div className="flex items-center gap-1 px-1.5 py-1 rounded-xl glass-panel border border-white/10 text-slate-400 text-xs font-mono">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.75, Math.round((z - 0.1) * 100) / 100))}
              className="hover:text-white"
              title="Dézoomer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span
              onClick={() => setZoomLevel(1)}
              className="cursor-pointer hover:text-indigo-300 px-1"
              title="Réinitialiser à 100%"
            >
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.5, Math.round((z + 0.1) * 100) / 100))}
              className="hover:text-white"
              title="Zoomer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Video Source Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowVideoSourceMenu(!showVideoSourceMenu)}
              className="px-2.5 py-1.5 rounded-xl glass-panel text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors border border-white/10"
              title="Changer de vidéo (MP4, fichier local ou URL)"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-400" />
              <span>Médias</span>
            </button>

            {showVideoSourceMenu && (
              <div className="absolute top-full right-0 mt-1 w-72 p-2 rounded-xl glass-dropdown shadow-2xl border border-white/10 z-50 space-y-2">
                <span className="text-[10px] uppercase font-semibold text-slate-400 px-2 tracking-wider block">
                  Choisir la source vidéo ou diapo :
                </span>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full text-left p-2 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs flex items-center gap-2"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Importer un fichier MP4 / WebM...</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="border-t border-slate-800 pt-1 space-y-1">
                  <span className="text-[10px] text-slate-400 px-2 block">Vidéos de démonstration :</span>
                  {sampleVideos.map((sv, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        onUpdateSceneVideoUrl(sv.url);
                        setShowVideoSourceMenu(false);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded text-xs text-slate-300 hover:bg-slate-800 truncate"
                    >
                      {sv.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Panel Collapse Toggles */}
          {onToggleCollapseTimeline && (
            <button
              onClick={onToggleCollapseTimeline}
              className={`p-1.5 rounded-xl glass-panel border border-white/10 transition-colors ${
                isTimelineCollapsed ? 'text-indigo-400 bg-indigo-950/60' : 'text-slate-400 hover:text-white'
              }`}
              title={isTimelineCollapsed ? "Afficher la Timeline" : "Masquer la Timeline (Plein écran)"}
            >
              {isTimelineCollapsed ? <PanelBottomOpen className="w-4 h-4" /> : <PanelBottomClose className="w-4 h-4" />}
            </button>
          )}

          {onToggleCollapseInspector && (
            <button
              onClick={onToggleCollapseInspector}
              className={`p-1.5 rounded-xl glass-panel border border-white/10 transition-colors ${
                isInspectorCollapsed ? 'text-indigo-400 bg-indigo-950/60' : 'text-slate-400 hover:text-white'
              }`}
              title={isInspectorCollapsed ? "Afficher l'Inspecteur de Propriétés" : "Masquer l'Inspecteur (Vue dégagée)"}
            >
              {isInspectorCollapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
            </button>
          )}

          {/* Mode Switch Button */}
          <div className="flex items-center p-0.5 rounded-xl glass-panel border border-white/10">
            <button
              onClick={() => setStageMode('edit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                stageMode === 'edit'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Mode Édition</span>
            </button>

            <button
              onClick={() => {
                setStageMode('preview');
                setActiveCreationTool(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                stageMode === 'preview'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Tester en Direct</span>
            </button>
          </div>
        </div>
      </div>

      {/* Creation Tool Hint Banner */}
      {activeCreationTool && (
        <div className="absolute top-16 z-30 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-medium shadow-2xl flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4" />
          <span>Cliquez n'importe où sur l'écran vidéo pour positionner votre élément {activeCreationTool} !</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveCreationTool(null);
            }}
            className="ml-2 underline text-[11px]"
          >
            Annuler
          </button>
        </div>
      )}

      {/* Viewport Zoom & Stage Canvas Wrapper */}
      <div
        style={{
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'center center',
          transition: 'transform 0.15s ease-out',
        }}
        className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden"
      >
        {/* Alignment Grid Overlay (Canva Style) */}
        {showAlignmentGrid && (
          <div
            className="absolute inset-0 pointer-events-none z-10 opacity-20"
            style={{
              backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
        )}

        {/* 2. Media Player Rendering: Video / Slide / Procedural */}
        {scene.mediaMode === 'slide' || scene.mediaMode === 'hybrid_loom' ? (
          /* Slide / Diaporama Mode (Genially / Canva Style) */
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-950 flex flex-col justify-between p-8 border border-slate-800/60 overflow-hidden">
            {scene.slideImageUrl ? (
              <img
                src={scene.slideImageUrl}
                alt="Diapositive"
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="relative z-10 max-w-xl space-y-3">
                <span className="text-[11px] font-mono uppercase tracking-widest text-indigo-400 font-bold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30">
                  {scene.mediaMode === 'hybrid_loom' ? 'Présentation Hybride Loom' : 'Diapositive Interactive'}
                </span>
                <h2 className="text-2xl font-black text-white tracking-tight leading-tight">
                  {scene.title}
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed max-w-md">
                  {scene.description || scene.learningObjective}
                </p>
                <div className="flex items-center gap-2 pt-2 text-[11px] text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Objectif : <strong>{scene.learningObjective}</strong></span>
                </div>
              </div>
            )}

            {/* In Hybrid Loom Mode: Floating Presenter Bubble in bottom-left */}
            {scene.mediaMode === 'hybrid_loom' && (
              <div className="absolute bottom-6 left-6 z-30 flex items-center gap-3 p-2 rounded-2xl bg-slate-950/90 border border-rose-500/40 shadow-2xl backdrop-blur-md">
                <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-rose-500">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80"
                    alt="Loom Presenter"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 ring-2 ring-rose-500/60 rounded-full animate-ping pointer-events-none" />
                </div>
                <div className="text-left pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-xs font-bold text-white">Formateur en Direct</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Narration & consigne active</p>
                </div>
              </div>
            )}
          </div>
        ) : scene.videoUrl ? (
          /* Video Mode with HTML5 <video> */
          <video
            ref={videoRef}
            src={scene.videoUrl}
            playsInline
            muted={isMuted}
            onTimeUpdate={handleNativeTimeUpdate}
            onLoadedMetadata={handleVideoLoadedMetadata}
            className="absolute inset-0 w-full h-full object-contain bg-slate-950"
          />
        ) : (
          /* Procedural Generative Video Canvas */
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
        )}

        {/* 3D Model Modal Overlay if active */}
        {active3DModel && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-md p-6 flex items-center justify-center"
          >
            <div className="w-full max-w-2xl h-96">
              <ThreeDObjectViewer
                type={active3DModel}
                title={`Inspection 3D interactive : ${active3DModel.toUpperCase()}`}
                onClose={() => {
                  setActive3DModel(null);
                  if (isPlaying) videoRef.current?.play().catch(() => {});
                }}
              />
            </div>
          </div>
        )}

        {/* 3. Interactive Overlays Layer */}
        {scene.interactions.map((item) => {
          const isCurrentTime =
            currentTime >= item.timestamp &&
            currentTime <= item.timestamp + (item.duration || 8);
          const isSelected = selectedInteractionId === item.id;

          // In edit mode: show all items with dimming if not current timestamp
          // In preview mode: ONLY show items active at the current playhead
          if (stageMode === 'preview' && !isCurrentTime) return null;

          const opacityClass =
            stageMode === 'preview'
              ? 'opacity-100 scale-100'
              : isCurrentTime
              ? 'opacity-100 scale-100 ring-1 ring-white/30'
              : 'opacity-40 scale-95 hover:opacity-80';

          return (
            <div
              key={item.id}
              onMouseDown={(e) => handleMouseDownOnItem(e, item.id)}
              style={{
                left: `${item.xPercent}%`,
                top: `${item.yPercent}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: item.zIndex || 20,
              }}
              className={`absolute transition-all duration-200 ${
                stageMode === 'edit' ? (item.isLocked ? 'cursor-default' : 'cursor-move') : 'cursor-pointer'
              } ${opacityClass} ${
                isSelected && stageMode === 'edit'
                  ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950'
                  : ''
              }`}
            >
              {/* Canva-Style Floating Selection Action HUD */}
              {stageMode === 'edit' && isSelected && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 rounded-xl glass-dropdown shadow-2xl border border-indigo-500/60 text-[11px] font-mono text-slate-200 z-50 whitespace-nowrap"
                >
                  <span className="text-indigo-400 font-semibold px-1 uppercase text-[9px]">{item.type}</span>
                  <div className="h-3 w-px bg-slate-700" />
                  
                  {/* Duplicate */}
                  <button
                    onClick={() => onDuplicateInteraction?.(item.id)}
                    className="p-1 hover:text-indigo-300 hover:bg-slate-800 rounded transition-colors"
                    title="Dupliquer l'élément"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {/* Bring Forward */}
                  <button
                    onClick={() => onUpdateInteraction?.({ ...item, zIndex: (item.zIndex || 20) + 1 })}
                    className="p-1 hover:text-indigo-300 hover:bg-slate-800 rounded transition-colors"
                    title="Avancer le plan (Z-Index + 1)"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  {/* Send Backward */}
                  <button
                    onClick={() => onUpdateInteraction?.({ ...item, zIndex: Math.max(1, (item.zIndex || 20) - 1) })}
                    className="p-1 hover:text-indigo-300 hover:bg-slate-800 rounded transition-colors"
                    title="Reculer le plan (Z-Index - 1)"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Lock / Unlock */}
                  <button
                    onClick={() => onUpdateInteraction?.({ ...item, isLocked: !item.isLocked })}
                    className={`p-1 rounded hover:bg-slate-800 transition-colors ${item.isLocked ? 'text-amber-400' : 'hover:text-slate-200'}`}
                    title={item.isLocked ? "Déverrouiller la position" : "Verrouiller la position"}
                  >
                    {item.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>

                  {/* Quick Test Popup */}
                  <button
                    onClick={() => {
                      soundFX.play('click');
                      setActiveRichPopup(item);
                    }}
                    className="p-1 hover:text-emerald-300 hover:bg-slate-800 rounded text-emerald-400 transition-colors"
                    title="Tester la Popup / Action"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => onDeleteInteraction(item.id)}
                    className="p-1 hover:text-red-400 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

            {/* Type: Hotspot */}
            {item.type === 'hotspot' && (
              <div
                onClick={(e) => {
                  if (stageMode === 'preview') {
                    e.stopPropagation();
                    if (item.actionOnClick === 'open_popup' || !item.actionOnClick) {
                      soundFX.play('click');
                      setActiveRichPopup(item);
                      setPreviewScore((s) => s + 10);
                    } else if (item.actionOnClick === 'open_link' && (item.targetUrl || item.popupButtonUrl)) {
                      soundFX.play('click');
                      window.open(item.targetUrl || item.popupButtonUrl, '_blank');
                    } else if (item.actionOnClick === 'jump_to_time' && item.targetTime !== undefined) {
                      soundFX.play('transition');
                      onSeek(item.targetTime);
                    }
                  }
                }}
                className="relative group p-1"
              >
                <div className="w-11 h-11 rounded-full bg-indigo-500/40 border-2 border-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/50 group-hover:scale-110 active:scale-95 transition-transform">
                  <div className="w-4 h-4 rounded-full bg-indigo-400 animate-ping" />
                </div>
                <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700 text-[11px] font-semibold text-slate-100 shadow-xl">
                  {item.title}
                </div>
              </div>
            )}

            {/* Type: Button */}
            {item.type === 'button' && (
              <button
                onClick={(e) => {
                  if (stageMode === 'preview') {
                    e.stopPropagation();
                    if (item.actionOnClick === 'open_popup' || !item.actionOnClick) {
                      soundFX.play('click');
                      setActiveRichPopup(item);
                      setPreviewScore((s) => s + 5);
                    } else if (item.actionOnClick === 'open_link' && (item.targetUrl || item.popupButtonUrl)) {
                      soundFX.play('click');
                      window.open(item.targetUrl || item.popupButtonUrl, '_blank');
                    } else if (item.actionOnClick === 'jump_to_time' && item.targetTime !== undefined) {
                      soundFX.play('transition');
                      onSeek(item.targetTime);
                    }
                  }
                }}
                style={{
                  backgroundColor: item.backgroundColor || '#4f46e5',
                  color: item.textColor || '#ffffff',
                  fontSize: `${item.fontSize || 14}px`,
                }}
                className="px-4 py-2 rounded-xl font-semibold shadow-xl border border-white/20 hover:scale-105 active:scale-95 transition-all whitespace-nowrap flex items-center gap-1.5 text-xs"
              >
                <MousePointerClick className="w-3.5 h-3.5 shrink-0" />
                <span>{item.content || item.title || 'Bouton'}</span>
              </button>
            )}

            {/* Type: Text Overlay */}
            {item.type === 'text_overlay' && (
              <div
                onClick={(e) => {
                  if (stageMode === 'preview' && (item.popupText || item.popupImageUrl)) {
                    e.stopPropagation();
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
                onClick={(e) => {
                  if (stageMode === 'preview') {
                    e.stopPropagation();
                    soundFX.play('click');
                    setActiveRichPopup(item);
                  }
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

            {/* Type: Info Card */}
            {item.type === 'info_card' && (
              <div className="w-64 p-3.5 rounded-xl glass-panel text-slate-100 shadow-xl border border-white/10">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-indigo-400 tracking-wide">{item.title}</span>
                  <span className="text-[10px] font-mono text-slate-400">{item.timestamp}s</span>
                </div>
                <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">{item.content}</p>
              </div>
            )}

            {/* Type: 3D Object */}
            {item.type === 'object_3d' && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setActive3DModel(item.object3dType || 'heart');
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600/90 to-cyan-600/90 text-white shadow-xl hover:scale-105 active:scale-95 transition-all border border-indigo-400/40"
              >
                <Box className="w-4 h-4 text-cyan-200 animate-pulse" />
                <div className="text-left">
                  <p className="text-xs font-semibold">{item.title}</p>
                  <p className="text-[10px] text-indigo-100">Cliquer pour manipuler en 3D</p>
                </div>
              </div>
            )}

            {/* Type: Quiz Preview Block (WYSIWYG) */}
            {item.type === 'quiz' && (
              <div
                onClick={(e) => {
                  if (stageMode === 'preview') {
                    e.stopPropagation();
                    setActivePreviewQuiz(item);
                    setPreviewQuizChoice(null);
                    setPreviewQuizSubmitted(false);
                  }
                }}
                className="w-72 p-4 rounded-xl glass-panel border border-emerald-500/40 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-emerald-400">Quiz Formatif</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    +{item.quiz?.points || 20} pts
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-200 mb-2.5">{item.quiz?.title}</p>
                <div className="space-y-1.5">
                  {item.quiz?.options?.map((opt) => (
                    <div
                      key={opt.id}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 flex items-center justify-between"
                    >
                      <span className="truncate">{opt.text}</span>
                      {opt.isCorrect && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Type: Inventory Item */}
            {item.type === 'inventory_item' && (
              <div
                onClick={(e) => {
                  if (stageMode === 'preview') {
                    e.stopPropagation();
                    alert(`Objet collecté : ${item.title}`);
                    setPreviewScore((s) => s + 15);
                  }
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/20 border border-amber-400/50 text-amber-200 shadow-lg hover:scale-105 active:scale-95 transition-transform"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span className="text-xs font-semibold">{item.title}</span>
              </div>
            )}

            {/* Type: Loom Presenter Webcam Bubble */}
            {item.type === 'loom_bubble' && (
              <div
                onClick={(e) => {
                  if (stageMode === 'preview') {
                    e.stopPropagation();
                    soundFX.playTransition();
                    setSpeakingPresenter((s) => !s);
                  }
                }}
                className="group relative flex flex-col items-center"
              >
                {/* Animated Pulsing Wave Ring */}
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
                  {/* Mic / Live indicator badge */}
                  <div className="absolute bottom-0 right-1 px-1.5 py-0.5 rounded-full bg-slate-950/90 border border-slate-700 flex items-center gap-1 shadow-md">
                    <span className={`w-2 h-2 rounded-full ${speakingPresenter ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                    <Mic className="w-2.5 h-2.5 text-slate-300" />
                  </div>
                </div>
                {/* Presenter name tag */}
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
                {/* Code Terminal Header */}
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
                      soundFX.playClick();
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
                {/* Code Body */}
                <pre className="p-3 text-[11px] font-mono text-indigo-200 overflow-x-auto leading-relaxed max-h-48 scrollbar-thin">
                  <code>{item.codeSnippet || item.content || '// Exemple de code interactif\nconst result = calculateMetrics({ precision: 0.99 });\nconsole.log("Ready:", result);'}</code>
                </pre>
              </div>
            )}

            {/* Type: Audio Spot / Narration Hotspot */}
            {item.type === 'audio_spot' && (
              <button
                onClick={(e) => {
                  if (stageMode === 'preview') {
                    e.stopPropagation();
                    soundFX.playTransition();
                  }
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
                {/* Mini Audio Equalizer Animation */}
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
                    const isSelected = likertSelections[item.id] === val;
                    return (
                      <button
                        key={val}
                        onClick={(e) => {
                          e.stopPropagation();
                          setLikertSelections((prev) => ({ ...prev, [item.id]: val }));
                          soundFX.playCorrect();
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
      </div>

      {/* 4. Live Quiz Modal in Preview Mode */}
      {activePreviewQuiz && activePreviewQuiz.quiz && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6"
        >
          <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-slate-200">Point de Contrôle Formatif</span>
              </div>
              <span className="font-mono text-emerald-300 px-2 py-0.5 rounded bg-emerald-500/20">
                +{activePreviewQuiz.quiz.points || 20} pts
              </span>
            </div>

            <h3 className="text-sm font-semibold text-slate-100 leading-snug">
              {activePreviewQuiz.quiz.title}
            </h3>

            {/* Multiple Choice (Checkboxes) OR Single Choice (Radio) */}
            {activePreviewQuiz.quiz.isMultipleChoice ? (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-400 font-medium">
                  ☑️ <strong>Question à choix multiples :</strong> cochez toutes les réponses valides, puis cliquez sur Valider.
                </p>
                <div className="space-y-2">
                  {activePreviewQuiz.quiz.options?.map((opt) => {
                    const isChecked = previewMultipleChoices.includes(opt.id);
                    let btnStyle = 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-200';
                    if (previewQuizSubmitted) {
                      if (opt.isCorrect) btnStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-semibold';
                      else if (isChecked) btnStyle = 'bg-red-950/80 border-red-500 text-red-200';
                    } else if (isChecked) {
                      btnStyle = 'bg-indigo-950/70 border-indigo-500 text-indigo-200';
                    }

                    return (
                      <div
                        key={opt.id}
                        onClick={() => {
                          if (previewQuizSubmitted) return;
                          soundFX.play('click');
                          setPreviewMultipleChoices((prev) =>
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
                        {previewQuizSubmitted && opt.isCorrect && (
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                        )}
                        {previewQuizSubmitted && isChecked && !opt.isCorrect && (
                          <XCircle className="w-4 h-4 text-red-400 shrink-0 ml-2" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {!previewQuizSubmitted && (
                  <button
                    disabled={previewMultipleChoices.length === 0}
                    onClick={() => {
                      setPreviewQuizSubmitted(true);
                      const allOptions = activePreviewQuiz.quiz?.options || [];
                      const correctIds = allOptions.filter((o) => o.isCorrect).map((o) => o.id);
                      const isAllCorrect =
                        correctIds.length === previewMultipleChoices.length &&
                        correctIds.every((id) => previewMultipleChoices.includes(id));

                      if (isAllCorrect) {
                        soundFX.play('correct');
                        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
                        setPreviewScore((s) => s + (activePreviewQuiz.quiz?.points || 20));
                      } else {
                        soundFX.play('wrong');
                      }
                    }}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-semibold text-xs shadow-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <span>Valider mes réponses</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              /* Single Choice Radio */
              <div className="space-y-2">
                {activePreviewQuiz.quiz.options?.map((opt) => {
                  const isSelected = previewQuizChoice === opt.id;
                  let btnStyle = 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200';
                  if (previewQuizSubmitted) {
                    if (opt.isCorrect) btnStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-bold';
                    else if (isSelected) btnStyle = 'bg-red-950/80 border-red-500 text-red-200';
                  }

                  return (
                    <button
                      key={opt.id}
                      disabled={previewQuizSubmitted}
                      onClick={() => {
                        setPreviewQuizChoice(opt.id);
                        setPreviewQuizSubmitted(true);
                        if (opt.isCorrect) {
                          soundFX.play('correct');
                          confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
                          setPreviewScore((s) => s + (activePreviewQuiz.quiz?.points || 20));
                        } else {
                          soundFX.play('wrong');
                        }
                      }}
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
                      {previewQuizSubmitted && opt.isCorrect && (
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                      )}
                      {previewQuizSubmitted && isSelected && !opt.isCorrect && (
                        <XCircle className="w-4 h-4 text-red-400 shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Explanation and Resume Button */}
            {previewQuizSubmitted && (
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 leading-relaxed">
                  💡 <strong>Correction :</strong> {activePreviewQuiz.quiz.explanation}
                </p>
                <button
                  onClick={() => {
                    setActivePreviewQuiz(null);
                    setPreviewMultipleChoices([]);
                    setPreviewQuizChoice(null);
                    onTogglePlay();
                    videoRef.current?.play().catch(() => {});
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

      {/* Rich Popup Modal for Interactive Preview */}
      <RichPopupModal
        item={activeRichPopup}
        onClose={() => setActiveRichPopup(null)}
        onResumeVideo={() => {
          setActiveRichPopup(null);
          onTogglePlay();
          videoRef.current?.play().catch(() => {});
        }}
      />

      {/* 5. Floating Bottom Video Controls Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-5 py-2.5 rounded-2xl glass-panel shadow-2xl border border-white/10 text-xs pointer-events-auto"
      >
        <button
          onClick={onTogglePlay}
          className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
          title={isPlaying ? 'Pause' : 'Lecture'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 translate-x-0.5" />}
        </button>

        <span className="font-mono text-slate-300 tabular-nums">
          {currentTime.toFixed(1)}s / {scene.duration}s
        </span>

        <div className="h-4 w-px bg-slate-700 mx-1" />

        {/* Volume Toggle */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="text-slate-400 hover:text-white transition-colors"
          title={isMuted ? 'Activer le son' : 'Couper le son'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 font-mono text-[11px]">
          {[1, 1.25, 1.5].map((spd) => (
            <button
              key={spd}
              onClick={() => {
                setPlaybackSpeed(spd);
                if (videoRef.current) videoRef.current.playbackRate = spd;
              }}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                playbackSpeed === spd
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-slate-700 mx-1" />

        {/* VR 360 Toggle */}
        <button
          onClick={() => setIsVrMode(!isVrMode)}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
            isVrMode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Mode VR 360° Panoramique"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>360°</span>
        </button>

        {stageMode === 'preview' && (
          <span className="font-mono text-emerald-400 font-bold ml-2">
            Score: {previewScore}
          </span>
        )}
      </div>
    </div>
  );
};
