import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LandingHero } from './components/LandingHero';
import { ImpactDashboard } from './components/ImpactDashboard';
import { ActionConsole } from './components/ActionConsole';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { ExplainabilityModal } from './components/ExplainabilityModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { DemoTour } from './components/DemoTour';
import { IndiaMapModal } from './components/IndiaMapModal';
import { GeminiActionCompiler, PRESET_SCENARIOS } from './services/geminiService';
import type { AnalysisResult, InputPayload, OutputFormat, OutputLanguage, PresetScenario } from './types';
import type { ExistingIncident } from './services/nearbyIncidentsService';
import { Sparkles, CheckCircle } from 'lucide-react';

const STORAGE_PAYLOAD_KEY = 'signalsetu_input_payload_v1';
const STORAGE_ANALYSIS_KEY = 'signalsetu_analysis_result_v1';

export function App() {
  // 1. Initialize state from localStorage if available
  const [inputPayload, setInputPayload] = useState<InputPayload>(() => {
    const saved = localStorage.getItem(STORAGE_PAYLOAD_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch { /* ignore */ }
    }
    const defaultPreset = PRESET_SCENARIOS[0];
    return {
      text: defaultPreset.inputText,
      location: defaultPreset.location,
      images: defaultPreset.imageUrl ? [{
        id: 'img-preset-0',
        name: 'Streetlight_Site_Observation.svg',
        url: defaultPreset.imageUrl
      }] : [],
      documents: defaultPreset.docName ? [{
        id: 'doc-preset-0',
        name: defaultPreset.docName
      }] : [],
      preferredLanguage: 'hinglish' as OutputLanguage
    };
  });

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(() => {
    const saved = localStorage.getItem(STORAGE_ANALYSIS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch { /* ignore */ }
    }
    return null;
  });

  const [activePresetId, setActivePresetId] = useState<string | undefined>('civic-light');
  const [isLoading, setIsLoading] = useState(false);
  const [showImpact, setShowImpact] = useState(true);
  const [isExplainabilityOpen, setIsExplainabilityOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isDemoTourActive, setIsDemoTourActive] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(() => !!GeminiActionCompiler.getApiKey());
  const [toasts, setToasts] = useState<{ id: string; msg: string }[]>([]);
  const [dashboardOutputTab, setDashboardOutputTab] = useState<OutputFormat | undefined>(undefined);
  const [dashboardOutputLang, setDashboardOutputLang] = useState<OutputLanguage | undefined>(undefined);

  // 2. Persist state to localStorage on updates
  useEffect(() => {
    localStorage.setItem(STORAGE_PAYLOAD_KEY, JSON.stringify(inputPayload));
  }, [inputPayload]);

  useEffect(() => {
    if (analysis) {
      localStorage.setItem(STORAGE_ANALYSIS_KEY, JSON.stringify(analysis));
    }
  }, [analysis]);

  // Toast notifier helper
  const showToast = (msg: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, msg }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  // Map selection / Proximity adoption handler
  const handleSelectMapLocation = (locationStr: string, matchedIncident?: ExistingIncident) => {
    setInputPayload(prev => ({
      ...prev,
      location: locationStr,
      ...(matchedIncident ? { text: matchedIncident.description } : {})
    }));
    if (matchedIncident) {
      showToast(`Matched community report: "${matchedIncident.title}"`);
    } else {
      showToast(`Location reference updated: ${locationStr}`);
    }
  };

  // Preset Selection handler
  const handleSelectPreset = (preset: PresetScenario) => {
    setActivePresetId(preset.id);
    setInputPayload({
      text: preset.inputText,
      location: preset.location,
      images: preset.imageUrl ? [{
        id: `img-${preset.id}`,
        name: `${preset.label.replace(/[^a-zA-Z0-9]/g, '_')}_Photo.svg`,
        url: preset.imageUrl
      }] : [],
      documents: preset.docName ? [{
        id: `doc-${preset.id}`,
        name: preset.docName
      }] : [],
      preferredLanguage: 'hinglish'
    });
    showToast(`Loaded scenario: ${preset.label}`);
    
    // Automatically scroll to console
    const consoleEl = document.getElementById('action-console');
    if (consoleEl) {
      consoleEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Primary Action Compiler trigger
  const handleAnalyze = async (presetId?: string) => {
    if (!inputPayload.text.trim() && inputPayload.images.length === 0) {
      showToast('Please provide text, voice note, or an image to analyze.');
      return;
    }

    setIsLoading(true);
    try {
      // Determine if current input text is actually an unmodified preset
      const targetPresetId = presetId || activePresetId;
      const matchingPreset = PRESET_SCENARIOS.find(p => p.id === targetPresetId);
      const isExactPreset = matchingPreset && inputPayload.text.trim() === matchingPreset.inputText.trim();
      const effectivePresetId = isExactPreset ? targetPresetId : undefined;

      const result = await GeminiActionCompiler.analyze(inputPayload, effectivePresetId);
      setAnalysis(result);
      showToast('Analysis completed: Tailored Action Plan & Verification Ledger generated!');

      setTimeout(() => {
        const resultsEl = document.getElementById('analysis-results-section');
        if (resultsEl) {
          resultsEl.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Check inputs';
      showToast(`Compilation error: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Interactive Clarification Question Answering
  const handleAnswerClarification = (questionId: string, answerText: string) => {
    if (!analysis) return;
    const updated = GeminiActionCompiler.updateWithClarification(analysis, questionId, answerText);
    setAnalysis(updated);
    showToast(`Clarification added: "${answerText}" — Confidence updated!`);
  };

  // Scroll to console utility
  const scrollToConsole = () => {
    const el = document.getElementById('action-console');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <div className="signal-lines" />
      <div className="app-container">
        {/* Navbar */}
        <Navbar
          onRunDemo={() => setIsDemoTourActive(true)}
          onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
          onToggleImpact={() => setShowImpact(prev => !prev)}
          showImpact={showImpact}
          hasApiKey={hasApiKey}
          onScrollToConsole={scrollToConsole}
          onOpenMap={() => setIsMapModalOpen(true)}
        />

        {/* Landing Hero */}
        <LandingHero
          onSelectPreset={(preset) => {
            handleSelectPreset(preset);
            handleAnalyze(preset.id);
          }}
          onScrollToConsole={scrollToConsole}
          onStartDemo={() => setIsDemoTourActive(true)}
        />

        {/* Impact Dashboard Telemetry */}
        {showImpact && <ImpactDashboard />}

        {/* Action Console (Multimodal Input & Compilation trigger) */}
        <ActionConsole
          inputPayload={inputPayload}
          onChangePayload={(updater) => {
            setActivePresetId(undefined);
            setInputPayload(updater);
          }}
          onAnalyze={handleAnalyze}
          isLoading={isLoading}
          onSelectPreset={handleSelectPreset}
          activePresetId={activePresetId}
          onOpenMap={() => setIsMapModalOpen(true)}
        />

        {/* Analysis Dashboard (Ledger, Facts, Risk, Actions, Ready-to-Share Hub) */}
        {analysis ? (
          <AnalysisDashboard
            analysis={analysis}
            onAnswerQuestion={handleAnswerClarification}
            onOpenExplainability={() => setIsExplainabilityOpen(true)}
            onShowToast={showToast}
            currentOutputTab={dashboardOutputTab}
            currentOutputLang={dashboardOutputLang}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)' }}>
            <Sparkles size={32} style={{ margin: '0 auto 12px auto', color: 'var(--accent-cyan)', opacity: 0.7 }} />
            <p style={{ fontSize: '0.95rem' }}>Select any preset above or click <strong>“Analyze Situation”</strong> to generate the Verification Ledger and Action Plan.</p>
          </div>
        )}

        {/* Footer */}
        <footer style={{ marginTop: '60px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
          <div>
            <strong>SignalSetu</strong> — Universal Action Compiler • Powered by Google Gemini & Multimodal Intelligence
          </div>
          <div>
            Built for Civic Transparency, Public Health Safety & Accessibility Mandates
          </div>
        </footer>
      </div>

      {/* Explainability Modal */}
      {analysis && (
        <ExplainabilityModal
          isOpen={isExplainabilityOpen}
          onClose={() => setIsExplainabilityOpen(false)}
          data={analysis.explainability}
        />
      )}

      {/* Gemini API Key Configuration Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onKeySaved={setHasApiKey}
      />

      {/* India Geospatial Incident Radar Map Modal */}
      <IndiaMapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        currentLocationString={inputPayload.location}
        onSelectLocation={handleSelectMapLocation}
        onShowToast={showToast}
      />

      {/* 90-Second Guided 1-Click Interactive Demo Tour */}
      <DemoTour
        isActive={isDemoTourActive}
        onClose={() => setIsDemoTourActive(false)}
        onSelectPreset={handleSelectPreset}
        onTriggerAnalyze={handleAnalyze}
        onAnswerClarification={handleAnswerClarification}
        onSwitchOutputTab={(format, lang) => {
          setDashboardOutputTab(format as OutputFormat);
          setDashboardOutputLang(lang);
        }}
        onShowImpact={() => setShowImpact(true)}
        onShowToast={showToast}
      />

      {/* Floating Toast Container */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast-item">
            <CheckCircle size={16} color="var(--accent-cyan)" />
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export default App;
