/**
 * OmniStudio - Core Project Engine, Rule & Condition Evaluator, Schema Validator,
 * Version Control, and Persistence Service (Sections 6, 7, 12, 13, 21, 28, 31, 32, 34).
 */

import type {
  InteractiveProject,
  VideoScene,
  InteractionItem,
  TriggerRule,
  TriggerEvent,
  VariableDefinition,
} from '../types';
import { SAMPLE_PROJECTS } from '../data/sampleProjects';

export const NATIVE_FORMAT_VERSION = '2.0.0';
export const MAX_RULE_EXECUTION_STEPS = 25;

export interface ValidationIssue {
  id: string;
  code:
    | 'DUPLICATE_ID'
    | 'BROKEN_SCENE_REF'
    | 'ORPHAN_SCENE'
    | 'DEAD_END_SCENE'
    | 'CIRCULAR_LOOP'
    | 'UNDEFINED_VARIABLE'
    | 'TIMELINE_OVERFLOW'
    | 'INVALID_QUIZ'
    | 'WCAG_ACCESSIBILITY';
  severity: 'error' | 'warning' | 'info';
  sceneId?: string;
  interactionId?: string;
  message: string;
}

export interface ValidationReport {
  valid: boolean;
  schemaVersion: string;
  errorsCount: number;
  warningsCount: number;
  infoCount: number;
  issues: ValidationIssue[];
  reachableSceneIds: string[];
  detectedCycles: string[][];
}

export interface ProjectVersionSnapshot {
  versionId: string;
  projectId: string;
  versionNumber: string;
  label: string;
  author: string;
  createdAt: string;
  projectData: InteractiveProject;
}

export interface LearnerAssessmentRecord {
  recordId: string;
  projectId: string;
  projectTitle: string;
  learnerName: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  completedAt: string;
  timeSpentSeconds: number;
  visitedScenes: string[];
  answersGiven: {
    interactionId: string;
    questionTitle: string;
    correct: boolean;
    pointsEarned: number;
  }[];
  certificateId?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  projectId?: string;
  details: string;
}

/**
 * Normalizes any project object (imported, AI-generated, or legacy) so all arrays
 * and nested properties are guaranteed to exist and be well-typed.
 */
export function normalizeProject(raw: Partial<InteractiveProject> | any): InteractiveProject {
  const defaultBase = SAMPLE_PROJECTS[0];
  if (!raw || typeof raw !== 'object') {
    return JSON.parse(JSON.stringify(defaultBase));
  }

  const scenes: VideoScene[] = Array.isArray(raw.scenes) && raw.scenes.length > 0
    ? raw.scenes.map((sc: any, sIdx: number) => ({
        id: sc?.id || `scene-${sIdx + 1}`,
        title: sc?.title || `Scène ${sIdx + 1}`,
        description: sc?.description || 'Description de la séquence pédagogique.',
        duration: typeof sc?.duration === 'number' && sc.duration > 0 ? sc.duration : 30,
        videoUrl: sc?.videoUrl,
        videoType: sc?.videoType || 'procedural',
        mediaMode: sc?.mediaMode || 'video',
        slideImageUrl: sc?.slideImageUrl,
        slideTheme: sc?.slideTheme,
        presenterBubble: sc?.presenterBubble,
        learningObjective: sc?.learningObjective || `Objectif pédagogique de ${sc?.title || `Scène ${sIdx + 1}`}`,
        chapters: Array.isArray(sc?.chapters) ? sc.chapters : undefined,
        layers: Array.isArray(sc?.layers) ? sc.layers : [],
        branchingChoices: Array.isArray(sc?.branchingChoices)
          ? sc.branchingChoices.map((b: any, bIdx: number) => ({
              id: b?.id || `br-${sIdx}-${bIdx}`,
              label: b?.label || 'Continuer',
              targetSceneId: b?.targetSceneId || '',
              pedagogicalImpact: b?.pedagogicalImpact || 'Progression pédagogique.',
            }))
          : [],
        interactions: Array.isArray(sc?.interactions)
          ? sc.interactions.map((it: any, iIdx: number): InteractionItem => ({
              id: it?.id || `int-${sIdx}-${iIdx}`,
              type: it?.type || 'hotspot',
              title: it?.title || `Interaction ${iIdx + 1}`,
              timestamp: typeof it?.timestamp === 'number' ? it.timestamp : 5,
              duration: typeof it?.duration === 'number' ? it.duration : 8,
              pauseOnTrigger: Boolean(it?.pauseOnTrigger),
              xPercent: typeof it?.xPercent === 'number' ? it.xPercent : 50,
              yPercent: typeof it?.yPercent === 'number' ? it.yPercent : 50,
              widthPercent: typeof it?.widthPercent === 'number' ? it.widthPercent : 22,
              heightPercent: typeof it?.heightPercent === 'number' ? it.heightPercent : 20,
              currentState: it?.currentState || 'normal',
              styleVariant: it?.styleVariant || 'glass',
              content: it?.content ?? it?.description ?? '',
              description: it?.description,
              imageUrl: it?.imageUrl,
              audioUrl: it?.audioUrl,
              badgeName: it?.badgeName,
              quiz: it?.quiz
                ? {
                    ...it.quiz,
                    options: Array.isArray(it.quiz.options) ? it.quiz.options : [],
                    points: typeof it.quiz.points === 'number' ? it.quiz.points : 10,
                  }
                : undefined,
              object3dType: it?.object3dType,
              targetSceneId: it?.targetSceneId,
              actionOnClick: it?.actionOnClick,
              popupTitle: it?.popupTitle,
              popupText: it?.popupText,
              popupImageUrl: it?.popupImageUrl,
              popupAudioUrl: it?.popupAudioUrl,
              popupButtonText: it?.popupButtonText,
              popupButtonUrl: it?.popupButtonUrl,
              targetTime: it?.targetTime,
              targetUrl: it?.targetUrl,
              fontSize: it?.fontSize,
              textColor: it?.textColor,
              backgroundColor: it?.backgroundColor,
              opacity: it?.opacity,
              codeLanguage: it?.codeLanguage,
              codeSnippet: it?.codeSnippet,
              audioNarrationUrl: it?.audioNarrationUrl,
              likertScale: it?.likertScale,
              isLocked: it?.isLocked,
              zIndex: it?.zIndex,
              triggers: Array.isArray(it?.triggers) ? it.triggers : [],
              branchingChoices: Array.isArray(it?.branchingChoices) ? it.branchingChoices : undefined,
            }))
          : [],
        graphNodePosition: sc?.graphNodePosition || {
          x: 100 + (sIdx % 3) * 360,
          y: 120 + Math.floor(sIdx / 3) * 220,
        },
      }))
    : JSON.parse(JSON.stringify(defaultBase.scenes));

  const startSceneId =
    raw.startSceneId && scenes.some((s) => s.id === raw.startSceneId)
      ? raw.startSceneId
      : scenes[0].id;

  return {
    metadata: {
      id: raw.metadata?.id || `proj-${Date.now()}`,
      title: raw.metadata?.title || 'Projet Sans Titre',
      category: raw.metadata?.category || 'Custom',
      description: raw.metadata?.description || 'Module interactif OmniStudio.',
      author: raw.metadata?.author || 'Équipe Conception Pédagogique',
      version: raw.metadata?.version || '1.0.0',
      targetAudience: raw.metadata?.targetAudience || 'Professionnels & Apprenants',
      language: raw.metadata?.language || 'Français',
      createdDate: raw.metadata?.createdDate || new Date().toISOString().split('T')[0],
    },
    variables: raw.variables && typeof raw.variables === 'object' ? raw.variables : {},
    scenes,
    startSceneId,
    gamification: {
      score: raw.gamification?.score ?? 0,
      maxScore: raw.gamification?.maxScore ?? 100,
      level: raw.gamification?.level ?? 1,
      xp: raw.gamification?.xp ?? 0,
      badges: Array.isArray(raw.gamification?.badges) ? raw.gamification.badges : [],
      inventory: Array.isArray(raw.gamification?.inventory) ? raw.gamification.inventory : [],
    },
    scormSettings: {
      passingScorePercent: raw.scormSettings?.passingScorePercent ?? 75,
      allowRetake: raw.scormSettings?.allowRetake ?? true,
      scormVersion: raw.scormSettings?.scormVersion || '2004',
      reportAs: raw.scormSettings?.reportAs || 'Passed/Failed',
    },
  };
}

/**
 * Validates a project structurally and pedagogically (Section 32 & 34.1):
 * - Checks duplicate IDs
 * - Broken targetSceneId references
 * - Reachability (BFS from startSceneId)
 * - Cycle / infinite loop detection (DFS)
 * - Undefined variables in triggers
 * - Timeline overflows & quiz correctness
 */
export function validateProjectSchema(project: InteractiveProject): ValidationReport {
  const issues: ValidationIssue[] = [];
  const scenes = project.scenes || [];
  const variables = project.variables || {};
  const sceneIdSet = new Set<string>();
  const interactionIdSet = new Set<string>();

  // 1. Check duplicate Scene IDs
  scenes.forEach((sc) => {
    if (sceneIdSet.has(sc.id)) {
      issues.push({
        id: `dup-scene-${sc.id}`,
        code: 'DUPLICATE_ID',
        severity: 'error',
        sceneId: sc.id,
        message: `Identifiant de scène dupliqué détecté : "${sc.id}".`,
      });
    }
    sceneIdSet.add(sc.id);
  });

  // Adjacency map for graph traversal
  const adj = new Map<string, string[]>();
  scenes.forEach((sc) => adj.set(sc.id, []));

  // 2. Per-scene & interaction checks
  scenes.forEach((sc, sIdx) => {
    const branches = sc.branchingChoices || [];
    const interactions = sc.interactions || [];

    branches.forEach((b) => {
      if (!b.targetSceneId || !sceneIdSet.has(b.targetSceneId)) {
        issues.push({
          id: `broken-ref-${sc.id}-${b.id}`,
          code: 'BROKEN_SCENE_REF',
          severity: 'error',
          sceneId: sc.id,
          message: `Le choix "${b.label}" dans "${sc.title}" pointe vers une scène inexistante ("${b.targetSceneId}").`,
        });
      } else {
        adj.get(sc.id)?.push(b.targetSceneId);
      }
    });

    // Dead-end check (non-final scene with no outgoing branches or jump interactions)
    const hasInteractionJump = interactions.some(
      (it) =>
        Boolean(it.targetSceneId) ||
        it.actionOnClick === 'jump_to_scene' ||
        (it.triggers || []).some((t) => t.action === 'jump_to_scene')
    );
    if (branches.length === 0 && !hasInteractionJump && scenes.length > 1 && sIdx < scenes.length - 1) {
      issues.push({
        id: `deadend-${sc.id}`,
        code: 'DEAD_END_SCENE',
        severity: 'error',
        sceneId: sc.id,
        message: `Scène sans issue (Dead-End) : "${sc.title}" ne permet pas d'avancer vers la suite du parcours.`,
      });
    }

    // Accessibility check
    if (!sc.learningObjective || sc.learningObjective.trim().length < 5) {
      issues.push({
        id: `wcag-obj-${sc.id}`,
        code: 'WCAG_ACCESSIBILITY',
        severity: 'info',
        sceneId: sc.id,
        message: `Objectif pédagogique absent ou trop court sur la scène "${sc.title}".`,
      });
    }

    interactions.forEach((it) => {
      if (interactionIdSet.has(it.id)) {
        issues.push({
          id: `dup-int-${it.id}`,
          code: 'DUPLICATE_ID',
          severity: 'error',
          sceneId: sc.id,
          interactionId: it.id,
          message: `Identifiant d'interaction dupliqué : "${it.id}".`,
        });
      }
      interactionIdSet.add(it.id);

      if (it.targetSceneId) {
        if (!sceneIdSet.has(it.targetSceneId)) {
          issues.push({
            id: `broken-int-ref-${it.id}`,
            code: 'BROKEN_SCENE_REF',
            severity: 'error',
            sceneId: sc.id,
            interactionId: it.id,
            message: `L'interaction "${it.title}" pointe vers une scène cible inexistante ("${it.targetSceneId}").`,
          });
        } else {
          adj.get(sc.id)?.push(it.targetSceneId);
        }
      }

      if (it.timestamp >= sc.duration) {
        issues.push({
          id: `overflow-${it.id}`,
          code: 'TIMELINE_OVERFLOW',
          severity: 'error',
          sceneId: sc.id,
          interactionId: it.id,
          message: `L'interaction "${it.title}" (${it.timestamp}s) dépasse la durée de la scène "${sc.title}" (${sc.duration}s).`,
        });
      }

      if (it.type === 'quiz' && it.quiz) {
        const hasValidCorrect =
          (it.quiz.options && it.quiz.options.some((o) => o.isCorrect)) ||
          (it.quiz.correctSequence && it.quiz.correctSequence.length > 0) ||
          (it.quiz.dragItems && it.quiz.dragItems.length > 0) ||
          Boolean(it.quiz.hotspotTarget) ||
          (it.quiz.fillBlanksAnswers && it.quiz.fillBlanksAnswers.length > 0);

        if (!hasValidCorrect) {
          issues.push({
            id: `quiz-nocorrect-${it.id}`,
            code: 'INVALID_QUIZ',
            severity: 'error',
            sceneId: sc.id,
            interactionId: it.id,
            message: `Le quiz "${it.quiz.title}" n'a aucune réponse correcte configurée.`,
          });
        }
      }

      (it.triggers || []).forEach((trig) => {
        if (trig.conditionVariable && !variables[trig.conditionVariable]) {
          issues.push({
            id: `undef-var-${trig.id}`,
            code: 'UNDEFINED_VARIABLE',
            severity: 'warning',
            sceneId: sc.id,
            interactionId: it.id,
            message: `La règle "${trig.name}" référence une variable non déclarée : "${trig.conditionVariable}".`,
          });
        }
        if (trig.action === 'jump_to_scene' && trig.actionTarget) {
          if (!sceneIdSet.has(trig.actionTarget)) {
            issues.push({
              id: `broken-trig-scene-${trig.id}`,
              code: 'BROKEN_SCENE_REF',
              severity: 'error',
              sceneId: sc.id,
              interactionId: it.id,
              message: `La règle "${trig.name}" redirige vers une scène inexistante ("${trig.actionTarget}").`,
            });
          } else {
            adj.get(sc.id)?.push(trig.actionTarget);
          }
        }
      });
    });
  });

  // 3. Reachability (BFS from startSceneId)
  const reachable = new Set<string>();
  if (project.startSceneId && sceneIdSet.has(project.startSceneId)) {
    const queue = [project.startSceneId];
    reachable.add(project.startSceneId);
    while (queue.length > 0) {
      const curr = queue.shift()!;
      const neighbors = adj.get(curr) || [];
      for (const next of neighbors) {
        if (!reachable.has(next)) {
          reachable.add(next);
          queue.push(next);
        }
      }
    }
  }

  scenes.forEach((sc) => {
    if (!reachable.has(sc.id) && sc.id !== project.startSceneId) {
      issues.push({
        id: `orphan-${sc.id}`,
        code: 'ORPHAN_SCENE',
        severity: 'warning',
        sceneId: sc.id,
        message: `Scène orpheline inaccessible depuis le départ : "${sc.title}".`,
      });
    }
  });

  // 4. Cycle Detection (DFS)
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const detectedCycles: string[][] = [];

  function dfsCycle(nodeId: string, path: string[]) {
    visited.add(nodeId);
    recStack.add(nodeId);

    const neighbors = adj.get(nodeId) || [];
    for (const next of neighbors) {
      if (!visited.has(next)) {
        dfsCycle(next, [...path, next]);
      } else if (recStack.has(next)) {
        const cycleStartIdx = path.indexOf(next);
        const cyclePath = cycleStartIdx >= 0 ? [...path.slice(cycleStartIdx), next] : [...path, next];
        detectedCycles.push(cyclePath);
        issues.push({
          id: `cycle-${nodeId}-${next}`,
          code: 'CIRCULAR_LOOP',
          severity: 'warning',
          sceneId: nodeId,
          message: `Boucle de navigation détectée : ${cyclePath.join(' → ')}. Vérifiez qu'une condition de sortie existe.`,
        });
      }
    }
    recStack.delete(nodeId);
  }

  scenes.forEach((sc) => {
    if (!visited.has(sc.id)) {
      dfsCycle(sc.id, [sc.id]);
    }
  });

  const errorsCount = issues.filter((i) => i.severity === 'error').length;
  const warningsCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;

  return {
    valid: errorsCount === 0,
    schemaVersion: NATIVE_FORMAT_VERSION,
    errorsCount,
    warningsCount,
    infoCount,
    issues,
    reachableSceneIds: Array.from(reachable),
    detectedCycles,
  };
}

/**
 * Evaluates a single condition operator safely without eval() (Section 12.3 & 12.5)
 */
export function evaluateCondition(
  actualValue: any,
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | undefined,
  expectedValue: any
): boolean {
  if (!operator) return true;

  // Coerce numeric strings if comparing numbers
  const numActual = typeof actualValue === 'number' ? actualValue : Number(actualValue);
  const numExpected = typeof expectedValue === 'number' ? expectedValue : Number(expectedValue);
  const bothNumeric = !Number.isNaN(numActual) && !Number.isNaN(numExpected) && actualValue !== '' && expectedValue !== '';

  switch (operator) {
    case '==':
      if (typeof actualValue === 'boolean' || expectedValue === 'true' || expectedValue === 'false') {
        return String(actualValue).toLowerCase() === String(expectedValue).toLowerCase();
      }
      return bothNumeric ? numActual === numExpected : String(actualValue) === String(expectedValue);
    case '!=':
      if (typeof actualValue === 'boolean' || expectedValue === 'true' || expectedValue === 'false') {
        return String(actualValue).toLowerCase() !== String(expectedValue).toLowerCase();
      }
      return bothNumeric ? numActual !== numExpected : String(actualValue) !== String(expectedValue);
    case '>':
      return bothNumeric ? numActual > numExpected : String(actualValue) > String(expectedValue);
    case '<':
      return bothNumeric ? numActual < numExpected : String(actualValue) < String(expectedValue);
    case '>=':
      return bothNumeric ? numActual >= numExpected : String(actualValue) >= String(expectedValue);
    case '<=':
      return bothNumeric ? numActual <= numExpected : String(actualValue) <= String(expectedValue);
    default:
      return true;
  }
}

export interface RuleExecutionContext {
  variables: Record<string, VariableDefinition>;
  currentSceneId: string;
  currentTime: number;
  isPlaying: boolean;
  score: number;
  inventory: string[];
  activeLayers: string[];
}

export interface RuleExecutionResult {
  updatedVariables: Record<string, VariableDefinition>;
  targetSceneId?: string;
  targetTime?: number;
  shouldPause?: boolean;
  shouldResume?: boolean;
  addedInventory: string[];
  shownLayers: string[];
  hiddenLayers: string[];
  executedRules: string[];
  haltedByLoopGuard: boolean;
}

/**
 * Safely executes all matching triggers for a given event with loop protection (Section 12.4 & 12.5)
 */
export function executeTriggersForEvent(
  event: TriggerEvent,
  triggers: TriggerRule[],
  context: RuleExecutionContext
): RuleExecutionResult {
  const updatedVars: Record<string, VariableDefinition> = JSON.parse(JSON.stringify(context.variables || {}));
  let targetSceneId: string | undefined;
  let targetTime: number | undefined;
  let shouldPause: boolean | undefined;
  let shouldResume: boolean | undefined;
  const addedInventory: string[] = [];
  const shownLayers: string[] = [];
  const hiddenLayers: string[] = [];
  const executedRules: string[] = [];
  let steps = 0;
  let haltedByLoopGuard = false;

  const matchingTriggers = (triggers || []).filter((t) => t && t.event === event);

  for (const trig of matchingTriggers) {
    steps++;
    if (steps > MAX_RULE_EXECUTION_STEPS) {
      haltedByLoopGuard = true;
      break;
    }

    // Check condition if specified
    if (trig.conditionVariable) {
      const varDef = updatedVars[trig.conditionVariable];
      const currentVal = varDef ? varDef.currentValue : undefined;
      const condMet = evaluateCondition(currentVal, trig.conditionOperator || '==', trig.conditionValue);
      if (!condMet) continue;
    }

    executedRules.push(trig.name || trig.id);

    // Execute action
    switch (trig.action) {
      case 'set_variable': {
        const varName = trig.conditionVariable || trig.actionTarget;
        if (varName) {
          if (!updatedVars[varName]) {
            updatedVars[varName] = {
              name: varName,
              type: 'number',
              defaultValue: 0,
              currentValue: 0,
              description: 'Variable créée dynamiquement',
            };
          }
          if (typeof trig.variableDelta === 'number' && typeof updatedVars[varName].currentValue === 'number') {
            updatedVars[varName].currentValue += trig.variableDelta;
          } else if (trig.actionTarget !== undefined && trig.actionTarget !== varName) {
            updatedVars[varName].currentValue = trig.actionTarget;
          }
        }
        break;
      }
      case 'pause_video':
        shouldPause = true;
        shouldResume = false;
        break;
      case 'resume_video':
        shouldResume = true;
        shouldPause = false;
        break;
      case 'jump_to_scene':
        if (trig.actionTarget) {
          targetSceneId = trig.actionTarget;
        }
        break;
      case 'jump_to_time':
        if (trig.actionTarget && !Number.isNaN(Number(trig.actionTarget))) {
          targetTime = Number(trig.actionTarget);
        }
        break;
      case 'add_inventory':
        if (trig.actionTarget) {
          addedInventory.push(trig.actionTarget);
        }
        break;
      case 'show_layer':
        if (trig.actionTarget) {
          shownLayers.push(trig.actionTarget);
        }
        break;
      case 'hide_layer':
        if (trig.actionTarget) {
          hiddenLayers.push(trig.actionTarget);
        }
        break;
      default:
        break;
    }
  }

  return {
    updatedVariables: updatedVars,
    targetSceneId,
    targetTime,
    shouldPause,
    shouldResume,
    addedInventory,
    shownLayers,
    hiddenLayers,
    executedRules,
    haltedByLoopGuard,
  };
}

// ============================================================================
// LOCAL & SERVER-SYNCHRONIZED STORAGE ENGINE (Projects, Versions, Sessions)
// ============================================================================

const STORAGE_KEYS = {
  PROJECTS: 'omnistudio_projects_v2',
  ACTIVE_PROJECT_ID: 'omnistudio_active_project_id_v2',
  VERSIONS: 'omnistudio_project_versions_v2',
  ASSESSMENTS: 'omnistudio_learner_assessments_v2',
  AUDIT_LOGS: 'omnistudio_audit_logs_v2',
};

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export class ProjectRepository {
  private memoryProjects: Map<string, InteractiveProject> = new Map();
  private memoryVersions: ProjectVersionSnapshot[] = [];
  private memoryAssessments: LearnerAssessmentRecord[] = [];
  private memoryAuditLogs: AuditLogEntry[] = [];

  constructor() {
    this.seedDefaultsIfNeeded();
  }

  private seedDefaultsIfNeeded() {
    SAMPLE_PROJECTS.forEach((p) => {
      const normalized = normalizeProject(p);
      this.memoryProjects.set(normalized.metadata.id, normalized);
    });

    if (isBrowser()) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEYS.PROJECTS);
        if (raw) {
          const parsed = JSON.parse(raw) as InteractiveProject[];
          if (Array.isArray(parsed)) {
            parsed.forEach((p) => {
              const norm = normalizeProject(p);
              this.memoryProjects.set(norm.metadata.id, norm);
            });
          }
        } else {
          this.persistProjectsToLocal();
        }
      } catch (e) {
        console.warn('Could not read localStorage projects:', e);
      }
    }
  }

  private persistProjectsToLocal() {
    if (!isBrowser()) return;
    try {
      const all = Array.from(this.memoryProjects.values());
      window.localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(all));
    } catch (e) {
      console.warn('Failed to persist projects to localStorage:', e);
    }
  }

  public listProjects(): InteractiveProject[] {
    return Array.from(this.memoryProjects.values());
  }

  public getProject(id: string): InteractiveProject | undefined {
    const found = this.memoryProjects.get(id);
    return found ? normalizeProject(found) : undefined;
  }

  public getActiveProject(): InteractiveProject {
    if (isBrowser()) {
      const activeId = window.localStorage.getItem(STORAGE_KEYS.ACTIVE_PROJECT_ID);
      if (activeId && this.memoryProjects.has(activeId)) {
        return normalizeProject(this.memoryProjects.get(activeId)!);
      }
    }
    const first = Array.from(this.memoryProjects.values())[0] || SAMPLE_PROJECTS[0];
    return normalizeProject(first);
  }

  public setActiveProjectId(id: string) {
    if (isBrowser()) {
      try {
        window.localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT_ID, id);
      } catch (e) {
        // ignore
      }
    }
  }

  public saveProject(
    project: InteractiveProject,
    options?: { createSnapshot?: boolean; snapshotLabel?: string; actor?: string }
  ): InteractiveProject {
    const normalized = normalizeProject(project);
    this.memoryProjects.set(normalized.metadata.id, normalized);
    this.setActiveProjectId(normalized.metadata.id);
    this.persistProjectsToLocal();

    if (options?.createSnapshot) {
      this.createVersionSnapshot(
        normalized,
        options.snapshotLabel || `Sauvegarde v${normalized.metadata.version}`,
        options.actor || normalized.metadata.author
      );
    }

    // Async sync with backend API if running in browser
    if (isBrowser()) {
      fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: normalized }),
      }).catch(() => {
        // Offline tolerance
      });
    }

    return normalized;
  }

  public duplicateProject(projectId: string): InteractiveProject | null {
    const source = this.getProject(projectId);
    if (!source) return null;

    const cloned: InteractiveProject = JSON.parse(JSON.stringify(source));
    cloned.metadata.id = `proj-${Date.now()}`;
    cloned.metadata.title = `${source.metadata.title} (Copie)`;
    cloned.metadata.createdDate = new Date().toISOString().split('T')[0];
    cloned.metadata.version = '1.0.0';

    this.saveProject(cloned, {
      createSnapshot: true,
      snapshotLabel: `Duplication depuis ${source.metadata.title}`,
    });
    this.logAudit('DUPLICATE_PROJECT', `Projet dupliqué : "${cloned.metadata.title}"`, cloned.metadata.id);
    return cloned;
  }

  public deleteProject(projectId: string): boolean {
    if (this.memoryProjects.size <= 1) {
      return false; // Prevent deleting the very last project
    }
    const target = this.memoryProjects.get(projectId);
    const deleted = this.memoryProjects.delete(projectId);
    if (deleted) {
      this.persistProjectsToLocal();
      this.logAudit('DELETE_PROJECT', `Projet supprimé : "${target?.metadata.title || projectId}"`, projectId);
      if (isBrowser()) {
        fetch(`/api/projects/${encodeURIComponent(projectId)}`, { method: 'DELETE' }).catch(() => {});
      }
    }
    return deleted;
  }

  public createVersionSnapshot(
    project: InteractiveProject,
    label: string,
    author = 'Concepteur Studio'
  ): ProjectVersionSnapshot {
    const snapshots = this.getProjectVersions(project.metadata.id);
    const nextPatch = snapshots.length + 1;
    const versionNumber = `1.${nextPatch}.0`;

    const snapshot: ProjectVersionSnapshot = {
      versionId: `ver-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      projectId: project.metadata.id,
      versionNumber,
      label,
      author,
      createdAt: new Date().toISOString(),
      projectData: JSON.parse(JSON.stringify(project)),
    };

    const allVersions = this.loadAllVersions();
    allVersions.unshift(snapshot);
    this.saveAllVersions(allVersions.slice(0, 50)); // Keep up to 50 versions
    this.logAudit('CREATE_VERSION', `Version ${versionNumber} créée (${label})`, project.metadata.id);
    return snapshot;
  }

  public getProjectVersions(projectId: string): ProjectVersionSnapshot[] {
    return this.loadAllVersions().filter((v) => v.projectId === projectId);
  }

  public restoreVersionSnapshot(projectId: string, versionId: string): InteractiveProject | null {
    const found = this.loadAllVersions().find(
      (v) => v.projectId === projectId && v.versionId === versionId
    );
    if (!found) return null;

    const restored = normalizeProject(found.projectData);
    restored.metadata.version = found.versionNumber;
    this.saveProject(restored);
    this.logAudit('RESTORE_VERSION', `Restauration de la version ${found.versionNumber}`, projectId);
    return restored;
  }

  private loadAllVersions(): ProjectVersionSnapshot[] {
    if (isBrowser()) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEYS.VERSIONS);
        if (raw) {
          this.memoryVersions = JSON.parse(raw);
        }
      } catch (e) {
        // ignore
      }
    }
    return this.memoryVersions;
  }

  private saveAllVersions(versions: ProjectVersionSnapshot[]) {
    this.memoryVersions = versions;
    if (isBrowser()) {
      try {
        window.localStorage.setItem(STORAGE_KEYS.VERSIONS, JSON.stringify(versions));
      } catch (e) {
        // ignore
      }
    }
  }

  public recordAssessment(
    record: Omit<LearnerAssessmentRecord, 'recordId' | 'completedAt' | 'certificateId'>
  ): LearnerAssessmentRecord {
    const fullRecord: LearnerAssessmentRecord = {
      ...record,
      recordId: `assess-${Date.now()}`,
      completedAt: new Date().toISOString(),
      certificateId: record.passed
        ? `CERT-OMNI-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
        : undefined,
    };

    const all = this.getAssessments();
    all.unshift(fullRecord);
    this.memoryAssessments = all;

    if (isBrowser()) {
      try {
        window.localStorage.setItem(STORAGE_KEYS.ASSESSMENTS, JSON.stringify(all.slice(0, 200)));
        fetch('/api/assessments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fullRecord),
        }).catch(() => {});
      } catch (e) {
        // ignore
      }
    }

    this.logAudit(
      'LEARNER_ASSESSMENT',
      `Session terminée par ${record.learnerName} : ${record.percentage}% (${record.passed ? 'Réussi' : 'Échoué'})`,
      record.projectId
    );

    return fullRecord;
  }

  public getAssessments(projectId?: string): LearnerAssessmentRecord[] {
    if (isBrowser()) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEYS.ASSESSMENTS);
        if (raw) {
          this.memoryAssessments = JSON.parse(raw);
        }
      } catch (e) {
        // ignore
      }
    }
    if (projectId) {
      return this.memoryAssessments.filter((a) => a.projectId === projectId);
    }
    return this.memoryAssessments;
  }

  public logAudit(action: string, details: string, projectId?: string, actor = 'Dr. Jean-paul (Admin)') {
    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      actor,
      role: 'Administrateur / Concepteur',
      action,
      projectId,
      details,
    };

    const logs = this.getAuditLogs();
    logs.unshift(entry);
    this.memoryAuditLogs = logs.slice(0, 150);

    if (isBrowser()) {
      try {
        window.localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(this.memoryAuditLogs));
      } catch (e) {
        // ignore
      }
    }
  }

  public getAuditLogs(): AuditLogEntry[] {
    if (isBrowser()) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
        if (raw) {
          this.memoryAuditLogs = JSON.parse(raw);
        }
      } catch (e) {
        // ignore
      }
    }
    return this.memoryAuditLogs;
  }
}

export const projectRepository = new ProjectRepository();
