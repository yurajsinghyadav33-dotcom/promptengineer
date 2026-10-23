export type SourceType = 'text' | 'image' | 'voice' | 'document' | 'user-provided';
export type FactStatus = 'verified' | 'likely' | 'uncertain';
export type UrgencyLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type OutputLanguage = 'en' | 'hi' | 'hinglish';
export type OutputFormat = 'complaint' | 'whatsapp' | 'email' | 'social' | 'volunteer' | 'emergency';

export interface Fact {
  id: string;
  fact: string;
  source: SourceType;
  status: FactStatus;
  confidence: number; // 0 - 100
  note?: string;
}

export interface LedgerItem {
  id: string;
  claim: string;
  evidence: string;
  confidence: number;
  verificationRequirement: string;
  sourceCategory: 'user-provided' | 'image-derived' | 'model-inferred' | 'unknown';
}

export interface UrgencyAssessment {
  level: UrgencyLevel;
  score: number; // 1-10
  rationale: string;
  affectedPeople: string;
  immediateSafetyInstruction: string;
  disclaimer?: string;
}

export interface MissingQuestion {
  id: string;
  question: string;
  whyNeeded: string;
  suggestedAnswers?: string[];
  answered?: boolean;
  userAnswer?: string;
}

export interface ActionStep {
  id: string;
  timeframe: 'Do now' | 'Do within 1 hour' | 'Do within 24 hours' | 'Escalate if unresolved';
  action: string;
  responsibleEntity: string;
  priority: 'urgent' | 'high' | 'normal';
}

export interface ReadyOutputs {
  complaint: {
    title: string;
    en: string;
    hi: string;
    hinglish: string;
  };
  whatsapp: {
    en: string;
    hi: string;
    hinglish: string;
  };
  email: {
    subject: string;
    en: string;
    hi: string;
    hinglish: string;
  };
  social: {
    en: string;
    hi: string;
    hinglish: string;
  };
  volunteer: {
    en: string;
    hi: string;
    hinglish: string;
  };
  emergency?: {
    en: string;
    hi: string;
    hinglish: string;
  };
}

export interface ExplainabilityData {
  whatSystemSaw: string[];
  whatItInferred: string[];
  whatRemainsUnknown: string[];
  whyThisUrgency: string;
  whyRecommendedActions: string;
}

export interface AnalysisResult {
  id: string;
  scenarioId?: string;
  title: string;
  timestamp: string;
  category: 'Civic Infrastructure' | 'Emergency & Safety' | 'Health & Medication' | 'Accessibility & Rights' | 'General Civic';
  detectedLanguage: 'Hindi' | 'Hinglish' | 'English';
  overallConfidence: number; // 0-100
  timeMentioned: string;
  locationMentioned: string;
  summary: string;
  facts: Fact[];
  urgency: UrgencyAssessment;
  missingQuestions: MissingQuestion[];
  actionPlan: ActionStep[];
  readyOutputs: ReadyOutputs;
  verificationLedger: LedgerItem[];
  explainability: ExplainabilityData;
}

export interface InputPayload {
  text: string;
  voiceTranscript?: string;
  images: { id: string; name: string; url: string; size?: number }[];
  documents: { id: string; name: string; size?: number }[];
  location: string;
  preferredLanguage: OutputLanguage;
}

export interface PresetScenario {
  id: string;
  category: string;
  label: string;
  icon: string;
  inputText: string;
  location: string;
  imageUrl?: string;
  imageCaption?: string;
  docName?: string;
}

export interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}

export interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResultItem[];
  [index: number]: {
    [index: number]: SpeechRecognitionResultItem;
  };
}

export interface SpeechRecognitionEventLike {
  results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
