import { ArrowRight, Play, LightbulbOff, Pill, Zap, Accessibility, ShieldCheck } from 'lucide-react';
import { PRESET_SCENARIOS } from '../services/geminiService';
import type { PresetScenario } from '../types';

interface LandingHeroProps {
  onSelectPreset: (preset: PresetScenario) => void;
  onScrollToConsole: () => void;
  onStartDemo: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onSelectPreset,
  onScrollToConsole,
  onStartDemo
}) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'LightbulbOff':
        return <LightbulbOff size={18} color="#38bdf8" />;
      case 'Pill':
        return <Pill size={18} color="#f472b6" />;
      case 'Zap':
        return <Zap size={18} color="#facc15" />;
      case 'Accessibility':
        return <Accessibility size={18} color="#a78bfa" />;
      default:
        return <ShieldCheck size={18} color="#38bdf8" />;
    }
  };

  return (
    <section className="hero-section">
      <div className="hero-pill">
        <span className="pulse-dot"></span>
        <span>Universal Human-Intent to Action Compiler</span>
      </div>

      <h1 className="hero-title">
        Turn real-world confusion into <span className="gradient-text">verified action.</span>
      </h1>

      <p className="hero-subtext">
        Speak, upload photos, or type what happened in Hindi, Hinglish, or English. SignalSetu extracts critical facts, filters uncertainty, builds a Verification Ledger, and generates ready-to-dispatch action plans.
      </p>

      <div className="hero-cta-group">
        <button className="btn btn-primary" onClick={onScrollToConsole} id="hero-cta-try">
          <span>Try a real situation</span>
          <ArrowRight size={16} />
        </button>

        <button className="btn btn-demo" onClick={onStartDemo} id="hero-cta-demo">
          <Play size={16} fill="currentColor" />
          <span>See how it works (90s Demo)</span>
        </button>
      </div>

      <div style={{ marginTop: '32px', textAlign: 'left' }}>
        <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
          Explore Real Scenarios (Click to Load & Analyze):
        </p>

        <div className="preset-grid">
          {PRESET_SCENARIOS.map((preset) => (
            <div
              key={preset.id}
              className="preset-card"
              onClick={() => onSelectPreset(preset)}
              id={`preset-card-${preset.id}`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { 
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectPreset(preset);
                }
              }}
            >
              <div className="preset-card-header">
                <span className="preset-category">{preset.category}</span>
                {getIcon(preset.icon)}
              </div>
              <div className="preset-label">{preset.label}</div>
              <div className="preset-snippet">“{preset.inputText}”</div>
              <div style={{ fontSize: '0.74rem', color: '#38bdf8', marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>Analyze this case</span>
                <ArrowRight size={12} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
