import React, { useState } from 'react';
import {
  Sparkles,
  Wand2,
  Scan,
  HelpCircle,
  Volume2,
  Languages,
  X,
  Loader2,
  Check,
  FileText,
  Upload,
} from 'lucide-react';
import {
  generateStoryboard,
  scanInteractions,
  generateQuizQuestions,
  playTtsVoiceover,
  translateProjectItems,
  convertDocumentToInteractiveCourse,
} from '../../services/geminiService';
import { VideoScene, InteractionItem, QuizData } from '../../types';

interface AIStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeScene: VideoScene;
  onApplyStoryboard: (scenes: VideoScene[]) => void;
  onApplyInteractions: (interactions: InteractionItem[]) => void;
  onApplyQuizQuestions: (questions: QuizData[]) => void;
}

export const AIStudioModal: React.FC<AIStudioModalProps> = ({
  isOpen,
  onClose,
  activeScene,
  onApplyStoryboard,
  onApplyInteractions,
  onApplyQuizQuestions,
}) => {
  const [activeTab, setActiveTab] = useState<'storyboard' | 'document' | 'scanner' | 'quiz' | 'tts' | 'translate'>('storyboard');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Storyboard form
  const [storyboardTopic, setStoryboardTopic] = useState('Gestion de crise en salle de contrôle nucléaire');
  const [storyboardAudience, setStoryboardAudience] = useState('Ingénieurs & Opérateurs');
  const [storyboardDuration, setStoryboardDuration] = useState(4);

  // Document to Course form (Section 9.2)
  const [docTitle, setDocTitle] = useState('Procédure de Sécurité & Intervention Critique');
  const [docContent, setDocContent] = useState(`CHAPITRE 1 : VÉRIFICATION PRÉALABLE & CONSIGNATION
Avant toute intervention, procéder à la consignation en 5 étapes indispensables :
1. Séparation physique du réseau électrique principal.
2. Condamnation avec cadenas individuel et pose de badge d'avertissement.
3. Vérification d'Absence de Tension (VAT) avec appareil étalonné.
4. Mise à la terre et en court-circuit immédiat.
5. Protection des pièces nues sous tension à proximité.

CHAPITRE 2 : INTERVENTION ET RISQUES CRITIQUES
En cas de surchauffe anormale (>65°C), interrompre l'opération et prévenir sans délai le superviseur d'astreinte.`);

  // Scanner form
  const [scannerDensity, setScannerDensity] = useState('balanced');

  // Quiz form
  const [quizTopic, setQuizTopic] = useState(activeScene.title || 'Procédures critiques');
  const [quizCount, setQuizCount] = useState(3);

  // TTS form
  const [ttsText, setTtsText] = useState('Bienvenue dans cette simulation interactive. Prenez connaissance des paramètres critiques.');
  const [ttsVoice, setTtsVoice] = useState('Kore');
  const [isPlayingTts, setIsPlayingTts] = useState(false);

  // Translate form
  const [targetLang, setTargetLang] = useState('English');

  if (!isOpen) return null;

  const handleGenerateStoryboard = async () => {
    setIsLoading(true);
    setSuccessMessage(null);
    try {
      const res = await generateStoryboard(storyboardTopic, storyboardAudience, storyboardDuration);
      if (res.scenes && res.scenes.length > 0) {
        onApplyStoryboard(res.scenes);
        setSuccessMessage(`Storyboard de ${res.scenes.length} scènes généré avec succès !`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvertDocument = async () => {
    if (!docContent.trim()) return;
    setIsLoading(true);
    setSuccessMessage(null);
    try {
      const res = await convertDocumentToInteractiveCourse(docContent, docTitle);
      if (res.scenes && res.scenes.length > 0) {
        onApplyStoryboard(res.scenes);
        setSuccessMessage(`Document découpé avec succès en ${res.scenes.length} scènes interactives avec quiz et objectifs !`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanInteractions = async () => {
    setIsLoading(true);
    setSuccessMessage(null);
    try {
      const res = await scanInteractions(
        activeScene.title,
        activeScene.description,
        activeScene.duration,
        scannerDensity
      );
      if (res.interactions && res.interactions.length > 0) {
        onApplyInteractions(res.interactions);
        setSuccessMessage(`${res.interactions.length} interactions détectées et injectées sur la timeline !`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    setIsLoading(true);
    setSuccessMessage(null);
    try {
      const res = await generateQuizQuestions(quizTopic, quizCount);
      if (res.questions && res.questions.length > 0) {
        onApplyQuizQuestions(res.questions);
        setSuccessMessage(`${res.questions.length} questions générées et ajoutées comme points de contrôle !`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayTts = async () => {
    setIsPlayingTts(true);
    try {
      await playTtsVoiceover(ttsText, ttsVoice);
    } catch (err) {
      console.error(err);
    } finally {
      setIsPlayingTts(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">OmniStudio AI Copilot</h3>
              <p className="text-[11px] text-slate-400">
                Génération de scénarios, interactions, quiz et voix synchronisées par Gemini
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-6 gap-2 text-xs">
          {[
            { id: 'storyboard', label: 'Storyboard', icon: Wand2 },
            { id: 'document', label: 'Document vers Module', icon: FileText },
            { id: 'scanner', label: 'Scanner Vidéo', icon: Scan },
            { id: 'quiz', label: 'Quiz IA', icon: HelpCircle },
            { id: 'tts', label: 'Voix-Off TTS', icon: Volume2 },
            { id: 'translate', label: 'Traducteur', icon: Languages },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSuccessMessage(null);
                }}
                className={`py-3 px-3 flex items-center gap-1.5 font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs">
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 flex items-center gap-2 text-xs">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Tab 1: Storyboard Generator */}
          {activeTab === 'storyboard' && (
            <div className="space-y-4">
              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">
                  Sujet du module ou situation d'apprentissage :
                </label>
                <input
                  type="text"
                  value={storyboardTopic}
                  onChange={(e) => setStoryboardTopic(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  placeholder="Ex: Triage aux urgences pédiatriques, Pilotage de drone de secours..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1.5">Public cible :</label>
                  <input
                    type="text"
                    value={storyboardAudience}
                    onChange={(e) => setStoryboardAudience(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1.5">Durée ciblée (minutes) :</label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={storyboardDuration}
                    onChange={(e) => setStoryboardDuration(parseInt(e.target.value, 10) || 3)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleGenerateStoryboard}
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-colors"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Conception du storyboard en cours...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      <span>Générer le Storyboard & Arborescence Complète</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Tab: Document to Course (Section 9.2) */}
          {activeTab === 'document' && (
            <div className="space-y-4">
              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">
                  Titre du module de formation à concevoir :
                </label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 font-semibold block">
                    Texte du document, cours ou procédure opérationnelle :
                  </label>
                  <span className="text-[10px] text-indigo-400 font-mono">Format PDF · Word · Markdown</span>
                </div>
                <textarea
                  rows={7}
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  placeholder="Collez ici le texte de votre cours, rapport technique ou consignes..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
                />
              </div>

              <button
                onClick={handleConvertDocument}
                disabled={isLoading || !docContent.trim()}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-95"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Découpage du document, extraction des notions et quiz en cours...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Transformer en Parcours Interactif (Scènes + Hotspots + Quiz)</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Tab 2: Scanner Video */}
          {activeTab === 'scanner' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <p className="font-semibold text-slate-200">Scène en cours d'analyse :</p>
                <p className="text-indigo-400 font-medium mt-0.5">{activeScene.title}</p>
                <p className="text-slate-400 text-[11px] mt-1">{activeScene.description}</p>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">
                  Densité d'interactions souhaitée :
                </label>
                <select
                  value={scannerDensity}
                  onChange={(e) => setScannerDensity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="light">Légère (1 à 2 points clés)</option>
                  <option value="balanced">Équilibrée (3 à 4 points clés recommandés)</option>
                  <option value="dense">Haute intensité / Escape Game (5+ points et indices)</option>
                </select>
              </div>

              <button
                onClick={handleScanInteractions}
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Scan et calcul des touchpoints...</span>
                  </>
                ) : (
                  <>
                    <Scan className="w-4 h-4" />
                    <span>Scanner la Vidéo & Générer les Hotspots Automatiquement</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Tab 3: Quiz Generator */}
          {activeTab === 'quiz' && (
            <div className="space-y-4">
              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">Thématique du Quiz :</label>
                <input
                  type="text"
                  value={quizTopic}
                  onChange={(e) => setQuizTopic(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">Nombre de questions :</label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={quizCount}
                  onChange={(e) => setQuizCount(parseInt(e.target.value, 10) || 3)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <button
                onClick={handleGenerateQuiz}
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Création des questions et critères d'évaluation...</span>
                  </>
                ) : (
                  <>
                    <HelpCircle className="w-4 h-4" />
                    <span>Générer les Questions & Feedbacks Adaptatifs</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Tab 4: TTS Studio */}
          {activeTab === 'tts' && (
            <div className="space-y-4">
              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">
                  Texte à synthétiser en voix-off :
                </label>
                <textarea
                  rows={3}
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">Voix IA de synthèse :</label>
                <select
                  value={ttsVoice}
                  onChange={(e) => setTtsVoice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="Kore">Kore (Voix pédagogique chaleureuse et claire)</option>
                  <option value="Puck">Puck (Voix dynamique & captivante)</option>
                  <option value="Zephyr">Zephyr (Voix technique posée)</option>
                </select>
              </div>

              <button
                onClick={handlePlayTts}
                disabled={isPlayingTts}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2 shadow-lg transition-colors"
              >
                {isPlayingTts ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Synthèse vocale en cours de lecture...</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    <span>Écouter la Voix-Off IA Synchronisée</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Tab 5: Translate */}
          {activeTab === 'translate' && (
            <div className="space-y-4">
              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">Langue cible :</label>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="English">Anglais (English)</option>
                  <option value="Español">Espagnol (Español)</option>
                  <option value="Deutsch">Allemand (Deutsch)</option>
                  <option value="Japanese">Japonais (日本語)</option>
                </select>
              </div>

              <button
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    const sampleItems = [activeScene.title, activeScene.learningObjective];
                    const res = await translateProjectItems(sampleItems, targetLang);
                    setSuccessMessage(`Module traduit en ${targetLang} ! Titre : ${res.translations?.[0]}`);
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2 shadow-lg transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Languages className="w-4 h-4" />
                )}
                <span>Traduire Tout le Module Automatiquement</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
