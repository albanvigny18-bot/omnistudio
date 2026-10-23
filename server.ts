import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '25mb' }));

// Initialize GoogleGenAI server-side with telemetry header
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI:', err);
  }
}

// 1. AI Storyboard Generator Endpoint
app.post('/api/gemini/storyboard', async (req, res) => {
  const { topic, audience, durationMinutes, tone, language } = req.body;
  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  if (ai) {
    try {
      const prompt = `Act as an elite interactive learning designer & video director (combining the best of H5P, Articulate Storyline 360, Adobe Captivate, and Eko Studio).
Generate a rich, multi-scene interactive video storyboard for:
Topic: "${topic}"
Target Audience: "${audience || 'Professionals & Students'}"
Target Duration: "${durationMinutes || 3} minutes"
Pedagogical Tone: "${tone || 'Cinematographic, interactive, engaging'}"
Target Language: "${language || 'Français'}"

Return a valid JSON array of scenes conforming to:
[
  {
    "id": "scene-1",
    "title": "Title of the scene",
    "description": "Visual and narrative summary of what happens in the video",
    "duration": 45,
    "videoPrompt": "Cinematic visual description for AI generation or video asset",
    "learningObjective": "Core concept taught in this scene",
    "interactions": [
      {
        "type": "hotspot" | "quiz" | "branching" | "info_card" | "object_3d",
        "timestamp": 12,
        "pauseOnTrigger": true,
        "title": "Short title",
        "description": "Details or question to display",
        "actionPayload": {}
      }
    ],
    "branchingChoices": [
      {
        "label": "Choice label",
        "targetSceneId": "scene-2",
        "pedagogicalImpact": "Explanation of consequences"
      }
    ]
  }
]`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '[]';
      const scenes = JSON.parse(text);
      return res.json({ success: true, scenes });
    } catch (err: any) {
      console.error('Gemini Storyboard Generation Error:', err);
    }
  }

  // Fallback intelligent pedagogical storyboard template
  const fallbackScenes = [
    {
      id: 'scene-1',
      title: `Introduction & Mise en situation : ${topic}`,
      description: `Immersion contextuelle et présentation des enjeux critiques liés à ${topic}. Première prise de repères visuels.`,
      duration: 35,
      videoPrompt: `Cinematic high definition sequence illustrating ${topic} in a state-of-the-art environment.`,
      learningObjective: `Identifier les défis fondamentaux de ${topic}.`,
      interactions: [
        {
          type: 'info_card',
          timestamp: 8,
          pauseOnTrigger: false,
          title: 'Notion Clé',
          description: `Découvrez les 3 composantes fondamentales de ${topic}.`,
          actionPayload: { badge: 'Notion 1' }
        },
        {
          type: 'hotspot',
          timestamp: 20,
          pauseOnTrigger: true,
          title: 'Zone d\'analyse critique',
          description: 'Cliquez sur l\'élément central pour révéler le diagnostic détaillé.',
          actionPayload: { x: 50, y: 45 }
        }
      ],
      branchingChoices: [
        {
          label: 'Option A : Approche Analytique & Protocole Rigoureux',
          targetSceneId: 'scene-2a',
          pedagogicalImpact: 'Développe la maîtrise des procédures standard et la rigueur d\'exécution.'
        },
        {
          label: 'Option B : Décision Rapide sous Pression Opérationnelle',
          targetSceneId: 'scene-2b',
          pedagogicalImpact: 'Met à l\'épreuve la gestion du stress et l\'anticipation des risques.'
        }
      ]
    },
    {
      id: 'scene-2a',
      title: `Approfondissement Technique & Simulation 3D`,
      description: `Exploration détaillée des mécanismes sous-jacents avec manipulation 3D interactive et évaluation formative.`,
      duration: 40,
      videoPrompt: `Detailed procedural inspection with augmented reality overlays and metrics.`,
      learningObjective: `Analyser les causes racines et manipuler les composants critiques.`,
      interactions: [
        {
          type: 'object_3d',
          timestamp: 15,
          pauseOnTrigger: true,
          title: 'Inspection 3D Interactive',
          description: 'Faites pivoter et zoomez sur le modèle 3D pour identifier l\'anomalie.',
          actionPayload: { modelType: 'engine' }
        },
        {
          type: 'quiz',
          timestamp: 30,
          pauseOnTrigger: true,
          title: 'Quiz de validation intermédiaire',
          description: 'Validez votre compréhension avant de poursuivre le scénario.',
          actionPayload: { questionType: 'multiple_choice' }
        }
      ],
      branchingChoices: [
        {
          label: 'Conclure la mission et passer au débriefing',
          targetSceneId: 'scene-3',
          pedagogicalImpact: 'Validation des acquis et calcul du score global SCORM.'
        }
      ]
    },
    {
      id: 'scene-2b',
      title: `Gestion de Crise & Résolution Imprévue`,
      description: `Face aux conséquences de la décision rapide, ajustement en direct et évaluation des impacts collatéraux.`,
      duration: 40,
      videoPrompt: `Dynamic alert sequence with urgent visual feedback and adaptive timeline.`,
      learningObjective: `Développer la résilience et adapter sa stratégie en temps réel.`,
      interactions: [
        {
          type: 'quiz',
          timestamp: 18,
          pauseOnTrigger: true,
          title: 'Décision Chronométrée',
          description: 'Quel contre-protocole appliquer en urgence ?',
          actionPayload: { questionType: 'multiple_choice' }
        }
      ],
      branchingChoices: [
        {
          label: 'Aller au débriefing global',
          targetSceneId: 'scene-3',
          pedagogicalImpact: 'Synthèse des leçons apprises et analyse des variables d\'état.'
        }
      ]
    },
    {
      id: 'scene-3',
      title: `Synthèse Pédagogique & Certification finale`,
      description: `Bilan personnalisé des scores, feedback adaptatif IA et délivrance du certificat d\'achèvement.`,
      duration: 25,
      videoPrompt: `Inspiring conclusion sequence with badges and competency mastery matrix.`,
      learningObjective: `Consolider les compétences et valider la certification e-learning.`,
      interactions: [
        {
          type: 'info_card',
          timestamp: 5,
          pauseOnTrigger: false,
          title: 'Félicitations !',
          description: 'Vous avez complété le parcours avec succès.',
          actionPayload: { badge: 'Expert Certifié' }
        }
      ],
      branchingChoices: []
    }
  ];

  return res.json({ success: true, scenes: fallbackScenes, isFallback: true });
});

// 1.1 AI Document-to-Course Transformer (Section 9.2)
app.post('/api/gemini/document-to-course', async (req, res) => {
  const { documentText, title } = req.body;
  if (!documentText) {
    return res.status(400).json({ error: 'documentText is required' });
  }

  if (ai) {
    try {
      const prompt = `You are a world-class instructional designer (surpassing Captivate, H5P, Storyline).
Transform the following course document, technical procedure or training text into a structured, multi-scene interactive e-learning course.
Title: "${title || 'Formation Interactive Documentée'}"
Document Content:
"""
${documentText.slice(0, 10000)}
"""

Deconstruct the content into 3 to 4 sequential pedagogical scenes. Each scene must contain:
1. "id": unique scene id
2. "title": catchy, educational title
3. "description": concise narrative summary of the concept
4. "duration": 30 to 45
5. "mediaMode": "slide" or "video"
6. "learningObjective": clear behavioral objective
7. "interactions": array of 2 interactive elements per scene:
   - at least one "info_card" or "hotspot" (with timestamp around 5-10s)
   - at least one "quiz" (with timestamp around 20-25s, question title, explanation, points, and 3 options with exactly one or two correct answers)
8. "branchingChoices": choice leading forward to the next scene.

Return pure JSON conforming to:
[
  {
    "id": "scene-doc-1",
    "title": "Titre",
    "description": "Description",
    "duration": 35,
    "mediaMode": "slide",
    "learningObjective": "Objectif pédagogique mesurable",
    "interactions": [
      {
        "id": "int-1",
        "type": "info_card",
        "title": "Point Clé",
        "timestamp": 6,
        "duration": 10,
        "pauseOnTrigger": false,
        "xPercent": 70,
        "yPercent": 25,
        "widthPercent": 28,
        "heightPercent": 25,
        "styleVariant": "glass",
        "content": "Résumé tiré du document",
        "triggers": []
      },
      {
        "id": "int-2",
        "type": "quiz",
        "title": "Évaluation formative",
        "timestamp": 22,
        "duration": 15,
        "pauseOnTrigger": true,
        "xPercent": 50,
        "yPercent": 50,
        "widthPercent": 60,
        "heightPercent": 60,
        "styleVariant": "glass",
        "quiz": {
          "type": "multiple_choice",
          "title": "Question de contrôle sur le document",
          "explanation": "Explication pédagogique",
          "points": 20,
          "isMultipleChoice": false,
          "options": [
            { "id": "opt-1", "text": "Bonne réponse conforme au document", "isCorrect": true },
            { "id": "opt-2", "text": "Distracteur erroné", "isCorrect": false },
            { "id": "opt-3", "text": "Autre option fausse", "isCorrect": false }
          ]
        },
        "triggers": []
      }
    ],
    "branchingChoices": [
      {
        "id": "br-1",
        "label": "Passer à l'étape suivante",
        "targetSceneId": "scene-doc-2",
        "pedagogicalImpact": "Progression validée"
      }
    ]
  }
]`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '[]';
      const scenes = JSON.parse(text);
      return res.json({ success: true, scenes });
    } catch (err: any) {
      console.error('Gemini Document-to-Course Error:', err);
    }
  }

  // Fallback parsing if offline or API key absent
  const paragraphs = documentText
    .split(/\n\s*\n/)
    .map((p: string) => p.trim())
    .filter((p: string) => p.length > 20);

  const fallbackScenes = (paragraphs.length > 0 ? paragraphs.slice(0, 3) : [documentText]).map(
    (para: string, idx: number) => {
      const words = para.split(' ');
      const secTitle = words.slice(0, 5).join(' ') || `Section ${idx + 1}`;
      return {
        id: `scene-doc-${Date.now()}-${idx}`,
        title: `Étape ${idx + 1} : ${secTitle}`,
        description: para.slice(0, 200),
        duration: 35,
        mediaMode: idx % 2 === 0 ? 'slide' : 'video',
        learningObjective: `Assimiler et appliquer les notions clés de "${secTitle}".`,
        interactions: [
          {
            id: `int-doc-info-${idx}`,
            type: 'info_card',
            title: `Extrait Clé - Étape ${idx + 1}`,
            timestamp: 5,
            duration: 10,
            pauseOnTrigger: false,
            xPercent: 70,
            yPercent: 25,
            widthPercent: 28,
            heightPercent: 25,
            styleVariant: 'glass',
            content: para.slice(0, 160) + '...',
            triggers: [],
          },
          {
            id: `int-doc-quiz-${idx}`,
            type: 'quiz',
            title: `Point de Contrôle ${idx + 1}`,
            timestamp: 22,
            duration: 14,
            pauseOnTrigger: true,
            xPercent: 50,
            yPercent: 50,
            widthPercent: 60,
            heightPercent: 60,
            styleVariant: 'glass',
            quiz: {
              type: 'multiple_choice',
              title: `D'après la documentation : quel est le principe fondamental de "${secTitle}" ?`,
              explanation: `Directive établie d'après le texte fourni en section ${idx + 1}.`,
              points: 20,
              isMultipleChoice: false,
              options: [
                { id: `opt-1-${idx}`, text: `Respecter la directive : ${words.slice(0, 4).join(' ')}`, isCorrect: true },
                { id: `opt-2-${idx}`, text: 'Dépasser les seuils sans contrôle préalable', isCorrect: false },
                { id: `opt-3-${idx}`, text: 'Contourner le protocole sans archivage', isCorrect: false },
              ],
            },
            triggers: [],
          },
        ],
        layers: [],
        branchingChoices: [
          {
            id: `branch-doc-${idx}`,
            label: idx < 2 ? 'Continuer vers l\'étape suivante' : 'Conclure la formation',
            targetSceneId: `scene-doc-next-${idx}`,
            pedagogicalImpact: 'Validation des compétences du document.',
          },
        ],
      };
    }
  );

  return res.json({ success: true, scenes: fallbackScenes, isFallback: true });
});

// 2. AI Video Interaction Scanner
app.post('/api/gemini/scan-interactions', async (req, res) => {
  const { sceneTitle, sceneDescription, sceneDuration, targetDensity } = req.body;

  if (ai) {
    try {
      const prompt = `You are an instructional engineering AI. Analyze the following video scene and suggest optimal interactive touchpoints (hotspots, popups, quiz checks, Storyline-like triggers, 3D overlays):
Scene Title: "${sceneTitle || 'Simulation'}"
Scene Context: "${sceneDescription || 'Educational video'}"
Duration: ${sceneDuration || 60} seconds
Interaction Density: "${targetDensity || 'balanced'}"

Return a JSON array of interactive overlay elements:
[
  {
    "type": "hotspot" | "quiz" | "info_card" | "branching" | "object_3d",
    "timestamp": number (between 2 and ${sceneDuration - 5}),
    "duration": number (e.g. 5 to 15),
    "pauseOnTrigger": boolean,
    "title": string,
    "description": string,
    "xPercent": number (5 to 90),
    "yPercent": number (10 to 80),
    "triggerCondition": string,
    "variableUpdates": { "score": 10 }
  }
]`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '[]';
      const items = JSON.parse(text);
      return res.json({ success: true, interactions: items });
    } catch (err: any) {
      console.error('Gemini Scan Interactions Error:', err);
    }
  }

  // Fallback interaction points
  const duration = sceneDuration || 45;
  const fallbackInteractions = [
    {
      type: 'info_card',
      timestamp: Math.round(duration * 0.15),
      duration: 8,
      pauseOnTrigger: false,
      title: 'Point d\'attention visuel',
      description: 'Remarquez le paramètre critique mis en évidence sur l\'écran.',
      xPercent: 70,
      yPercent: 20,
      triggerCondition: 'toujours',
      variableUpdates: { explored_points: 1 }
    },
    {
      type: 'hotspot',
      timestamp: Math.round(duration * 0.45),
      duration: 12,
      pauseOnTrigger: true,
      title: 'Zone d\'action directe',
      description: 'Cliquez pour analyser l\'état du système en temps réel.',
      xPercent: 50,
      yPercent: 50,
      triggerCondition: 'user_click',
      variableUpdates: { score: 10 }
    },
    {
      type: 'quiz',
      timestamp: Math.round(duration * 0.8),
      duration: 20,
      pauseOnTrigger: true,
      title: 'Test d\'assimilation',
      description: 'Vérifiez la maîtrise de la règle de sécurité abordée.',
      xPercent: 50,
      yPercent: 50,
      triggerCondition: 'timeline_reach',
      variableUpdates: { quiz_attempted: true }
    }
  ];

  return res.json({ success: true, interactions: fallbackInteractions, isFallback: true });
});

// 3. AI Quiz & Assessment Generator
app.post('/api/gemini/quiz', async (req, res) => {
  const { topic, questionCount, difficulty, types, language } = req.body;

  if (ai) {
    try {
      const prompt = `Generate a rich, diversified interactive e-learning assessment package for:
Topic: "${topic || 'General Interactive Learning'}"
Question Count: ${questionCount || 3}
Difficulty: "${difficulty || 'Intermédiaire'}"
Allowed Types: "${(types || ['multiple_choice', 'true_false', 'sequence', 'drag_drop', 'hotspot']).join(', ')}"
Language: "${language || 'Français'}"

Return a JSON array of question objects:
[
  {
    "id": "q1",
    "type": "multiple_choice" | "true_false" | "sequence" | "drag_drop" | "hotspot" | "fill_blanks",
    "title": "Clear concise question prompt",
    "explanation": "Detailed pedagogical explanation of why the answer is correct",
    "points": 10,
    "options": [
      { "id": "opt-1", "text": "Option A", "isCorrect": true, "feedback": "Exactement !" },
      { "id": "opt-2", "text": "Option B", "isCorrect": false, "feedback": "Attention au critère..." }
    ],
    // For sequence questions:
    "correctSequence": ["step-1", "step-2", "step-3"],
    // For drag_drop / categorization:
    "categories": ["Catégorie 1", "Catégorie 2"],
    "dragItems": [
      { "id": "item-1", "label": "Item A", "correctCategory": "Catégorie 1" },
      { "id": "item-2", "label": "Item B", "correctCategory": "Catégorie 2" }
    ],
    // For hotspot:
    "hotspotTarget": { "x": 55, "y": 40, "radius": 15, "hint": "Zone centrale du dispositif" }
  }
]`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const questions = JSON.parse(response.text || '[]');
      return res.json({ success: true, questions });
    } catch (err: any) {
      console.error('Gemini Quiz Error:', err);
    }
  }

  // Fallback rich pedagogical questions
  const fallbackQuestions = [
    {
      id: 'q1',
      type: 'multiple_choice',
      title: `Quel est le facteur déterminant pour réussir l'intervention dans le contexte "${topic || 'Opérationnel'}" ?`,
      explanation: 'La détection précoce des signaux faibles et la communication synchronisée réduisent de 80% les erreurs critiques.',
      points: 10,
      options: [
        { id: 'opt-1', text: 'La détection proactive et l\'application immédiate du protocole', isCorrect: true, feedback: 'Excellent ! C\'est la règle de base.' },
        { id: 'opt-2', text: 'L\'attente d\'une confirmation secondaire différée', isCorrect: false, feedback: 'Non, le délai aggraverait la situation.' },
        { id: 'opt-3', text: 'La désactivation des alertes de monitoring', isCorrect: false, feedback: 'Incorrect, cela supprimerait la traçabilité.' }
      ]
    },
    {
      id: 'q2',
      type: 'sequence',
      title: 'Classez dans l\'ordre chronologique les 4 étapes fondamentales :',
      explanation: 'L\'ordonnancement strict garantit la sécurité avant toute manipulation active.',
      points: 15,
      correctSequence: ['seq-1', 'seq-2', 'seq-3', 'seq-4'],
      sequenceItems: [
        { id: 'seq-1', text: '1. Analyse de la scène & évaluation des risques' },
        { id: 'seq-2', text: '2. Sécurisation du périmètre et isolement' },
        { id: 'seq-3', text: '3. Déploiement de la contre-mesure technique' },
        { id: 'seq-4', text: '4. Contrôle qualité et validation du retour à la normale' }
      ]
    },
    {
      id: 'q3',
      type: 'drag_drop',
      title: 'Catégorisez les éléments selon leur priorité opérationnelle :',
      explanation: 'La distinction immédiat / différé conditionne l\'allocation des ressources.',
      points: 20,
      categories: ['Priorité Immédiate (Critique)', 'Suivi Secondaire (Différé)'],
      dragItems: [
        { id: 'd-1', label: 'Coupure d\'alimentation d\'urgence', correctCategory: 'Priorité Immédiate (Critique)' },
        { id: 'd-2', label: 'Archivage des journaux d\'audit', correctCategory: 'Suivi Secondaire (Différé)' },
        { id: 'd-3', label: 'Alerte des équipes de premier secours', correctCategory: 'Priorité Immédiate (Critique)' },
        { id: 'd-4', label: 'Rédaction du rapport hebdomadaire', correctCategory: 'Suivi Secondaire (Différé)' }
      ]
    }
  ];

  return res.json({ success: true, questions: fallbackQuestions, isFallback: true });
});

// 4. AI Adaptive Feedback & Emotional / Remedial Pathway
app.post('/api/gemini/adaptive-feedback', async (req, res) => {
  const { learnerName, score, totalPoints, choicesHistory, mistakes, emotionState } = req.body;

  if (ai) {
    try {
      const prompt = `You are an AI pedagogical tutor in an advanced interactive video learning environment.
Analyze learner performance:
Learner Name: "${learnerName || 'Apprenant'}"
Score: ${score} / ${totalPoints}
Choices Made: ${JSON.stringify(choicesHistory || [])}
Errors Encountered: ${JSON.stringify(mistakes || [])}
Observed Stress/Confidence State: "${emotionState || 'neutral'}"

Provide a structured psychological & pedagogical debriefing in French:
{
  "summary": "Warm, constructive summary of performance",
  "masteryLevel": "Débutant" | "Intermédiaire" | "Avancé" | "Expert",
  "strengths": ["string", "string"],
  "areasForImprovement": ["string", "string"],
  "recommendedRemedialSceneId": "scene-id or null",
  "adaptiveTips": "Actionable piece of advice",
  "emotionalGuidance": "Encouraging remark addressing emotional state"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const debrief = JSON.parse(response.text || '{}');
      return res.json({ success: true, feedback: debrief });
    } catch (err: any) {
      console.error('Gemini Adaptive Feedback Error:', err);
    }
  }

  const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 80;
  return res.json({
    success: true,
    feedback: {
      summary: `Très bon travail ! Vous avez obtenu ${percentage}% de réussite avec une excellente réactivité face aux imprévus.`,
      masteryLevel: percentage >= 85 ? 'Expert' : percentage >= 60 ? 'Avancé' : 'Intermédiaire',
      strengths: [
        'Prise de décision rapide sous contrainte de temps',
        'Identification précise des zones sensibles de la vidéo'
      ],
      areasForImprovement: [
        'Vérifier les prérequis avant d\'engager la phase de contre-mesure',
        'Prendre le temps d\'inspecter le modèle 3D sous tous ses angles'
      ],
      recommendedRemedialSceneId: percentage < 70 ? 'scene-2a' : null,
      adaptiveTips: 'Révisez les 4 étapes du protocole avant de valider votre module final pour atteindre 100%.',
      emotionalGuidance: 'Votre concentration est restée soutenue tout au long de la simulation immersive.'
    },
    isFallback: true
  });
});

// 5. AI Text-To-Speech (TTS) Voiceover endpoint
app.post('/api/gemini/tts', async (req, res) => {
  const { text, voiceName, style } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text is required for TTS' });
  }

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: text,
                speechMetadata: {
                  style: style || 'Professional, pedagogical e-learning instructor voice',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        return res.json({
          success: true,
          audioData: base64Audio,
          mimeType: 'audio/wav',
        });
      }
    } catch (err: any) {
      console.error('Gemini TTS Error:', err);
    }
  }

  // Graceful response informing the client to use native browser Web Speech API
  return res.json({
    success: true,
    useWebSpeechApi: true,
    text,
    message: 'Generated using browser speech synthesis engine',
  });
});

// 6. AI Multi-lingual Translation Endpoint
app.post('/api/gemini/translate', async (req, res) => {
  const { items, targetLang } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Items array is required' });
  }

  if (ai) {
    try {
      const prompt = `Translate the following educational UI items / captions into language "${targetLang || 'English'}". Keep formatting exact.
Items: ${JSON.stringify(items)}

Return a JSON array of strings translated:
["translated 1", "translated 2", ...]`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const translated = JSON.parse(response.text || '[]');
      return res.json({ success: true, translations: translated });
    } catch (err: any) {
      console.error('Gemini Translate Error:', err);
    }
  }

  // Fallback simple translation
  return res.json({
    success: true,
    translations: items.map((it: string) => `[${targetLang || 'EN'}] ${it}`),
    isFallback: true
  });
});

// ============================================================================
// 7. Server-Side Persistence API (Projects, Assessments & Health Check)
// ============================================================================
const STORE_DIR = path.resolve(__dirname, 'data');
const STORE_FILE = path.resolve(STORE_DIR, 'server_store.json');

interface ServerStore {
  projects: Record<string, any>;
  assessments: any[];
  updatedAt: string;
}

function readServerStore(): ServerStore {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Could not read server store:', err);
  }
  return { projects: {}, assessments: [], updatedAt: new Date().toISOString() };
}

function writeServerStore(store: ServerStore) {
  try {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
    store.updatedAt = new Date().toISOString();
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write server store:', err);
  }
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'OmniStudio Interactive Video Platform',
    aiConfigured: Boolean(ai),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/projects', (_req, res) => {
  const store = readServerStore();
  res.json({
    success: true,
    projects: Object.values(store.projects),
    updatedAt: store.updatedAt,
  });
});

app.post('/api/projects', (req, res) => {
  const { project } = req.body;
  if (!project || !project.metadata?.id) {
    return res.status(400).json({ error: 'Valid project with metadata.id is required' });
  }
  const store = readServerStore();
  store.projects[project.metadata.id] = project;
  writeServerStore(store);
  return res.json({
    success: true,
    projectId: project.metadata.id,
    savedAt: store.updatedAt,
  });
});

app.delete('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  const store = readServerStore();
  if (store.projects[id]) {
    delete store.projects[id];
    writeServerStore(store);
  }
  return res.json({ success: true, deletedId: id });
});

app.get('/api/assessments', (_req, res) => {
  const store = readServerStore();
  res.json({ success: true, assessments: store.assessments });
});

app.post('/api/assessments', (req, res) => {
  const record = req.body;
  if (!record || !record.projectId) {
    return res.status(400).json({ error: 'Valid assessment record is required' });
  }
  const store = readServerStore();
  store.assessments.unshift(record);
  store.assessments = store.assessments.slice(0, 500);
  writeServerStore(store);
  return res.json({ success: true, recordId: record.recordId });
});

// In production, serve built frontend assets. In development, mount Vite dev server middlewares.
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 OmniStudio server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
