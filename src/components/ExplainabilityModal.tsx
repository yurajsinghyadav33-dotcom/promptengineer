import { useEffect } from 'react';
import { X, HelpCircle, Eye, Brain, ShieldAlert, ListChecks } from 'lucide-react';
import type { ExplainabilityData } from '../types';

interface ExplainabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ExplainabilityData;
}

export const ExplainabilityModal: React.FC<ExplainabilityModalProps> = ({
  isOpen,
  onClose,
  data
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <HelpCircle size={20} />
            <span>Why This Result? (Explainability & Grounding)</span>
          </h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
          SignalSetu emphasizes responsible AI transparency. Below is the explicit audit trail showing sensory inputs, deductions, remaining ambiguities, and decision rationale without opaque internal chain-of-thought.
        </p>

        {/* 1. What the system saw */}
        <div className="explain-block">
          <div className="explain-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Eye size={14} />
            <span>1. What the System Saw (Direct Inputs & Evidentiary Signals)</span>
          </div>
          <ul className="explain-list">
            {data.whatSystemSaw.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>

        {/* 2. What it inferred */}
        <div className="explain-block">
          <div className="explain-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Brain size={14} />
            <span>2. What It Inferred (Contextual Deductions)</span>
          </div>
          <ul className="explain-list">
            {data.whatItInferred.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>

        {/* 3. What remains unknown */}
        <div className="explain-block">
          <div className="explain-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fb7185' }}>
            <HelpCircle size={14} />
            <span>3. What Remains Unknown (Uncertainty Boundaries)</span>
          </div>
          <ul className="explain-list">
            {data.whatRemainsUnknown.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>

        {/* 4. Why this urgency */}
        <div className="explain-block">
          <div className="explain-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldAlert size={14} />
            <span>4. Why This Urgency Classification Was Assigned</span>
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
            {data.whyThisUrgency}
          </p>
        </div>

        {/* 5. Why recommended actions */}
        <div className="explain-block">
          <div className="explain-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ListChecks size={14} />
            <span>5. Rationale for Action Plan Prioritization</span>
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
            {data.whyRecommendedActions}
          </p>
        </div>

        <div style={{ marginTop: '24px', textAlign: 'right' }}>
          <button className="btn btn-primary btn-sm" onClick={onClose}>
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
