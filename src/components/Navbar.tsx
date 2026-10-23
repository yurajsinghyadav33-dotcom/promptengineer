import { Activity, Sparkles, Key, Play, BarChart3, Compass } from 'lucide-react';

interface NavbarProps {
  onRunDemo: () => void;
  onOpenApiKeyModal: () => void;
  onToggleImpact: () => void;
  showImpact: boolean;
  hasApiKey: boolean;
  onScrollToConsole: () => void;
  onOpenMap: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onRunDemo,
  onOpenApiKeyModal,
  onToggleImpact,
  showImpact,
  hasApiKey,
  onScrollToConsole,
  onOpenMap
}) => {
  return (
    <header className="navbar">
      <a href="#" className="brand-wrapper" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
        <div className="brand-logo">
          <Activity size={24} />
        </div>
        <div className="brand-text">
          <h1>SignalSetu</h1>
          <span>अनसुलझे हालात से प्रमाणित समाधान</span>
        </div>
      </a>

      <div className="nav-actions">
        <button
          className="btn btn-demo"
          onClick={onRunDemo}
          title="Run 90-Second Guided Live Demo"
          id="btn-run-demo"
        >
          <Play size={15} fill="currentColor" />
          <span>1-Click Demo</span>
        </button>

        <button
          className="btn btn-secondary"
          onClick={onOpenMap}
          title="Open India Geospatial Incident Radar"
          id="btn-nav-map"
          style={{ borderColor: 'var(--accent-cyan)', color: '#38bdf8' }}
        >
          <Compass size={15} />
          <span>Map Radar</span>
        </button>

        <button
          className={`btn btn-secondary ${showImpact ? 'active' : ''}`}
          onClick={onToggleImpact}
          title="Toggle Community Impact Dashboard"
          id="btn-toggle-impact"
        >
          <BarChart3 size={16} />
          <span>Impact</span>
        </button>

        <button
          className="btn btn-secondary"
          onClick={onOpenApiKeyModal}
          title="Configure Gemini API Key"
          id="btn-api-config"
        >
          <Key size={15} />
          <span>{hasApiKey ? 'Gemini Live' : 'Mock AI Mode'}</span>
        </button>

        <button
          className="btn btn-primary"
          onClick={onScrollToConsole}
          id="btn-nav-try"
        >
          <Sparkles size={16} />
          <span>Try Situation</span>
        </button>
      </div>
    </header>
  );
};
