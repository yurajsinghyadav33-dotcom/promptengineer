import { useState, useEffect, useMemo, useCallback } from 'react';
import { Play, Pause, SkipForward, X, Sparkles } from 'lucide-react';
import { PRESET_SCENARIOS } from '../services/geminiService';
import type { PresetScenario } from '../types';

interface DemoTourProps {
  isActive: boolean;
  onClose: () => void;
  onSelectPreset: (preset: PresetScenario) => void;
  onTriggerAnalyze: (presetId: string) => void;
  onAnswerClarification: (qId: string, answer: string) => void;
  onSwitchOutputTab: (format: string, lang: 'en' | 'hi' | 'hinglish') => void;
  onShowImpact: () => void;
  onShowToast: (msg: string) => void;
}

export const DemoTour: React.FC<DemoTourProps> = ({
  isActive,
  onClose,
  onSelectPreset,
  onTriggerAnalyze,
  onAnswerClarification,
  onSwitchOutputTab,
  onShowImpact,
  onShowToast
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const handleClose = useCallback(() => {
    setCurrentStep(0);
    setIsPaused(false);
    onClose();
  }, [onClose]);

  const steps = useMemo(() => [
    {
      title: 'Step 1: Real-World Human Distress Input',
      desc: 'Loading messy Hindi citizen statement regarding broken streetlight on school commute route.',
      action: () => {
        const preset = PRESET_SCENARIOS[0]; // Civic
        onSelectPreset(preset);
        const el = document.getElementById('action-console');
        el?.scrollIntoView({ behavior: 'smooth' });
      }
    },
    {
      title: 'Step 2: Evidentiary Multimodal Attachment',
      desc: 'Corroborating night photograph with automated pole tag OCR marker #L-42.',
      action: () => {
        // Preset image is already mounted
      }
    },
    {
      title: 'Step 3: Compiling Situation into Structured Actions',
      desc: 'SignalSetu AI Action Compiler runs: facts extraction, urgency classification, and risk boundary check.',
      action: () => {
        onTriggerAnalyze('civic-light');
      }
    },
    {
      title: 'Step 4: Extracted Facts & Signal Strength',
      desc: 'Viewing verified 3-day outage and school children pedestrian risk.',
      action: () => {
        const el = document.getElementById('analysis-results-section');
        el?.scrollIntoView({ behavior: 'smooth' });
      }
    },
    {
      title: 'Step 5: Highlighting Uncertain Claims & Missing Data',
      desc: 'SignalSetu accurately highlights unknown Ward number and requests landmark clarification.',
      action: () => {
        const el = document.getElementById('clarification-panel');
        el?.scrollIntoView({ behavior: 'smooth' });
      }
    },
    {
      title: 'Step 6: Answering Clarification Question',
      desc: 'Citizen supplies: "Opposite House #412 near Water Cooler".',
      action: () => {
        onAnswerClarification('q-loc', 'Opposite House #412 near Water Cooler');
        onShowToast('Clarification answered: Confidence boosted to 95%!');
      }
    },
    {
      title: 'Step 7: Dynamic Re-Compilation (Zero Reset)',
      desc: 'Analysis updates in-place. The claim transforms from uncertain to verified!',
      action: () => {
        const el = document.getElementById('verification-ledger');
        el?.scrollIntoView({ behavior: 'smooth' });
      }
    },
    {
      title: 'Step 8: The Verification Ledger (Key Differentiator)',
      desc: 'Inspect the evidence ledger mapping every single claim to concrete sources.',
      action: () => {
        const el = document.getElementById('verification-ledger');
        el?.scrollIntoView({ behavior: 'smooth' });
      }
    },
    {
      title: 'Step 9: Official Municipal Complaint in Hindi (हिंदी)',
      desc: 'Ready-to-dispatch formal letter generated with legal charter norms and pole tag reference.',
      action: () => {
        onSwitchOutputTab('complaint', 'hi');
        const el = document.getElementById('ready-outputs-section');
        el?.scrollIntoView({ behavior: 'smooth' });
      }
    },
    {
      title: 'Step 10: Volunteer Ground Handoff Brief in English',
      desc: 'Community coordination brief prepared to escort children safely across the unlit road.',
      action: () => {
        onSwitchOutputTab('volunteer', 'en');
        const el = document.getElementById('ready-outputs-section');
        el?.scrollIntoView({ behavior: 'smooth' });
      }
    },
    {
      title: 'Step 11: Real-Time Community Impact Telemetry',
      desc: 'Tracking aggregate civic time saved, reports resolved, and citizens protected.',
      action: () => {
        onShowImpact();
        const el = document.getElementById('impact-section');
        el?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  ], [onSelectPreset, onTriggerAnalyze, onAnswerClarification, onShowToast, onSwitchOutputTab, onShowImpact]);

  useEffect(() => {
    if (!isActive) return;

    // Execute current step action
    const current = steps[currentStep];
    if (current) {
      current.action();
    }

    if (isPaused) return;

    // Advance automatically every 7 seconds if not paused
    const timer = setTimeout(() => {
      if (currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        onShowToast('Demo tour completed! Feel free to test with your own custom input.');
      }
    }, 7000);

    return () => clearTimeout(timer);
  }, [isActive, currentStep, isPaused, steps, onShowToast]);

  if (!isActive) return null;

  const current = steps[currentStep];

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '90%',
      maxWidth: '680px',
      background: 'rgba(13, 21, 44, 0.95)',
      backdropFilter: 'blur(20px)',
      border: '1px solid var(--accent-cyan)',
      borderRadius: 'var(--radius-md)',
      padding: '16px 20px',
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.7), 0 0 30px var(--accent-cyan-glow)',
      zIndex: 150,
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} color="var(--accent-cyan)" />
          <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-cyan)' }}>
            90-Second Guided Demo Flow ({currentStep + 1}/{steps.length})
          </span>
        </div>

        <button
          onClick={handleClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '2px' }}
          title="Exit Demo"
        >
          <X size={18} />
        </button>
      </div>

      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
        {current.title}
      </div>

      <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.45 }}>
        {current.desc}
      </div>

      {/* Progress bar */}
      <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginBottom: '12px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${((currentStep + 1) / steps.length) * 100}%`, background: 'var(--accent-gradient)', transition: 'width 0.4s ease' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? <Play size={13} /> : <Pause size={13} />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          {currentStep < steps.length - 1 && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setCurrentStep(prev => prev + 1)}
            >
              <SkipForward size={13} />
              <span>Next Step</span>
            </button>
          )}
        </div>

        <button
          className="btn btn-primary btn-sm"
          onClick={handleClose}
        >
          <span>End Walkthrough</span>
        </button>
      </div>
    </div>
  );
};
