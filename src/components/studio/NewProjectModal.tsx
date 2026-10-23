import React, { useState, useRef } from 'react';
import { Plus, X, Upload, Video, Briefcase, Shield, BookOpen, GraduationCap, Sparkles } from 'lucide-react';
import { InteractiveProject } from '../../types';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (project: InteractiveProject) => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'Business' | 'Engineering' | 'Medical' | 'Cybersecurity' | 'Custom'>('Business');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('Concepteur Pédagogique');
  const [targetAudience, setTargetAudience] = useState('Salariés, Étudiants ou Professionnels');
  const [passingScore, setPassingScore] = useState(80);
  const [videoSourceType, setVideoSourceType] = useState<'procedural' | 'upload' | 'sample'>('procedural');
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadedVideoUrl(url);
    setVideoSourceType('upload');
  };

  const handleCreate = () => {
    if (!title.trim()) return;

    let videoUrl: string | undefined = undefined;
    if (videoSourceType === 'upload') {
      videoUrl = uploadedVideoUrl;
    } else if (videoSourceType === 'sample') {
      videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';
    }

    const newProject: InteractiveProject = {
      metadata: {
        id: `proj-${Date.now()}`,
        title: title.trim(),
        category,
        description: description.trim() || 'Module e-learning interactif créé sur mesure.',
        author: author.trim() || 'Auteur',
        version: '1.0.0',
        targetAudience,
        language: 'Français',
        createdDate: new Date().toISOString().split('T')[0],
      },
      startSceneId: 'scene-init-1',
      variables: {
        score: {
          name: 'score',
          type: 'number',
          defaultValue: 0,
          currentValue: 0,
          description: 'Score de progression globale de l\'apprenant',
        },
      },
      gamification: {
        score: 0,
        maxScore: 100,
        level: 1,
        xp: 0,
        badges: [
          {
            id: 'badge-starter',
            title: 'Premier Pas',
            description: 'A démarré le module interactif.',
            icon: 'Sparkles',
          },
        ],
        inventory: [],
      },
      scormSettings: {
        passingScorePercent: passingScore,
        allowRetake: true,
        scormVersion: '2004',
        reportAs: 'Passed/Failed',
      },
      scenes: [
        {
          id: 'scene-init-1',
          title: 'Scène 1 : Introduction & Présentation',
          description: 'Introduction aux objectifs clés du module.',
          duration: 35,
          videoUrl,
          videoType: 'procedural',
          learningObjective: 'Assimiler les fondamentaux du sujet.',
          chapters: [
            { id: 'ch-1', title: 'Introduction', timestamp: 0 },
            { id: 'ch-2', title: 'Point Clé', timestamp: 12 },
            { id: 'ch-3', title: 'Validation', timestamp: 24 },
          ],
          interactions: [
            {
              id: `int-${Date.now()}-1`,
              type: 'hotspot',
              title: 'Point d\'attention',
              timestamp: 8,
              duration: 8,
              pauseOnTrigger: false,
              xPercent: 50,
              yPercent: 45,
              widthPercent: 12,
              heightPercent: 12,
              styleVariant: 'glass',
              popupTitle: 'Information Clé',
              popupText: 'Consultez ce rappel essentiel avant de passer à l\'évaluation formative.',
              actionOnClick: 'open_popup',
              triggers: [],
            },
            {
              id: `int-${Date.now()}-2`,
              type: 'quiz',
              title: 'Quiz de validation',
              timestamp: 22,
              duration: 15,
              pauseOnTrigger: true,
              xPercent: 50,
              yPercent: 50,
              widthPercent: 60,
              heightPercent: 65,
              styleVariant: 'glass',
              quiz: {
                type: 'multiple_choice',
                title: 'Quel est l\'objectif prioritaire de cette étape ?',
                explanation: 'La conformité aux instructions garantit une efficacité optimale.',
                points: 25,
                isMultipleChoice: false,
                options: [
                  { id: 'opt-1', text: 'Option A : Respecter scrupuleusement la procédure', isCorrect: true, feedback: 'Bravo !' },
                  { id: 'opt-2', text: 'Option B : Ignorer les signaux d\'alerte', isCorrect: false, feedback: 'Incorrect.' },
                ],
              },
              triggers: [],
            },
          ],
          layers: [],
          branchingChoices: [],
        },
      ],
    };

    onCreateProject(newProject);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6 select-none animate-in fade-in">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-xs">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Créer un Nouveau Projet Interactif Vierge</h3>
              <p className="text-[11px] text-slate-400">
                Adaptable à tous secteurs : Entreprise, Éducation, Sécurité, Industrie, Vente
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Titre du module / formation : *</label>
            <input
              type="text"
              required
              placeholder="Ex: Formation Cybersécurité, Onboarding RH, Gestion de Projet Agile..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Domaine / Secteur :</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="Business">Entreprise, RH & Management</option>
                <option value="Engineering">Industrie & Ingénierie</option>
                <option value="Cybersecurity">Informatique & Cybersécurité</option>
                <option value="Medical">Santé & Médical</option>
                <option value="Custom">Formation Générale / Sur-mesure</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Score requis SCORM (%) :</label>
              <input
                type="number"
                min="0"
                max="100"
                value={passingScore}
                onChange={(e) => setPassingScore(parseInt(e.target.value, 10) || 80)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono text-center"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Description / Objectif :</label>
            <textarea
              rows={2}
              placeholder="Ex: Sensibiliser les collaborateurs aux bonnes pratiques et tester leurs réflexes."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 leading-relaxed"
            />
          </div>

          {/* Video Source Option */}
          <div>
            <label className="text-slate-300 font-semibold block mb-1.5">Source Vidéo Initiale :</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setVideoSourceType('procedural')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  videoSourceType === 'procedural'
                    ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Video className="w-4 h-4 mx-auto mb-1 text-indigo-400" />
                <span>Générateur Haute Fidélité</span>
              </button>

              <button
                type="button"
                onClick={() => setVideoSourceType('sample')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  videoSourceType === 'sample'
                    ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4 mx-auto mb-1 text-cyan-400" />
                <span>Vidéo HD Démo (MP4)</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`p-3 rounded-xl border text-center transition-all ${
                  videoSourceType === 'upload'
                    ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Upload className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                <span>Importer mon MP4...</span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={!title.trim()}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all mt-2"
          >
            <Plus className="w-4 h-4" />
            <span>Créer le Projet & Lancer le Studio de Montage</span>
          </button>
        </div>
      </div>
    </div>
  );
};
