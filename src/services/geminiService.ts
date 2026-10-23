/**
 * OmniStudio - Client Service interfacing with server-side Gemini API
 */

export interface StoryboardResponse {
  success: boolean;
  scenes: any[];
  isFallback?: boolean;
}

export async function generateStoryboard(
  topic: string,
  audience?: string,
  durationMinutes?: number,
  tone?: string,
  language?: string
): Promise<StoryboardResponse> {
  try {
    const res = await fetch('/api/gemini/storyboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, audience, durationMinutes, tone, language }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('API error, falling back locally:', err);
    return {
      success: true,
      isFallback: true,
      scenes: [
        {
          id: `scene-${Date.now()}`,
          title: `Introduction : ${topic}`,
          description: `Présentation dynamique des concepts fondamentaux de ${topic}.`,
          duration: 30,
          videoPrompt: `High tech simulation scene illustrating ${topic}`,
          learningObjective: `Assimiler les notions de base de ${topic}.`,
          interactions: [
            {
              type: 'info_card',
              timestamp: 5,
              pauseOnTrigger: false,
              title: 'Notion Clé',
              description: `Comprendre les leviers essentiels de ${topic}.`,
            },
          ],
          branchingChoices: [
            {
              label: 'Parcours Recommandé',
              targetSceneId: 'scene-next',
              pedagogicalImpact: 'Progression linéaire standard.',
            },
          ],
        },
      ],
    };
  }
}

export async function scanInteractions(
  sceneTitle: string,
  sceneDescription: string,
  sceneDuration: number,
  targetDensity?: string
) {
  try {
    const res = await fetch('/api/gemini/scan-interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sceneTitle, sceneDescription, sceneDuration, targetDensity }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Scan interaction fallback:', err);
    return {
      success: true,
      isFallback: true,
      interactions: [
        {
          type: 'hotspot',
          timestamp: Math.round(sceneDuration * 0.3),
          duration: 10,
          pauseOnTrigger: true,
          title: 'Zone d\'analyse suggérée par l\'IA',
          description: 'Cliquez pour examiner le composant principal.',
          xPercent: 50,
          yPercent: 50,
        },
      ],
    };
  }
}

export async function generateQuizQuestions(
  topic: string,
  questionCount: number = 3,
  difficulty: string = 'Intermédiaire',
  types: string[] = ['multiple_choice', 'sequence', 'drag_drop'],
  language: string = 'Français'
) {
  try {
    const res = await fetch('/api/gemini/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, questionCount, difficulty, types, language }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Quiz fallback:', err);
    return {
      success: true,
      isFallback: true,
      questions: [
        {
          id: `q-${Date.now()}`,
          type: 'multiple_choice',
          title: `Quelle est la règle d'or concernant ${topic} ?`,
          explanation: 'L\'application rigoureuse du protocole garantit une sécurité optimale.',
          points: 20,
          options: [
            { id: 'opt-a', text: 'Respecter scrupuleusement la procédure standard', isCorrect: true, feedback: 'Correct !' },
            { id: 'opt-b', text: 'Improviser selon son intuition', isCorrect: false, feedback: 'Erreur méthodologique.' },
          ],
        },
      ],
    };
  }
}

export async function getAdaptiveFeedback(
  learnerName: string,
  score: number,
  totalPoints: number,
  choicesHistory: any[],
  mistakes: any[],
  emotionState?: string
) {
  try {
    const res = await fetch('/api/gemini/adaptive-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ learnerName, score, totalPoints, choicesHistory, mistakes, emotionState }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    const pct = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 80;
    return {
      success: true,
      isFallback: true,
      feedback: {
        summary: `Performance globale : ${pct}%. Bonne maîtrise des concepts fondamentaux.`,
        masteryLevel: pct >= 80 ? 'Expert' : 'Intermédiaire',
        strengths: ['Rapidité d\'analyse', 'Précision dans les quiz'],
        areasForImprovement: ['Relecture attentive des questions à choix multiple'],
        recommendedRemedialSceneId: null,
        adaptiveTips: 'Poursuivez vos efforts en explorant les modules avancés.',
        emotionalGuidance: 'Restez confiant dans vos choix d\'intervention.',
      },
    };
  }
}

export async function playTtsVoiceover(text: string, voiceName: string = 'Kore'): Promise<void> {
  try {
    const res = await fetch('/api/gemini/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceName }),
    });
    const data = await res.json();
    if (data.audioData) {
      const audio = new Audio(`data:audio/wav;base64,${data.audioData}`);
      await audio.play();
      return;
    }
  } catch (err) {
    console.warn('TTS server call failed, using Web Speech API fallback', err);
  }

  // Fallback to browser SpeechSynthesis API
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

export async function translateProjectItems(items: string[], targetLang: string = 'English') {
  try {
    const res = await fetch('/api/gemini/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, targetLang }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    return {
      success: true,
      isFallback: true,
      translations: items.map((t) => `[${targetLang}] ${t}`),
    };
  }
}

export async function convertDocumentToInteractiveCourse(
  documentText: string,
  title: string
): Promise<StoryboardResponse> {
  try {
    const res = await fetch('/api/gemini/document-to-course', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentText, title }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Document conversion error, falling back to structured extraction:', err);
    const paragraphs = documentText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 20);

    const generatedScenes = (paragraphs.length > 0 ? paragraphs.slice(0, 3) : [documentText]).map(
      (para, idx) => {
        const words = para.split(' ');
        const sectionTitle = words.slice(0, 5).join(' ') || `Section ${idx + 1}`;
        return {
          id: `scene-doc-${Date.now()}-${idx}`,
          title: `Étape ${idx + 1} : ${sectionTitle}`,
          description: para.slice(0, 200),
          duration: 35,
          mediaMode: idx % 2 === 0 ? 'slide' : 'video',
          learningObjective: `Assimiler et appliquer les notions clés de "${sectionTitle}".`,
          interactions: [
            {
              id: `int-doc-info-${idx}`,
              type: 'info_card',
              title: `Point Essentiel ${idx + 1}`,
              timestamp: 5,
              duration: 10,
              pauseOnTrigger: false,
              xPercent: 70,
              yPercent: 25,
              widthPercent: 28,
              heightPercent: 25,
              styleVariant: 'glass',
              content: para.slice(0, 140) + '...',
              triggers: [],
            },
            {
              id: `int-doc-quiz-${idx}`,
              type: 'quiz',
              title: `Contrôle de Compréhension ${idx + 1}`,
              timestamp: 22,
              duration: 12,
              pauseOnTrigger: true,
              xPercent: 50,
              yPercent: 50,
              widthPercent: 60,
              heightPercent: 60,
              styleVariant: 'glass',
              quiz: {
                type: 'multiple_choice',
                title: `D'après le document : quelle est la règle prioritaire concernant "${sectionTitle}" ?`,
                explanation: `Exigence extraite de la section ${idx + 1} du document source.`,
                points: 20,
                isMultipleChoice: false,
                options: [
                  { id: `opt-1-${idx}`, text: `Respecter la directive : ${words.slice(0, 4).join(' ')}`, isCorrect: true },
                  { id: `opt-2-${idx}`, text: 'Ignorer la procédure et poursuivre sans validation', isCorrect: false },
                  { id: `opt-3-${idx}`, text: 'Reporter l’analyse sans en informer l’équipe', isCorrect: false },
                ],
              },
              triggers: [],
            },
          ],
          layers: [],
          branchingChoices: [
            {
              id: `branch-doc-${idx}`,
              label: idx < 2 ? 'Continuer vers l\'étape suivante' : 'Finaliser le parcours',
              targetSceneId: `scene-doc-next-${idx}`,
              pedagogicalImpact: 'Validation certifiante.',
            },
          ],
        };
      }
    );

    return {
      success: true,
      isFallback: true,
      scenes: generatedScenes,
    };
  }
}
