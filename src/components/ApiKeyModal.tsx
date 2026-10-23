import { useState, useEffect } from 'react';
import { X, Key, ShieldCheck, ExternalLink } from 'lucide-react';
import { GeminiActionCompiler } from '../services/geminiService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved: (hasKey: boolean) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onKeySaved
}) => {
  const [apiKey, setApiKey] = useState(GeminiActionCompiler.getApiKey());
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    GeminiActionCompiler.setApiKey(apiKey);
    const hasKey = !!apiKey.trim();
    onKeySaved(hasKey);
    setStatusMsg(hasKey ? 'Gemini API key saved in browser session.' : 'Reverted to intelligent Mock AI Compiler.');
    setTimeout(() => {
      setStatusMsg(null);
      onClose();
    }, 1200);
  };

  const handleClear = () => {
    setApiKey('');
    GeminiActionCompiler.setApiKey('');
    onKeySaved(false);
    setStatusMsg('API key removed. Using intelligent local mock compiler.');
    setTimeout(() => {
      setStatusMsg(null);
      onClose();
    }, 1200);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <h3>
            <Key size={20} />
            <span>Google Gemini AI Engine Configuration</span>
          </h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: '18px' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.5 }}>
            SignalSetu works <strong>100% out-of-the-box</strong> with its built-in realistic deterministic Mock AI Compiler, requiring zero API setup for demos and presentations.
          </p>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Optionally, provide your Google Gemini API key to activate live inference with <code>gemini-1.5-flash</code> for custom open-ended queries.
          </p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '6px' }}>
            Gemini API Key (Stored Locally in Browser):
          </label>
          <input
            type="password"
            className="main-textarea"
            style={{ minHeight: 'unset', height: '42px', padding: '8px 12px', fontSize: '0.88rem' }}
            placeholder="AIzaSy..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', fontSize: '0.76rem', color: 'var(--text-dim)' }}>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--accent-cyan)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
          >
            <span>Get a free Gemini API key from Google AI Studio</span>
            <ExternalLink size={12} />
          </a>
        </div>

        {statusMsg && (
          <div style={{ background: 'rgba(6, 182, 212, 0.15)', border: '1px solid var(--accent-cyan)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', color: '#38bdf8', fontSize: '0.82rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={16} />
            <span>{statusMsg}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleClear}>
            Use Default Mock AI
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleSave}>
              Save Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
