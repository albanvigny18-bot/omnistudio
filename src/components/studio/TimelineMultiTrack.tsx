import React, { useRef, useState } from 'react';
import { VideoScene, InteractionItem, InteractionType, VideoChapter } from '../../types';
import {
  Play,
  Pause,
  Plus,
  ZoomIn,
  ZoomOut,
  Volume2,
  Video,
  Layers,
  HelpCircle,
  Cpu,
  Clock,
  Sparkles,
  Trash2,
  Bookmark,
  ChevronRight,
  MoveHorizontal,
} from 'lucide-react';

interface TimelineMultiTrackProps {
  scene: VideoScene;
  currentTime: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  selectedInteractionId: string | null;
  onSelectInteraction: (id: string | null) => void;
  onAddInteraction: (type: InteractionType) => void;
  onDeleteInteraction: (id: string) => void;
  onUpdateInteractionTime: (id: string, newTimestamp: number) => void;
  onUpdateInteractionDuration?: (id: string, newDuration: number) => void;
  onAddChapter?: (title: string, timestamp: number) => void;
}

export const TimelineMultiTrack: React.FC<TimelineMultiTrackProps> = ({
  scene,
  currentTime,
  isPlaying,
  onTogglePlay,
  onSeek,
  selectedInteractionId,
  onSelectInteraction,
  onAddInteraction,
  onDeleteInteraction,
  onUpdateInteractionTime,
  onUpdateInteractionDuration,
  onAddChapter,
}) => {
  const rulerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Dragging interaction on timeline
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [originalItemTimestamp, setOriginalItemTimestamp] = useState(0);

  // Resizing duration of interaction on timeline
  const [resizingItemId, setResizingItemId] = useState<string | null>(null);
  const [originalItemDuration, setOriginalItemDuration] = useState(0);

  const duration = Math.max(10, scene.duration || 30);
  const pixelsPerSecond = 28 * zoomLevel;
  const totalTimelineWidth = Math.max(1000, duration * pixelsPerSecond + 160);

  // Scrubbing along ruler
  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = Math.max(0, Math.min(duration, clickX / pixelsPerSecond));
    onSeek(newTime);
  };

  const handleRulerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsScrubbing(true);
    handleRulerClick(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isScrubbing && rulerRef.current) {
      const rect = rulerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const newTime = Math.max(0, Math.min(duration, clickX / pixelsPerSecond));
      onSeek(newTime);
    } else if (draggingItemId) {
      const deltaX = e.clientX - dragStartX;
      const deltaSeconds = deltaX / pixelsPerSecond;
      const newTime = Math.max(0, Math.min(duration - 1, originalItemTimestamp + deltaSeconds));
      onUpdateInteractionTime(draggingItemId, Math.round(newTime * 10) / 10);
    } else if (resizingItemId && onUpdateInteractionDuration) {
      const deltaX = e.clientX - dragStartX;
      const deltaSeconds = deltaX / pixelsPerSecond;
      const newDuration = Math.max(1, Math.min(30, originalItemDuration + deltaSeconds));
      onUpdateInteractionDuration(resizingItemId, Math.round(newDuration * 10) / 10);
    }
  };

  const handleMouseUp = () => {
    setIsScrubbing(false);
    setDraggingItemId(null);
    setResizingItemId(null);
  };

  // Group items into tracks
  const allInteractions = scene.interactions || [];
  const overlayItems = allInteractions.filter((it) =>
    ['hotspot', 'info_card', 'button', 'text_overlay', 'image_overlay', 'audio_spot', 'audio_narration'].includes(it.type)
  );
  const quizItems = allInteractions.filter((it) => ['quiz', 'poll_likert'].includes(it.type));
  const advancedItems = allInteractions.filter((it) =>
    ['object_3d', 'inventory_item', 'branching', 'loom_bubble', 'code_snippet', 'pip_video', 'vr_hotspot'].includes(it.type)
  );

  // Default chapters if none
  const chapters: VideoChapter[] = scene.chapters || [
    { id: 'ch-1', title: 'Introduction', timestamp: 0 },
    { id: 'ch-2', title: 'Analyse Clé', timestamp: Math.round(duration * 0.35) },
    { id: 'ch-3', title: 'Évaluation', timestamp: Math.round(duration * 0.7) },
  ];

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="w-full h-full bg-slate-900 border-t border-slate-800 flex flex-col select-none"
    >
      {/* 1. Timeline Controls Header */}
      <div className="h-10 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 text-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onTogglePlay}
            className="w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-colors shadow-sm"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 translate-x-0.5" />}
          </button>

          <div className="flex items-center gap-1.5 font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span className="tabular-nums font-semibold text-slate-100">
              {currentTime.toFixed(1)}s
            </span>
            <span className="text-slate-500">/</span>
            <span className="tabular-nums text-slate-400">{duration.toFixed(1)}s</span>
          </div>

          <div className="h-3 w-px bg-slate-700 mx-1" />

          {/* Quick Add Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onAddInteraction('hotspot')}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] flex items-center gap-1"
            >
              <Plus className="w-3 h-3 text-indigo-400" />
              <span>Hotspot</span>
            </button>
            <button
              onClick={() => onAddInteraction('quiz')}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] flex items-center gap-1"
            >
              <Plus className="w-3 h-3 text-emerald-400" />
              <span>Quiz</span>
            </button>
            <button
              onClick={() => onAddInteraction('object_3d')}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] flex items-center gap-1"
            >
              <Plus className="w-3 h-3 text-cyan-400" />
              <span>Objet 3D</span>
            </button>
            <button
              onClick={() => onAddInteraction('info_card')}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] flex items-center gap-1"
            >
              <Plus className="w-3 h-3 text-amber-400" />
              <span>Fiche Info</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedInteractionId && (
            <button
              onClick={() => onDeleteInteraction(selectedInteractionId)}
              className="px-2 py-1 rounded bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-800 text-[11px] flex items-center gap-1"
              title="Supprimer l'élément sélectionné"
            >
              <Trash2 className="w-3 h-3" />
              <span>Supprimer</span>
            </button>
          )}

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.25))}
              className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded"
              title="Zoom arrière"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-400 px-1">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
              className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded"
              title="Zoom avant"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Multi-Track Scrollable Body */}
      <div className="flex-1 overflow-x-auto overflow-y-auto flex">
        {/* Track Headers Column (Sticky Left) */}
        <div className="w-48 shrink-0 bg-slate-950/90 border-r border-slate-800 flex flex-col z-10 sticky left-0 text-xs">
          {/* Chapters Strip Header */}
          <div className="h-6 border-b border-slate-800 px-3 flex items-center gap-1.5 font-semibold text-[10px] uppercase tracking-wider text-slate-400">
            <Bookmark className="w-3 h-3 text-indigo-400" />
            <span>Signets / Chapitres</span>
          </div>

          {/* Track 1: Video */}
          <div className="h-10 border-b border-slate-800/70 px-3 flex items-center gap-2 text-slate-300">
            <Video className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-medium truncate">Piste Vidéo</span>
          </div>

          {/* Track 2: Overlays & Hotspots */}
          <div className="h-10 border-b border-slate-800/70 px-3 flex items-center gap-2 text-slate-300">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium truncate">Overlays & Hotspots</span>
          </div>

          {/* Track 3: Quiz & Pauses */}
          <div className="h-10 border-b border-slate-800/70 px-3 flex items-center gap-2 text-slate-300">
            <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium truncate">Quiz & Pauses</span>
          </div>

          {/* Track 4: 3D & Advanced */}
          <div className="h-10 border-b border-slate-800/70 px-3 flex items-center gap-2 text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-medium truncate">Objets 3D & Indices</span>
          </div>
        </div>

        {/* Tracks Content Area */}
        <div
          ref={rulerRef}
          onMouseDown={handleRulerMouseDown}
          style={{ width: `${totalTimelineWidth}px` }}
          className="relative flex-1 bg-slate-900/50 cursor-crosshair overflow-hidden"
        >
          {/* Chapters / Bookmarks Strip */}
          <div className="h-6 border-b border-slate-800 relative bg-slate-950/70 flex items-center">
            {chapters.map((ch, idx) => {
              const x = ch.timestamp * pixelsPerSecond;
              return (
                <div
                  key={`ch-${ch.id || idx}-${idx}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeek(ch.timestamp);
                  }}
                  style={{ left: `${x}px` }}
                  className="absolute z-10 px-2 py-0.5 rounded bg-indigo-950 border border-indigo-500/50 text-[10px] text-indigo-300 font-semibold cursor-pointer hover:bg-indigo-900 flex items-center gap-1 shadow-sm -translate-y-0.5"
                >
                  <Bookmark className="w-2.5 h-2.5 fill-current" />
                  <span>{ch.title}</span>
                </div>
              );
            })}

            {/* Time ruler ticks */}
            {Array.from({ length: Math.ceil(duration) + 1 }).map((_, sec) => {
              const x = sec * pixelsPerSecond;
              return (
                <div
                  key={`ruler-sec-${sec}`}
                  style={{ left: `${x}px` }}
                  className="absolute top-0 bottom-0 border-l border-slate-800/80 pointer-events-none"
                >
                  <span className="text-[9px] font-mono text-slate-600 pl-1">{sec}s</span>
                </div>
              );
            })}
          </div>

          {/* Playhead Red Needle */}
          <div
            style={{ left: `${currentTime * pixelsPerSecond}px` }}
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none shadow-sm shadow-red-500"
          >
            <div className="w-3 h-3 bg-red-500 rounded-full -translate-x-[5px] -translate-y-1 shadow-md shadow-red-500/50" />
          </div>

          {/* Track 1: Video Segment */}
          <div className="h-10 border-b border-slate-800/70 relative p-1">
            <div
              style={{ width: `${duration * pixelsPerSecond}px` }}
              className="h-full rounded-md bg-blue-950/60 border border-blue-500/30 flex items-center px-3 gap-2 text-[11px] text-blue-200"
            >
              <Video className="w-3 h-3 text-blue-400 shrink-0" />
              <span className="font-medium truncate">{scene.title}</span>
            </div>
          </div>

          {/* Track 2: Overlays & Hotspots (Draggable + Resizable) */}
          <div className="h-10 border-b border-slate-800/70 relative p-1">
            {overlayItems.map((item, idx) => {
              const left = item.timestamp * pixelsPerSecond;
              const width = Math.max(38, (item.duration || 6) * pixelsPerSecond);
              const isSelected = selectedInteractionId === item.id;
              return (
                <div
                  key={`track-overlay-${item.id || idx}-${idx}`}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onSelectInteraction(item.id);
                    setDraggingItemId(item.id);
                    setDragStartX(e.clientX);
                    setOriginalItemTimestamp(item.timestamp);
                  }}
                  style={{ left: `${left}px`, width: `${width}px` }}
                  className={`absolute top-1 bottom-1 rounded-md px-2 flex items-center justify-between text-[11px] cursor-grab active:cursor-grabbing transition-shadow ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold ring-2 ring-white shadow-lg'
                      : 'bg-amber-950/80 border border-amber-500/40 text-amber-200 hover:bg-amber-900/90'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Layers className="w-3 h-3 shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </div>

                  {/* Resize handle on right edge */}
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setResizingItemId(item.id);
                      setDragStartX(e.clientX);
                      setOriginalItemDuration(item.duration || 6);
                    }}
                    className="w-2.5 h-full cursor-ew-resize hover:bg-white/30 rounded-r flex items-center justify-center -mr-1"
                    title="Glisser pour ajuster la durée"
                  >
                    <div className="w-0.5 h-3 bg-white/50" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Track 3: Quiz & Check Gates (Draggable) */}
          <div className="h-10 border-b border-slate-800/70 relative p-1">
            {quizItems.map((item, idx) => {
              const left = item.timestamp * pixelsPerSecond;
              const width = Math.max(38, (item.duration || 10) * pixelsPerSecond);
              const isSelected = selectedInteractionId === item.id;
              return (
                <div
                  key={`track-quiz-${item.id || idx}-${idx}`}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onSelectInteraction(item.id);
                    setDraggingItemId(item.id);
                    setDragStartX(e.clientX);
                    setOriginalItemTimestamp(item.timestamp);
                  }}
                  style={{ left: `${left}px`, width: `${width}px` }}
                  className={`absolute top-1 bottom-1 rounded-md px-2 flex items-center justify-between text-[11px] cursor-grab active:cursor-grabbing transition-shadow ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 font-bold ring-2 ring-white shadow-lg'
                      : 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-900/90'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <HelpCircle className="w-3 h-3 shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </div>
                  <span className="font-mono text-[9px] px-1 rounded bg-black/30 ml-1">
                    {item.quiz?.points || 20}p
                  </span>
                </div>
              );
            })}
          </div>

          {/* Track 4: 3D Objects & Advanced */}
          <div className="h-10 border-b border-slate-800/70 relative p-1">
            {advancedItems.map((item, idx) => {
              const left = item.timestamp * pixelsPerSecond;
              const width = Math.max(38, (item.duration || 12) * pixelsPerSecond);
              const isSelected = selectedInteractionId === item.id;
              return (
                <div
                  key={`track-adv-${item.id || idx}-${idx}`}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onSelectInteraction(item.id);
                    setDraggingItemId(item.id);
                    setDragStartX(e.clientX);
                    setOriginalItemTimestamp(item.timestamp);
                  }}
                  style={{ left: `${left}px`, width: `${width}px` }}
                  className={`absolute top-1 bottom-1 rounded-md px-2 flex items-center justify-between text-[11px] cursor-grab active:cursor-grabbing transition-shadow ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 font-bold ring-2 ring-white shadow-lg'
                      : 'bg-cyan-950/80 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-900/90'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Cpu className="w-3 h-3 shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
