import React, { useState } from 'react';
import {
  Download,
  Package,
  FileCode,
  FileText,
  Database,
  CheckCircle,
  X,
  Share2,
  Settings2,
  Upload,
} from 'lucide-react';
import { InteractiveProject } from '../../types';
import {
  downloadScorm12Zip,
  downloadScorm2004Zip,
  downloadStandaloneHtmlFile,
  downloadWordDocument,
  downloadProjectJson,
} from '../../services/exportService';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: InteractiveProject;
  onUpdateProject: (updated: InteractiveProject) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateProject,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExportScorm12 = async () => {
    await downloadScorm12Zip(project);
    setDownloadSuccess('Package SCORM 1.2 généré et téléchargé avec succès !');
  };

  const handleExportScorm2004 = async () => {
    await downloadScorm2004Zip(project);
    setDownloadSuccess('Package SCORM 2004 4ème Édition généré et téléchargé avec succès !');
  };

  const handleExportHtml = () => {
    downloadStandaloneHtmlFile(project);
    setDownloadSuccess('Application HTML5 autonome téléchargée ! (Jouable hors-ligne)');
  };

  const handleExportWord = () => {
    downloadWordDocument(project);
    setDownloadSuccess('Document Word (.doc) complet du storyboard téléchargé !');
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExportJson = () => {
    downloadProjectJson(project);
    setDownloadSuccess('Sauvegarde JSON du projet téléchargée !');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.metadata && parsed.scenes && Array.isArray(parsed.scenes)) {
          onUpdateProject(parsed);
          setDownloadSuccess(`Projet "${parsed.metadata.title}" importé avec succès !`);
        } else {
          alert('Le fichier sélectionné ne correspond pas au format de projet OmniStudio.');
        }
      } catch (err) {
        alert('Erreur lors de la lecture du fichier JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-xs">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Centre d'Exportation Multi-Formats</h3>
              <p className="text-[11px] text-slate-400">
                SCORM 1.2/2004, xAPI, HTML5 autonome, Word, Moodle & Mobile
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

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {downloadSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium">{downloadSuccess}</span>
            </div>
          )}

          {/* SCORM Settings Bar */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-slate-300">
              <Settings2 className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold">Paramètres LMS :</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Seuil de réussite requis :</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={project.scormSettings.passingScorePercent}
                  onChange={(e) =>
                    onUpdateProject({
                      ...project,
                      scormSettings: {
                        ...project.scormSettings,
                        passingScorePercent: parseInt(e.target.value, 10) || 80,
                      },
                    })
                  }
                  className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono text-center"
                />
                <span className="text-slate-400">%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Rapport :</span>
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[11px]">
                  {project.scormSettings.reportAs}
                </span>
              </div>
            </div>
          </div>

          {/* Export Grid Options */}
          <div className="grid grid-cols-2 gap-4">
            {/* SCORM 1.2 */}
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-indigo-500/50 transition-colors flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-100 text-sm">Package SCORM 1.2</span>
                  <Package className="w-4 h-4 text-indigo-400" />
                </div>
                <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                  Le standard le plus universel. Compatible 100% avec Moodle, Blackboard, Canvas, Cornerstone et tout LMS d'entreprise.
                </p>
              </div>
              <button
                onClick={handleExportScorm12}
                className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger SCORM 1.2 (.zip)</span>
              </button>
            </div>

            {/* SCORM 2004 */}
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-indigo-500/50 transition-colors flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-100 text-sm">SCORM 2004 4th Edition</span>
                  <Package className="w-4 h-4 text-cyan-400" />
                </div>
                <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                  Support complet des scores échelonnés, séquencement avancé et statut de complétion précis.
                </p>
              </div>
              <button
                onClick={handleExportScorm2004}
                className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger SCORM 2004 (.zip)</span>
              </button>
            </div>

            {/* Standalone HTML5 */}
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-emerald-500/50 transition-colors flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-100 text-sm">HTML5 Autonome Hors-Ligne</span>
                  <FileCode className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                  Fichier HTML unique contenant le lecteur interactif, le moteur 3D et le projet. S'ouvre sans serveur web par double clic.
                </p>
              </div>
              <button
                onClick={handleExportHtml}
                className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger HTML5 Solo (.html)</span>
              </button>
            </div>

            {/* Word / PDF Storyboard */}
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-amber-500/50 transition-colors flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-100 text-sm">Script Word / Transcript (.doc)</span>
                  <FileText className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                  Dossier pédagogique textuel complet : objectifs, déroulé des scènes, questions de quiz, corrigés et critères d'évaluation.
                </p>
              </div>
              <button
                onClick={handleExportWord}
                className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger Document Word (.doc)</span>
              </button>
            </div>
          </div>

          {/* Project Backup & Import JSON */}
          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="w-4 h-4 text-purple-400" />
              <div>
                <p className="font-semibold text-slate-200">Fichier de Projet OmniStudio (.json)</p>
                <p className="text-[11px] text-slate-400">Exportez votre projet brut pour sauvegarde ou réimportez un fichier à tout moment</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportJson}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-medium transition-colors flex items-center gap-1.5"
                title="Importer un fichier .json pour restaurer un projet"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Importer JSON</span>
              </button>

              <button
                onClick={handleExportJson}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Sauvegarder JSON</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
