/**
 * OmniStudio Interactive Video - Comprehensive Type Definitions
 * Inspired by H5P, Articulate Storyline, Adobe Captivate, Eko Studio, and Genially.
 */

export type InteractionType =
  | 'hotspot'
  | 'button'
  | 'info_card'
  | 'quiz'
  | 'text_overlay'
  | 'image_overlay'
  | 'branching'
  | 'object_3d'
  | 'inventory_item'
  | 'audio_narration'
  | 'pip_video'
  | 'vr_hotspot'
  | 'loom_bubble'
  | 'code_snippet'
  | 'audio_spot'
  | 'poll_likert';

export type InteractionState = 'normal' | 'hover' | 'visited' | 'disabled';

export type TriggerEvent =
  | 'on_click'
  | 'on_double_click'
  | 'on_hover_enter'
  | 'on_hover_leave'
  | 'on_long_press'
  | 'on_timeline_reach'
  | 'on_quiz_correct'
  | 'on_quiz_incorrect'
  | 'on_variable_change';

export type TriggerAction =
  | 'pause_video'
  | 'resume_video'
  | 'jump_to_time'
  | 'jump_to_scene'
  | 'show_layer'
  | 'hide_layer'
  | 'set_variable'
  | 'add_inventory'
  | 'play_audio'
  | 'play_sfx'
  | 'shake_screen'
  | 'trigger_halo'
  | 'trigger_pip_video'
  | 'show_ai_feedback';

export type VisualTheme = 'cyber_neon' | 'clinical_glass' | 'midnight_minimal' | 'executive_gold';

export interface TriggerRule {
  id: string;
  name: string;
  event: TriggerEvent;
  conditionVariable?: string;
  conditionOperator?: '==' | '!=' | '>' | '<' | '>=' | '<=';
  conditionValue?: any;
  action: TriggerAction;
  actionTarget?: string; // e.g. sceneId, layerId, timeInSeconds
  variableDelta?: number;
}

export interface StorylineLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  pauseBaseLayer: boolean;
  contentHtml?: string;
  backgroundBlur?: boolean;
}

export interface VariableDefinition {
  name: string;
  type: 'number' | 'boolean' | 'string';
  defaultValue: any;
  currentValue: any;
  description: string;
}

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
  feedback?: string;
}

export interface DragItem {
  id: string;
  label: string;
  correctCategory: string;
}

export interface SequenceItem {
  id: string;
  text: string;
}

export interface QuizData {
  type: 'multiple_choice' | 'true_false' | 'sequence' | 'drag_drop' | 'hotspot' | 'fill_blanks';
  title: string;
  explanation: string;
  points: number;
  isMultipleChoice?: boolean; // false = Single choice radio, true = Multiple selection checkboxes
  options?: QuizOption[];
  sequenceItems?: SequenceItem[];
  correctSequence?: string[];
  categories?: string[];
  dragItems?: DragItem[];
  hotspotTarget?: {
    x: number;
    y: number;
    radius: number;
    hint?: string;
  };
  timeLimitSeconds?: number; // Countdown timer for timed questions (e.g. 15s)
  fillBlanksSentence?: string; // e.g. "L'organe principal de la respiration est le [poumon]."
  fillBlanksAnswers?: string[];
}

export interface InteractionItem {
  id: string;
  type: InteractionType;
  title: string;
  timestamp: number; // in seconds
  duration: number; // in seconds (for persistent overlays)
  pauseOnTrigger: boolean;
  xPercent: number; // 0 to 100
  yPercent: number; // 0 to 100
  widthPercent: number; // 0 to 100
  heightPercent: number; // 0 to 100
  currentState?: InteractionState;
  styleVariant: 'glass' | 'neon' | 'minimal' | 'flat' | 'cyber';
  
  // Custom payload according to type
  content?: string;
  description?: string;
  imageUrl?: string;
  audioUrl?: string;
  badgeName?: string;
  quiz?: QuizData;
  object3dType?: 'heart' | 'turbine' | 'server' | 'molecule';
  targetSceneId?: string; // for direct branching
  
  // Rich Click Action & Multimedia Popup fields (Canva / H5P style)
  actionOnClick?: 'open_popup' | 'open_link' | 'jump_to_time' | 'jump_to_scene';
  popupTitle?: string;
  popupText?: string;
  popupImageUrl?: string;
  popupAudioUrl?: string;
  popupButtonText?: string;
  popupButtonUrl?: string;
  targetTime?: number;
  targetUrl?: string;
  
  // Visual styling for text & buttons
  fontSize?: number; // e.g. 14, 18, 24, 32
  textColor?: string;
  backgroundColor?: string;
  opacity?: number;
  
  // Advanced features (Loom, Code, Audio, Locking, Layer z-index)
  codeLanguage?: string;
  codeSnippet?: string;
  audioNarrationUrl?: string;
  likertScale?: { minLabel: string; maxLabel: string; steps: number };
  isLocked?: boolean;
  zIndex?: number;

  // Triggers
  triggers: TriggerRule[];
  
  // Branching choices if type === 'branching'
  branchingChoices?: {
    id: string;
    label: string;
    targetSceneId: string;
    impactDescription?: string;
    requiredScore?: number;
  }[];
}

export interface VideoChapter {
  id: string;
  title: string;
  timestamp: number;
}

export interface VideoScene {
  id: string;
  title: string;
  description: string;
  duration: number; // total duration in seconds
  videoUrl?: string; // real video url or procedural generative scene
  videoType: 'standard' | 'vr360' | 'procedural';
  mediaMode?: 'video' | 'slide' | 'hybrid_loom' | 'vr360';
  slideImageUrl?: string;
  slideTheme?: 'midnight' | 'academic' | 'executive' | 'cyber';
  presenterBubble?: {
    avatarUrl: string;
    name: string;
    position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
    isSpeaking: boolean;
    videoUrl?: string;
  };
  learningObjective: string;
  chapters?: VideoChapter[];
  interactions: InteractionItem[];
  layers: StorylineLayer[];
  branchingChoices: {
    id: string;
    label: string;
    targetSceneId: string;
    pedagogicalImpact: string;
  }[];
  // Node coordinates for visual graph editor
  graphNodePosition?: {
    x: number;
    y: number;
  };
}

export interface ProjectMetadata {
  id: string;
  title: string;
  category: 'Medical' | 'Cybersecurity' | 'Engineering' | 'Business' | 'Custom';
  description: string;
  author: string;
  version: string;
  targetAudience: string;
  language: 'Français' | 'English' | 'Español' | 'Deutsch';
  createdDate: string;
}

export interface GamificationState {
  score: number;
  maxScore: number;
  level: number;
  xp: number;
  badges: {
    id: string;
    title: string;
    description: string;
    icon: string;
    unlockedAt?: string;
  }[];
  inventory: {
    id: string;
    name: string;
    icon: string;
    description: string;
    acquiredAt?: string;
  }[];
}

export interface InteractiveProject {
  metadata: ProjectMetadata;
  variables: Record<string, VariableDefinition>;
  scenes: VideoScene[];
  startSceneId: string;
  gamification: GamificationState;
  scormSettings: {
    passingScorePercent: number;
    allowRetake: boolean;
    scormVersion: '1.2' | '2004';
    reportAs: 'Passed/Failed' | 'Completed/Incomplete';
  };
}
