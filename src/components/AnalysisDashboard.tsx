import { useState } from 'react';
import { 
  ShieldAlert, CheckCircle, HelpCircle, AlertTriangle, Copy, Check, Share2, 
  Download, Flame, MapPin, 
  Clock, Sparkles, Send, FileText, CornerDownRight, MessageSquare
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { AnalysisResult, OutputFormat, OutputLanguage } from '../types';

interface AnalysisDashboardProps {
  analysis: AnalysisResult;
  onAnswerQuestion: (questionId: string, answerText: string) => void;
  onOpenExplainability: () => void;
  onShowToast: (msg: string) => void;
  currentOutputTab?: OutputFormat;
  currentOutputLang?: OutputLanguage;
  onChangeOutputTab?: (tab: OutputFormat) => void;
  onChangeOutputLang?: (lang: OutputLanguage) => void;
}

export const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({
  analysis,
  onAnswerQuestion,
  onOpenExplainability,
  onShowToast,
  currentOutputTab,
  currentOutputLang,
  onChangeOutputTab,
  onChangeOutputLang
}) => {
  const [localTab, setLocalTab] = useState<OutputFormat>('complaint');
  const [localLang, setLocalLang] = useState<OutputLanguage>(
    analysis.detectedLanguage === 'Hindi' ? 'hi' : analysis.detectedLanguage === 'Hinglish' ? 'hinglish' : 'en'
  );

  const activeTab = currentOutputTab ?? localTab;
  const setActiveTab = (tab: OutputFormat) => {
    setLocalTab(tab);
    onChangeOutputTab?.(tab);
  };

  const outputLang = currentOutputLang ?? localLang;
  const setOutputLang = (lang: OutputLanguage) => {
    setLocalLang(lang);
    onChangeOutputLang?.(lang);
  };
  const [customAnswers, setCustomAnswers] = useState<{ [qId: string]: string }>({});
  const [copied, setCopied] = useState(false);

  // Trigger celebration confetti & copy with safe fallback
  const handleCopy = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
      onShowToast('Copied to clipboard successfully!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onShowToast('Could not access clipboard automatically. Please select and copy text.');
    }
  };

  // Web Share API
  const handleShare = async (title: string, text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text });
        onShowToast('Shared successfully!');
      } catch {
        // User cancelled or unsupported
      }
    } else {
      handleCopy(text);
    }
  };

  // Download output as text file
  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    onShowToast(`Downloaded ${filename}`);
  };

  // Determine current output text based on active tab & chosen output language
  const getCurrentOutput = () => {
    const ready = analysis.readyOutputs;
    switch (activeTab) {
      case 'complaint':
        return ready.complaint[outputLang] || ready.complaint.en;
      case 'whatsapp':
        return ready.whatsapp[outputLang] || ready.whatsapp.en;
      case 'email':
        const emailObj = ready.email;
        const body = emailObj[outputLang] || emailObj.en;
        return `SUBJECT: ${emailObj.subject}\n\n${body}`;
      case 'social':
        return ready.social[outputLang] || ready.social.en;
      case 'volunteer':
        return ready.volunteer[outputLang] || ready.volunteer.en;
      case 'emergency':
        if (!ready.emergency) return 'No emergency packet required for this situation.';
        return ready.emergency[outputLang] || ready.emergency.en;
      default:
        return ready.complaint.en;
    }
  };

  const getUrgencyClass = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'medium';
      default: return 'low';
    }
  };

  return (
    <div className="analysis-dashboard" id="analysis-results-section">
      {/* A. SITUATION SUMMARY */}
      <div className="summary-banner glass-card">
        <div className="summary-content">
          <div className="summary-badges">
            <span className="category-tag">{analysis.category}</span>
            <span className="lang-tag">Detected: {analysis.detectedLanguage}</span>
            <span className="timestamp-tag">{analysis.timestamp}</span>
          </div>

          <h2 className="summary-title">{analysis.title}</h2>
          <p className="summary-text">{analysis.summary}</p>

          <div style={{ display: 'flex', gap: '20px', marginTop: '14px', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={15} color="var(--accent-cyan)" />
              <span><strong>Time:</strong> {analysis.timeMentioned}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={15} color="var(--accent-violet)" />
              <span><strong>Location:</strong> {analysis.locationMentioned}</span>
            </div>
          </div>
        </div>

        {/* Signal Strength & Confidence Gauge */}
        <div className="signal-strength-gauge">
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>
            Signal Strength
          </div>
          <div className="signal-bars">
            <div className={`signal-bar ${analysis.overallConfidence >= 20 ? 'active' : ''}`} style={{ height: '8px' }}></div>
            <div className={`signal-bar ${analysis.overallConfidence >= 40 ? 'active' : ''}`} style={{ height: '12px' }}></div>
            <div className={`signal-bar ${analysis.overallConfidence >= 60 ? 'active' : ''}`} style={{ height: '16px' }}></div>
            <div className={`signal-bar ${analysis.overallConfidence >= 80 ? 'active' : ''}`} style={{ height: '20px' }}></div>
            <div className={`signal-bar ${analysis.overallConfidence >= 90 ? 'active' : ''}`} style={{ height: '24px' }}></div>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
            {analysis.overallConfidence}%
          </div>
          <button
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', fontSize: '0.74rem', padding: '4px 8px' }}
            onClick={onOpenExplainability}
            id="btn-why-result"
          >
            <HelpCircle size={12} />
            <span>Why this result?</span>
          </button>
        </div>
      </div>

      {/* TWO COLUMN GRID: EXTRACTED FACTS & RISK ASSESSMENT */}
      <div className="dashboard-grid">
        {/* B. EXTRACTED FACTS */}
        <div className="facts-card glass-card">
          <div className="card-title-row">
            <h3>
              <CheckCircle size={18} color="var(--status-verified)" />
              <span>Extracted Facts ({analysis.facts.length})</span>
            </h3>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>Multimodal Extraction</span>
          </div>

          <div className="facts-list">
            {analysis.facts.map((fact) => (
              <div key={fact.id} className="fact-item">
                <div className="fact-main">
                  <div className="fact-text">{fact.fact}</div>
                  <div className="fact-tags">
                    <span className="source-badge">
                      <span>Source: {fact.source}</span>
                    </span>
                    <span className={`status-indicator ${fact.status}`}>
                      {fact.status === 'verified' && <CheckCircle size={11} />}
                      {fact.status === 'likely' && <HelpCircle size={11} />}
                      {fact.status === 'uncertain' && <AlertTriangle size={11} />}
                      <span>{fact.status}</span>
                    </span>
                    {fact.note && <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>• {fact.note}</span>}
                  </div>
                </div>
                <div className="confidence-meter">{fact.confidence}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* C. RISK & URGENCY */}
        <div className="risk-card glass-card">
          <div className="urgency-header">
            <h3>
              <Flame size={18} color="#ef4444" />
              <span>Risk & Urgency Assessment</span>
            </h3>
            <div className={`urgency-badge ${getUrgencyClass(analysis.urgency.level)}`}>
              <ShieldAlert size={14} />
              <span>{analysis.urgency.level} Urgency ({analysis.urgency.score}/10)</span>
            </div>
          </div>

          <div className="risk-meta-item">
            <div className="risk-label">Why this urgency was assigned:</div>
            <div className="risk-val">{analysis.urgency.rationale}</div>
          </div>

          <div className="risk-meta-item">
            <div className="risk-label">Potentially Affected People:</div>
            <div className="risk-val" style={{ color: '#38bdf8', fontWeight: 600 }}>{analysis.urgency.affectedPeople}</div>
          </div>

          <div className="safety-instruction-box">
            <div style={{ fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={15} />
              <span>Immediate Safety Instruction:</span>
            </div>
            <div>{analysis.urgency.immediateSafetyInstruction}</div>
          </div>

          {analysis.urgency.disclaimer && (
            <div className="disclaimer-text">
              {analysis.urgency.disclaimer}
            </div>
          )}
        </div>
      </div>

      {/* G. VERIFICATION LEDGER — THE MAIN DIFFERENTIATOR */}
      <div className="ledger-section" id="verification-ledger">
        <div className="ledger-header">
          <div>
            <div className="ledger-tag">
              <Sparkles size={13} />
              <span>CORE ARCHITECTURAL DIFFERENTIATOR</span>
            </div>
            <h2 style={{ fontSize: '1.35rem', marginTop: '6px' }}>The Verification Ledger</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Separates verified facts from assumptions. Maps every claim to concrete evidentiary origin and resolution criteria.
            </p>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#38bdf8' }}>
            Claims Monitored: {analysis.verificationLedger.length}
          </div>
        </div>

        <div className="ledger-table-wrapper">
          <table className="ledger-table">
            <thead>
              <tr>
                <th style={{ width: '25%' }}>Claim</th>
                <th style={{ width: '28%' }}>Evidence Found</th>
                <th style={{ width: '12%' }}>Confidence</th>
                <th style={{ width: '23%' }}>What Would Verify It</th>
                <th style={{ width: '12%' }}>Source Class</th>
              </tr>
            </thead>
            <tbody>
              {analysis.verificationLedger.map((row) => (
                <tr key={row.id} className="ledger-row">
                  <td className="ledger-claim">{row.claim}</td>
                  <td className="ledger-evidence">{row.evidence}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '48px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${row.confidence}%`,
                            height: '100%',
                            background: row.confidence >= 80 ? 'var(--status-verified)' : row.confidence >= 60 ? 'var(--status-likely)' : 'var(--status-uncertain)'
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{row.confidence}%</span>
                    </div>
                  </td>
                  <td className="ledger-req">{row.verificationRequirement}</td>
                  <td>
                    <span className={`source-category-tag ${row.sourceCategory}`}>
                      {row.sourceCategory.replace('-', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* D. MISSING INFORMATION & INTERACTIVE CLARIFICATION MODE */}
      {analysis.missingQuestions.length > 0 && (
        <div className="clarification-card glass-card" id="clarification-panel">
          <div className="card-title-row">
            <div>
              <h3 style={{ color: '#fbbf24' }}>
                <HelpCircle size={18} />
                <span>Clarification Mode (At most 3 targeted questions)</span>
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                SignalSetu does not ask endlessly. Answering any item dynamically updates the verification ledger and complaint drafts!
              </p>
            </div>
            <span style={{ fontSize: '0.76rem', color: '#facc15', fontWeight: 600 }}>
              {analysis.missingQuestions.filter(q => q.answered).length} of {analysis.missingQuestions.length} Resolved
            </span>
          </div>

          <div style={{ marginTop: '14px' }}>
            {analysis.missingQuestions.map((q) => (
              <div key={q.id} className={`question-item ${q.answered ? 'answered' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div className="q-text">
                    {q.answered ? `✓ Answered: ${q.question}` : q.question}
                  </div>
                  {q.answered && (
                    <span style={{ fontSize: '0.74rem', color: 'var(--status-verified)', fontWeight: 700 }}>
                      Verified & Applied
                    </span>
                  )}
                </div>

                <div className="q-why">
                  <strong>Why needed:</strong> {q.whyNeeded}
                </div>

                {q.answered ? (
                  <div style={{ fontSize: '0.86rem', color: '#a7f3d0', background: 'rgba(16, 185, 129, 0.12)', padding: '6px 12px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle size={14} />
                    <span>Citizen clarified: “{q.userAnswer}”</span>
                  </div>
                ) : (
                  <div>
                    {q.suggestedAnswers && q.suggestedAnswers.length > 0 && (
                      <div className="suggested-chips">
                        {q.suggestedAnswers.map((suggestion, sIdx) => (
                          <button
                            key={sIdx}
                            className="chip-btn"
                            onClick={() => onAnswerQuestion(q.id, suggestion)}
                          >
                            <CornerDownRight size={12} />
                            <span>{suggestion}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="custom-answer-row">
                      <input
                        type="text"
                        className="custom-answer-input"
                        placeholder="Or write custom clarification..."
                        value={customAnswers[q.id] || ''}
                        onChange={(e) => setCustomAnswers({ ...customAnswers, [q.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && customAnswers[q.id]?.trim()) {
                            onAnswerQuestion(q.id, customAnswers[q.id].trim());
                          }
                        }}
                      />
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={!customAnswers[q.id]?.trim()}
                        onClick={() => {
                          if (customAnswers[q.id]?.trim()) {
                            onAnswerQuestion(q.id, customAnswers[q.id].trim());
                          }
                        }}
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TWO COLUMN GRID: ACTION PLAN & READY-TO-SHARE OUTPUTS */}
      <div className="dashboard-grid">
        {/* E. ACTION PLAN MATRIX */}
        <div className="action-plan-card glass-card">
          <div className="card-title-row">
            <h3>
              <Clock size={18} color="var(--accent-violet)" />
              <span>Time-Phased Action Plan</span>
            </h3>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>Priority Phasing</span>
          </div>

          <div className="action-timeline">
            {analysis.actionPlan.map((step, idx) => (
              <div key={step.id} className={`timeline-step ${step.priority === 'urgent' ? 'urgent' : ''}`}>
                <div className="step-marker">{idx + 1}</div>
                <div className="step-body">
                  <div className="step-meta">
                    <span className="timeframe-badge">{step.timeframe}</span>
                    <span className="entity-badge">{step.responsibleEntity}</span>
                  </div>
                  <div className="step-action-text">{step.action}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* F. READY-TO-SHARE OUTPUTS */}
        <div className="share-hub-card glass-card" id="ready-outputs-section">
          <div className="share-hub-header">
            <div>
              <h3>
                <Send size={18} color="var(--accent-cyan)" />
                <span>Ready-to-Share Outputs</span>
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Multi-channel communication packets compiled with official citations & draft status.
              </p>
            </div>

            {/* Language Switcher for Outputs */}
            <div className="language-selector">
              <button
                className={`lang-btn ${outputLang === 'en' ? 'active' : ''}`}
                onClick={() => setOutputLang('en')}
              >
                English
              </button>
              <button
                className={`lang-btn ${outputLang === 'hi' ? 'active' : ''}`}
                onClick={() => setOutputLang('hi')}
              >
                हिंदी
              </button>
              <button
                className={`lang-btn ${outputLang === 'hinglish' ? 'active' : ''}`}
                onClick={() => setOutputLang('hinglish')}
              >
                Hinglish
              </button>
            </div>
          </div>

          {/* Format Tabs */}
          <div className="output-tabs">
            <button
              className={`tab-btn ${activeTab === 'complaint' ? 'active' : ''}`}
              onClick={() => setActiveTab('complaint')}
            >
              <FileText size={15} />
              <span>Formal Complaint</span>
            </button>
            <button
              className={`tab-btn ${activeTab === 'whatsapp' ? 'active' : ''}`}
              onClick={() => setActiveTab('whatsapp')}
            >
              <MessageSquare size={15} />
              <span>WhatsApp Message</span>
            </button>
            <button
              className={`tab-btn ${activeTab === 'email' ? 'active' : ''}`}
              onClick={() => setActiveTab('email')}
            >
              <span>Email Draft</span>
            </button>
            <button
              className={`tab-btn ${activeTab === 'social' ? 'active' : ''}`}
              onClick={() => setActiveTab('social')}
            >
              <span>Social Post</span>
            </button>
            <button
              className={`tab-btn ${activeTab === 'volunteer' ? 'active' : ''}`}
              onClick={() => setActiveTab('volunteer')}
            >
              <span>Volunteer Brief</span>
            </button>
            {analysis.readyOutputs.emergency && (
              <button
                className={`tab-btn ${activeTab === 'emergency' ? 'active' : ''}`}
                onClick={() => setActiveTab('emergency')}
                style={{ borderColor: '#ef4444', color: '#fca5a5' }}
              >
                <span>Emergency Handoff</span>
              </button>
            )}
          </div>

          {/* Text Output Box */}
          <div className="output-preview-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.74rem', color: 'var(--text-dim)' }}>
              <span>DRAFT PREVIEW (UNSENT — READY FOR DISPATCH)</span>
              <span>{outputLang.toUpperCase()} FORMAT</span>
            </div>
            <div className="output-preview-text" id="output-rendered-text">
              {getCurrentOutput()}
            </div>
          </div>

          {/* Output Action Buttons */}
          <div className="output-preview-footer">
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleCopy(getCurrentOutput())}
                id="btn-copy-output"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
              </button>

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleShare(analysis.title, getCurrentOutput())}
                id="btn-share-output"
              >
                <Share2 size={14} />
                <span>Share</span>
              </button>

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleDownload(`SignalSetu_${analysis.category.replace(/\s+/g, '_')}_${activeTab}.txt`, getCurrentOutput())}
                id="btn-download-output"
              >
                <Download size={14} />
                <span>Download .txt</span>
              </button>
            </div>

            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              Ready for copy/paste into portals & chats
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
