import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  X,
  Sparkles,
  MousePointer,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  Download,
  Shield,
  Layers,
} from 'lucide-react';
import { analyticsService, HeatmapPoint } from '../../services/analyticsService';
import { VideoScene } from '../../types';

interface AnalyticsHeatmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  scene: VideoScene;
}

export const AnalyticsHeatmapModal: React.FC<AnalyticsHeatmapModalProps> = ({
  isOpen,
  onClose,
  scene,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [filterType, setFilterType] = useState<'all' | 'clicks' | 'hotspots' | 'quiz'>('all');
  const session = analyticsService.getSession();
  const insights = analyticsService.getAiPedagogicalInsights();

  // Render heatmap onto canvas
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Dark stage background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, w, h);

    // Subtle video grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Filter points
    const points = session.heatmapPoints.filter((p) => {
      if (filterType === 'clicks') return p.type === 'click';
      if (filterType === 'hotspots') return p.type === 'hotspot_touch';
      if (filterType === 'quiz') return p.type === 'quiz_interaction';
      return true;
    });

    // Render radial heat blobs with blend mode
    ctx.globalCompositeOperation = 'screen';

    points.forEach((pt) => {
      const cx = (pt.x / 100) * w;
      const cy = (pt.y / 100) * h;
      const radius = 55;

      const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, radius);
      grad.addColorStop(0, 'rgba(239, 68, 68, 0.85)'); // Red core
      grad.addColorStop(0.35, 'rgba(234, 179, 8, 0.6)'); // Yellow
      grad.addColorStop(0.7, 'rgba(59, 130, 246, 0.3)'); // Blue
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Small central marker
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalCompositeOperation = 'source-over';
  }, [isOpen, filterType, session.heatmapPoints]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6 select-none">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-xs max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Analyse Comportementale & Heatmap Vidéo Interactive
              </h3>
              <p className="text-[11px] text-slate-400">
                Carte thermique des clics, temps d'hésitation, rétention et suggestions d'optimisation IA
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Key Metrics Strip */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span>Temps d'hésitation moyen</span>
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <p className="text-xl font-bold font-mono text-indigo-300">
                {insights.averageHesitation}s
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Délai avant 1ère réponse</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span>Taux de complétion</span>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-xl font-bold font-mono text-emerald-300">
                {insights.completionIndex}%
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Parcours mené au terme</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span>Points chauds détectés</span>
                <MousePointer className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <p className="text-xl font-bold font-mono text-amber-300">
                {session.heatmapPoints.length}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Interactions enregistrées</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span>Sécurité & RGPD</span>
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <p className="text-sm font-bold text-cyan-300 mt-1">Conforme 100%</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Données télémétriques anonymisées</p>
            </div>
          </div>

          {/* Heatmap Canvas Container */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">
                Carte Thermique des Clics Apprenants :
              </span>
              <div className="flex items-center gap-1.5 p-0.5 rounded-lg bg-slate-950 border border-slate-800">
                {(['all', 'clicks', 'hotspots', 'quiz'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setFilterType(filter)}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                      filterType === filter ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {filter === 'all' ? 'Tous' : filter === 'clicks' ? 'Clics' : filter === 'hotspots' ? 'Hotspots' : 'Quiz'}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 flex items-center justify-center">
              <canvas ref={canvasRef} width={800} height={450} className="w-full h-full object-cover" />

              {/* Heatmap Legend */}
              <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center gap-2 text-[10px] font-mono text-slate-300">
                <span>Faible</span>
                <div className="w-16 h-2 rounded bg-gradient-to-r from-blue-500 via-yellow-400 to-red-500" />
                <span>Intensif</span>
              </div>
            </div>
          </div>

          {/* AI Pedagogical Recommendations */}
          <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-2.5">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Recommandations d'Amélioration Pédagogique par l'IA :</span>
            </div>
            <ul className="space-y-1.5 text-slate-200 text-xs">
              {insights.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
