/**
 * OmniStudio - Automated Unit, Integration & E2E Acceptance Test Suite
 * (Sections 34 & 39 of Master Specification)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeProject,
  validateProjectSchema,
  evaluateCondition,
  executeTriggersForEvent,
  ProjectRepository,
  MAX_RULE_EXECUTION_STEPS,
} from '../src/services/projectEngine';
import {
  generateScorm12Manifest,
  generateScorm2004Manifest,
  generateStandaloneHtml,
  generateWordTranscript,
} from '../src/services/exportService';
import type { InteractiveProject, TriggerRule } from '../src/types';

test('1. Schema Normalization: Safely fills missing arrays (triggers, branchingChoices, interactions)', () => {
  const partialRaw = {
    metadata: { id: 'p-test', title: 'Projet Partiel' },
    scenes: [
      {
        id: 'sc-1',
        title: 'Scène Incomplète',
        duration: 25,
        // branchingChoices and interactions omitted intentionally
      },
    ],
  };

  const normalized = normalizeProject(partialRaw);
  assert.equal(normalized.metadata.id, 'p-test');
  assert.equal(normalized.scenes.length, 1);
  assert.ok(Array.isArray(normalized.scenes[0].branchingChoices));
  assert.ok(Array.isArray(normalized.scenes[0].interactions));
  assert.equal(normalized.startSceneId, 'sc-1');
});

test('2. Structural & Pedagogical Validation Engine: Detects orphans, dead-ends, broken refs, and cycles', () => {
  const brokenProject = normalizeProject({
    metadata: { id: 'proj-val', title: 'Test Validation' },
    startSceneId: 's1',
    variables: { score_requis: { name: 'score_requis', type: 'number', defaultValue: 10, currentValue: 10, description: 'Score' } },
    scenes: [
      {
        id: 's1',
        title: 'Scène 1 (Départ)',
        duration: 20,
        learningObjective: 'Objectif valide de départ',
        interactions: [
          {
            id: 'int-overflow',
            type: 'hotspot',
            title: 'Hotspot Hors Temps',
            timestamp: 25, // >= duration (20) -> TIMELINE_OVERFLOW
            duration: 5,
            triggers: [
              {
                id: 't1',
                name: 'Règle Variable Inconnue',
                event: 'on_click',
                conditionVariable: 'var_inexistante', // -> UNDEFINED_VARIABLE
                action: 'pause_video',
              },
            ],
          },
        ],
        branchingChoices: [
          { id: 'b1', label: 'Vers S2', targetSceneId: 's2', pedagogicalImpact: 'OK' },
          { id: 'b-broken', label: 'Vers Fantôme', targetSceneId: 's999', pedagogicalImpact: 'Broken' },
        ],
      },
      {
        id: 's2',
        title: 'Scène 2 (Boucle vers S1)',
        duration: 30,
        learningObjective: 'Objectif valide S2',
        interactions: [],
        branchingChoices: [
          { id: 'b2', label: 'Retour S1', targetSceneId: 's1', pedagogicalImpact: 'Cycle S1 -> S2 -> S1' },
        ],
      },
      {
        id: 's3-orphan',
        title: 'Scène 3 Orpheline',
        duration: 30,
        learningObjective: 'Objectif valide S3',
        interactions: [],
        branchingChoices: [],
      },
    ],
  });

  const report = validateProjectSchema(brokenProject);
  assert.equal(report.valid, false, 'Project with broken references and overflow must be invalid');

  const codes = report.issues.map((i) => i.code);
  assert.ok(codes.includes('TIMELINE_OVERFLOW'), 'Should detect timeline overflow');
  assert.ok(codes.includes('BROKEN_SCENE_REF'), 'Should detect broken scene reference s999');
  assert.ok(codes.includes('UNDEFINED_VARIABLE'), 'Should detect undefined variable var_inexistante');
  assert.ok(codes.includes('ORPHAN_SCENE'), 'Should detect orphan scene s3-orphan');
  assert.ok(codes.includes('CIRCULAR_LOOP'), 'Should detect cycle s1 -> s2 -> s1');
  assert.ok(report.detectedCycles.length >= 1, 'Should record cycle path');
});

test('3. Rule & Condition Evaluator: Evaluates operators and executes actions with loop guard', () => {
  assert.equal(evaluateCondition(80, '>=', 75), true);
  assert.equal(evaluateCondition(50, '>=', 75), false);
  assert.equal(evaluateCondition('admin', '==', 'admin'), true);
  assert.equal(evaluateCondition(true, '!=', false), true);
  assert.equal(evaluateCondition(10, '<', 20), true);

  // Execute triggers
  const triggers: TriggerRule[] = [
    {
      id: 'tr-1',
      name: 'Ajouter 15 points si protocole_ok == true',
      event: 'on_quiz_correct',
      conditionVariable: 'protocole_ok',
      conditionOperator: '==',
      conditionValue: true,
      action: 'set_variable',
      variableDelta: 0,
    },
    {
      id: 'tr-2',
      name: 'Incrémenter compteur',
      event: 'on_quiz_correct',
      conditionVariable: 'compteur',
      conditionOperator: '>=',
      conditionValue: 0,
      action: 'set_variable',
      variableDelta: 15,
    },
    {
      id: 'tr-3',
      name: 'Aller à la scène 2',
      event: 'on_quiz_correct',
      action: 'jump_to_scene',
      actionTarget: 'scene-2',
    },
  ];

  const res = executeTriggersForEvent('on_quiz_correct', triggers, {
    variables: {
      protocole_ok: { name: 'protocole_ok', type: 'boolean', defaultValue: true, currentValue: true, description: '' },
      compteur: { name: 'compteur', type: 'number', defaultValue: 10, currentValue: 10, description: '' },
    },
    currentSceneId: 'scene-1',
    currentTime: 12,
    isPlaying: true,
    score: 20,
    inventory: [],
    activeLayers: [],
  });

  assert.equal(res.updatedVariables.compteur.currentValue, 25);
  assert.equal(res.targetSceneId, 'scene-2');
  assert.equal(res.haltedByLoopGuard, false);

  // Test infinite loop / excessive rules protection (> MAX_RULE_EXECUTION_STEPS)
  const excessiveTriggers: TriggerRule[] = Array.from({ length: MAX_RULE_EXECUTION_STEPS + 10 }).map((_, i) => ({
    id: `spam-${i}`,
    name: `Rule ${i}`,
    event: 'on_click',
    action: 'pause_video',
  }));

  const loopRes = executeTriggersForEvent('on_click', excessiveTriggers, {
    variables: {},
    currentSceneId: 'scene-1',
    currentTime: 0,
    isPlaying: true,
    score: 0,
    inventory: [],
    activeLayers: [],
  });

  assert.equal(loopRes.haltedByLoopGuard, true, 'Loop guard must halt excessive trigger chains');
  assert.equal(loopRes.executedRules.length, MAX_RULE_EXECUTION_STEPS);
});

test('4. Standards & Interoperability Exports: SCORM 1.2, SCORM 2004, Standalone HTML5, Word Transcript', () => {
  const repo = new ProjectRepository();
  const sample = repo.getActiveProject();

  const scorm12 = generateScorm12Manifest(sample);
  assert.ok(scorm12.includes('<schemaversion>1.2</schemaversion>'));
  assert.ok(scorm12.includes('adlcp:masteryscore'));

  const scorm2004 = generateScorm2004Manifest(sample);
  assert.ok(scorm2004.includes('<schemaversion>2004 4th Edition</schemaversion>'));
  assert.ok(scorm2004.includes('imsss:sequencing'));

  const html5 = generateStandaloneHtml(sample);
  assert.ok(html5.includes('<!DOCTYPE html>'));
  assert.ok(html5.includes(sample.metadata.title));

  const wordDoc = generateWordTranscript(sample);
  assert.ok(wordDoc.includes('Variables Pédagogiques Globales'));
  assert.ok(wordDoc.includes(sample.scenes[0].title));
});

test('5. End-to-End 20-Step Acceptance Journey (Section 39 - Premier Produit Exploitable)', () => {
  const repo = new ProjectRepository();

  // Steps 1-4: Create a new project with 2 scenes and an imported video URL
  const customProject: InteractiveProject = normalizeProject({
    metadata: {
      id: 'e2e-cyber-2026',
      title: 'Formation Certifiante Réponse à Incident',
      category: 'Cybersecurity',
      description: 'Parcours complet testé de bout en bout.',
      author: 'Architecte Pédagogique',
      version: '1.0.0',
      targetAudience: 'Analystes SOC',
      language: 'Français',
      createdDate: '2026-10-23',
    },
    startSceneId: 'sc-intro',
    variables: {
      niveau_alerte: {
        name: 'niveau_alerte',
        type: 'number',
        defaultValue: 1,
        currentValue: 1,
        description: 'Niveau d’alerte SOC',
      },
    },
    scenes: [
      {
        id: 'sc-intro',
        title: 'Détection du Phishing Critique',
        description: 'Analyse de la pièce jointe suspecte.',
        duration: 45,
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        videoType: 'standard',
        learningObjective: 'Identifier un vecteur d’attaque par hameçonnage ciblé.',
        // Steps 5-10: Add button, timed interaction, quiz with correct answer, feedback, and navigation rule
        interactions: [
          {
            id: 'int-btn-1',
            type: 'button',
            title: 'Consulter les en-têtes SMTP',
            content: 'Inspecter SPF/DKIM',
            timestamp: 6,
            duration: 10,
            pauseOnTrigger: false,
            xPercent: 25,
            yPercent: 30,
            widthPercent: 20,
            heightPercent: 12,
            styleVariant: 'glass',
            triggers: [],
          },
          {
            id: 'int-quiz-1',
            type: 'quiz',
            title: 'Décision de confinement',
            timestamp: 20,
            duration: 15,
            pauseOnTrigger: true,
            xPercent: 50,
            yPercent: 50,
            widthPercent: 60,
            heightPercent: 60,
            styleVariant: 'glass',
            quiz: {
              type: 'multiple_choice',
              title: 'Quelle action immédiate devez-vous exécuter ?',
              explanation: 'Isoler le poste du réseau empêche la propagation latérale.',
              points: 85,
              isMultipleChoice: false,
              options: [
                { id: 'opt-a', text: 'Isoler immédiatement la machine du réseau VLAN', isCorrect: true, feedback: 'Bravo, confinement réussi !' },
                { id: 'opt-b', text: 'Éteindre le serveur DNS principal', isCorrect: false, feedback: 'Disproportionné.' },
              ],
            },
            triggers: [
              {
                id: 'rule-nav-conclusion',
                name: 'Passer au débriefing si réponse correcte',
                event: 'on_quiz_correct',
                conditionVariable: 'niveau_alerte',
                conditionOperator: '>=',
                conditionValue: 1,
                action: 'jump_to_scene',
                actionTarget: 'sc-conclusion',
              },
            ],
          },
        ],
        branchingChoices: [
          {
            id: 'br-to-end',
            label: 'Aller au bilan final',
            targetSceneId: 'sc-conclusion',
            pedagogicalImpact: 'Validation du parcours.',
          },
        ],
      },
      {
        id: 'sc-conclusion',
        title: 'Synthèse & Certification SOC',
        description: 'Conclusion du scénario.',
        duration: 20,
        videoType: 'procedural',
        learningObjective: 'Valider le protocole complet de réponse à incident.',
        interactions: [],
        branchingChoices: [],
      },
    ],
    scormSettings: {
      passingScorePercent: 75,
      allowRetake: true,
      scormVersion: '2004',
      reportAs: 'Passed/Failed',
    },
  });

  // Step 11: Validate project structure before saving
  const validation = validateProjectSchema(customProject);
  assert.equal(validation.valid, true, `Expected valid project, got issues: ${JSON.stringify(validation.issues)}`);

  // Steps 12-14: Save project with version snapshot, then reload and verify zero data loss
  repo.saveProject(customProject, {
    createSnapshot: true,
    snapshotLabel: 'Version initiale prête pour publication',
    actor: 'Architecte Pédagogique',
  });

  const reloaded = repo.getProject('e2e-cyber-2026');
  assert.ok(reloaded, 'Saved project must be retrievable');
  assert.equal(reloaded.metadata.title, 'Formation Certifiante Réponse à Incident');
  assert.equal(reloaded.scenes.length, 2);
  assert.equal(reloaded.scenes[0].interactions.length, 2);
  assert.equal(reloaded.scenes[0].interactions[1].quiz?.points, 85);

  const versions = repo.getProjectVersions('e2e-cyber-2026');
  assert.equal(versions.length, 1);
  assert.equal(versions[0].versionNumber, '1.1.0');

  // Step 16-18: Learner opens content, answers the quiz correctly, and engine applies rule
  const quizInteraction = reloaded.scenes[0].interactions[1];
  const ruleOutcome = executeTriggersForEvent('on_quiz_correct', quizInteraction.triggers, {
    variables: reloaded.variables,
    currentSceneId: 'sc-intro',
    currentTime: 20,
    isPlaying: false,
    score: 85,
    inventory: [],
    activeLayers: [],
  });
  assert.equal(ruleOutcome.targetSceneId, 'sc-conclusion', 'Rule must navigate learner to sc-conclusion');

  // Steps 19-20: Record learner assessment result & verify certificate and creator analytics
  const assessment = repo.recordAssessment({
    projectId: reloaded.metadata.id,
    projectTitle: reloaded.metadata.title,
    learnerName: 'Camille Tremblay',
    score: 85,
    maxScore: 100,
    percentage: 85,
    passed: true,
    timeSpentSeconds: 42,
    visitedScenes: ['sc-intro', 'sc-conclusion'],
    answersGiven: [
      {
        interactionId: quizInteraction.id,
        questionTitle: quizInteraction.quiz!.title,
        correct: true,
        pointsEarned: 85,
      },
    ],
  });

  assert.equal(assessment.passed, true);
  assert.ok(assessment.certificateId?.startsWith('CERT-OMNI-'), 'Passed assessment must generate verifiable certificate ID');

  const creatorResults = repo.getAssessments('e2e-cyber-2026');
  assert.equal(creatorResults.length, 1);
  assert.equal(creatorResults[0].learnerName, 'Camille Tremblay');
  assert.equal(creatorResults[0].percentage, 85);
});

test('6. Regression Guard: UI Components have defensive array fallbacks and unique React list keys', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');

  const linterCode = fs.readFileSync(
    path.resolve('src/components/studio/QualityLinterModal.tsx'),
    'utf-8'
  );
  assert.ok(
    linterCode.includes('(it.triggers || []).forEach'),
    'QualityLinterModal must guard it.triggers with fallback array'
  );
  assert.ok(
    linterCode.includes('const scenes = project.scenes || []'),
    'QualityLinterModal must guard project.scenes with fallback array'
  );

  const timelineCode = fs.readFileSync(
    path.resolve('src/components/studio/TimelineMultiTrack.tsx'),
    'utf-8'
  );
  assert.ok(
    timelineCode.includes('key={`track-overlay-${item.id || idx}-${idx}`}'),
    'TimelineMultiTrack must use unique compound keys for overlay items'
  );
  assert.ok(
    timelineCode.includes('key={`track-quiz-${item.id || idx}-${idx}`}'),
    'TimelineMultiTrack must use unique compound keys for quiz items'
  );
  assert.ok(
    timelineCode.includes('key={`track-adv-${item.id || idx}-${idx}`}'),
    'TimelineMultiTrack must use unique compound keys for advanced items'
  );
});

