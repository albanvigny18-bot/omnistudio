import React, { useState } from 'react';
import {
  Users,
  Shield,
  FileCheck,
  History,
  X,
  UserPlus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { InteractiveProject } from '../../types';
import { soundFX } from '../../services/soundEffects';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'designer' | 'reviewer' | 'viewer';
  avatarUrl: string;
  lastActive: string;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  target: string;
  status: 'success' | 'pending' | 'flagged';
}

interface TeamCollaborationModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: InteractiveProject;
}

export const TeamCollaborationModal: React.FC<TeamCollaborationModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'workflow' | 'audit'>('members');
  const [members, setMembers] = useState<TeamMember[]>([
    {
      id: 'usr-1',
      name: 'Alban Vigny',
      email: 'albanvigny18@gmail.com',
      role: 'admin',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      lastActive: 'À l’instant',
    },
    {
      id: 'usr-2',
      name: 'Dr. Éric Laurent',
      email: 'e.laurent@institut-simulation.fr',
      role: 'designer',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      lastActive: 'Il y a 14 min',
    },
    {
      id: 'usr-3',
      name: 'Claire Beauchamp',
      email: 'c.beauchamp@compliance-ed.org',
      role: 'reviewer',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
      lastActive: 'Il y a 2 heures',
    },
  ]);

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    {
      id: 'log-1',
      timestamp: 'Aujourd’hui à 05:48',
      user: 'Alban Vigny',
      action: 'Vérification Linter Qualité',
      target: 'Toutes les scènes du projet',
      status: 'success',
    },
    {
      id: 'log-2',
      timestamp: 'Aujourd’hui à 05:32',
      user: 'Alban Vigny',
      action: 'Ajout de composants interactifs',
      target: 'Bulle Présentateur & Bloc Code',
      status: 'success',
    },
    {
      id: 'log-3',
      timestamp: 'Hier à 18:20',
      user: 'Dr. Éric Laurent',
      action: 'Mise à jour du Seuil SCORM Passing',
      target: 'Score fixé à 80%',
      status: 'success',
    },
    {
      id: 'log-4',
      timestamp: 'Hier à 14:15',
      user: 'Claire Beauchamp',
      action: 'Revue de conformité pédagogique',
      target: 'Objectifs d’apprentissage validés',
      status: 'success',
    },
  ]);

  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'designer' | 'reviewer' | 'viewer'>('designer');
  const [validationStatus, setValidationStatus] = useState<'draft' | 'under_review' | 'approved'>('approved');

  if (!isOpen) return null;

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;
    soundFX.playClick();
    const newEntry: TeamMember = {
      id: `usr-${Date.now()}`,
      name: newMemberEmail.split('@')[0],
      email: newMemberEmail.trim(),
      role: newMemberRole,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
      lastActive: 'Invitation envoyée',
    };
    setMembers((prev) => [...prev, newEntry]);
    setNewMemberEmail('');
  };

  const getRoleBadge = (role: TeamMember['role']) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">Administrateur</span>;
      case 'designer':
        return <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">Concepteur Pédagogique</span>;
      case 'reviewer':
        return <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">Réviseur Qualité</span>;
      case 'viewer':
        return <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700">Lecteur</span>;
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[85vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-xs"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Espace d’Équipe, Rôles & Journal d’Audit
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-semibold border border-indigo-500/30">
                  Sections 17 & 18
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Contrôle d’accès granulaire, workflow d’approbation Qualiopi et traçabilité des modifications.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-6 border-b border-slate-800 bg-slate-950/40 flex gap-4">
          <button
            onClick={() => setActiveTab('members')}
            className={`py-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'members'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Membres & Rôles ({members.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('workflow')}
            className={`py-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'workflow'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Validation & Publication</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'audit'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Journal d’Audit ({auditLogs.length})</span>
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'members' && (
            <div className="space-y-4">
              {/* Add member form */}
              <form onSubmit={handleAddMember} className="flex gap-2">
                <input
                  type="email"
                  placeholder="Adresse email du collaborateur..."
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                />
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as any)}
                  className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="designer">Concepteur Pédagogique</option>
                  <option value="reviewer">Réviseur Qualité</option>
                  <option value="viewer">Lecteur</option>
                </select>
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Inviter</span>
                </button>
              </form>

              {/* Members List */}
              <div className="space-y-2">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={m.avatarUrl}
                        alt={m.name}
                        className="w-9 h-9 rounded-full object-cover border border-slate-700"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-100">{m.name}</span>
                          <span className="text-[10px] text-slate-400">({m.email})</span>
                        </div>
                        <span className="text-[10px] text-slate-500">Dernière activité : {m.lastActive}</span>
                      </div>
                    </div>

                    <div>{getRoleBadge(m.role)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'workflow' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                <span className="text-xs font-bold text-slate-200 block">
                  Statut de Conformité du Projet pour Diffusion :
                </span>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      setValidationStatus('draft');
                      soundFX.playClick();
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      validationStatus === 'draft'
                        ? 'bg-amber-950/40 border-amber-500/80 text-amber-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <Clock className="w-4 h-4 mb-1 text-amber-400" />
                    <p className="font-semibold">Ébauche</p>
                    <p className="text-[10px] mt-0.5 text-slate-400">Édition en cours</p>
                  </button>

                  <button
                    onClick={() => {
                      setValidationStatus('under_review');
                      soundFX.playClick();
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      validationStatus === 'under_review'
                        ? 'bg-indigo-950/40 border-indigo-500/80 text-indigo-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 mb-1 text-indigo-400" />
                    <p className="font-semibold">En Révision</p>
                    <p className="text-[10px] mt-0.5 text-slate-400">Attente validation</p>
                  </button>

                  <button
                    onClick={() => {
                      setValidationStatus('approved');
                      soundFX.playCorrect();
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      validationStatus === 'approved'
                        ? 'bg-emerald-950/40 border-emerald-500/80 text-emerald-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 mb-1 text-emerald-400" />
                    <p className="font-semibold">Approuvé</p>
                    <p className="text-[10px] mt-0.5 text-slate-400">Diffusion autorisée</p>
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300 space-y-1.5 leading-relaxed">
                <span className="font-semibold text-slate-100 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  Règles de Verrouillage & Sécurité :
                </span>
                <p>
                  Lorsqu'un projet est marqué <strong>Approuvé</strong>, les modifications de seuil de réussite SCORM et de structure d'embranchement requièrent l'accord d'un Administrateur pour éviter toute régression sur les apprenants déjà certifiés.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200">{log.action}</span>
                        <span className="text-[10px] text-slate-400">({log.target})</span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        Effectué par <strong className="text-slate-300">{log.user}</strong> · {log.timestamp}
                      </span>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300">
                    Tracabilité certifiée
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-[11px] text-slate-400">
          <span>Chiffrement des permissions côté serveur et conforme à la Loi sur les renseignements personnels</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
