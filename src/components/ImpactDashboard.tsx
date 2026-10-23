import { ShieldCheck, Flame, Send, Users, Clock, CheckCircle2, Info } from 'lucide-react';

export const ImpactDashboard: React.FC = () => {
  return (
    <section className="impact-banner glass-card" id="impact-section">
      <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={20} color="#06b6d4" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Civic & Safety Impact Telemetry</h3>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', color: '#fbbf24' }}>
          <Info size={12} />
          <span>Demo Simulated Metrics</span>
        </div>
      </div>

      <div className="impact-metric">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8' }}>
          <CheckCircle2 size={16} />
          <span className="metric-label">Reports Analyzed</span>
        </div>
        <span className="metric-val">1,482</span>
      </div>

      <div className="impact-metric">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171' }}>
          <Flame size={16} />
          <span className="metric-label">High Priority Flags</span>
        </div>
        <span className="metric-val">394</span>
      </div>

      <div className="impact-metric">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399' }}>
          <Send size={16} />
          <span className="metric-label">Issues Ready to Report</span>
        </div>
        <span className="metric-val">1,418</span>
      </div>

      <div className="impact-metric">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c084fc' }}>
          <Users size={16} />
          <span className="metric-label">Citizens Protected</span>
        </div>
        <span className="metric-val">18,400+</span>
      </div>

      <div className="impact-metric">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24' }}>
          <Clock size={16} />
          <span className="metric-label">Avg. Time Saved</span>
        </div>
        <span className="metric-val">3.4 hrs</span>
      </div>

      <div className="impact-metric">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#22d3ee' }}>
          <CheckCircle2 size={16} />
          <span className="metric-label">Uncertainties Resolved</span>
        </div>
        <span className="metric-val">1,120</span>
      </div>
    </section>
  );
};
