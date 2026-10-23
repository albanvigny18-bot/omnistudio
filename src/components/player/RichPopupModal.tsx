import React, { useState } from 'react';
import { X, Volume2, ExternalLink, Play, ArrowRight, Sparkles } from 'lucide-react';
import { InteractionItem } from '../../types';
import { soundFX } from '../../services/soundEffects';

interface RichPopupModalProps {
  item: InteractionItem | null;
  onClose: () => void;
  onResumeVideo: () => void;
}

export const RichPopupModal: React.FC<RichPopupModalProps> = ({
  item,
  onClose,
  onResumeVideo,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  if (!item) return null;

  const title = item.popupTitle || item.title;
  const text = item.popupText || item.content || item.description || 'Découvrez les détails de cet élément interactif.';
  const imageUrl = item.popupImageUrl || item.imageUrl;
  const audioUrl = item.popupAudioUrl || item.audioUrl;
  const buttonText = item.popupButtonText;
  const buttonUrl = item.popupButtonUrl;

  const handlePlayAudio = () => {
    soundFX.play('click');
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(() => {});
      setIsPlayingAudio(true);
      audio.onended = () => setIsPlayingAudio(false);
    } else {
      // Synthesize audio feedback
      soundFX.play('unlock');
      setIsPlayingAudio(true);
      setTimeout(() => setIsPlayingAudio(false), 1200);
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6 select-none animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col text-xs">
        {/* Optional Header Image Banner */}
        {imageUrl && (
          <div className="relative w-full h-44 bg-slate-950 overflow-hidden">
            <img
              src={imageUrl}
              alt={title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/30" />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-950/70 text-slate-300 hover:text-white hover:bg-slate-950"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-semibold border border-indigo-500/30">
                Information Interactive
              </span>
              <h3 className="text-base font-bold text-slate-100">{title}</h3>
            </div>
            {!imageUrl && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{text}</p>

          {/* Audio narration button if available */}
          {audioUrl && (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300">
                <Volume2 className="w-4 h-4 text-purple-400" />
                <span className="font-medium text-[11px]">Écouter l'explication audio</span>
              </div>
              <button
                onClick={handlePlayAudio}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  isPlayingAudio
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                <Play className="w-3 h-3 fill-current" />
                <span>{isPlayingAudio ? 'Lecture...' : 'Écouter'}</span>
              </button>
            </div>
          )}

          {/* External Call to Action button if configured */}
          {buttonText && buttonUrl && (
            <a
              href={buttonUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => soundFX.play('click')}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <span>{buttonText}</span>
              <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
            </a>
          )}

          {/* Resume video primary action */}
          <button
            onClick={() => {
              soundFX.play('click');
              onClose();
              onResumeVideo();
            }}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
          >
            <span>Reprendre la Vidéo</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
