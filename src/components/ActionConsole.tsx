import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Image as ImageIcon, FileText, MapPin, Sparkles, X, UploadCloud, AlertCircle, Compass } from 'lucide-react';
import type { InputPayload, OutputLanguage, PresetScenario, SpeechRecognitionInstance, SpeechRecognitionEventLike } from '../types';
import { PRESET_SCENARIOS } from '../services/geminiService';

interface ActionConsoleProps {
  inputPayload: InputPayload;
  onChangePayload: (updater: (prev: InputPayload) => InputPayload) => void;
  onAnalyze: (presetId?: string) => void;
  isLoading: boolean;
  onSelectPreset: (preset: PresetScenario) => void;
  activePresetId?: string;
  onOpenMap: () => void;
}

export const ActionConsole: React.FC<ActionConsoleProps> = ({
  inputPayload,
  onChangePayload,
  onAnalyze,
  isLoading,
  onSelectPreset,
  activePresetId,
  onOpenMap
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Unmount cleanup for speech recognition
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Web Speech API for Hindi & English Voice input
  const handleToggleVoice = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognitionConstructor = (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      // Graceful fallback simulation
      setIsRecording(true);
      setErrorMsg('Web Speech API not natively supported in this browser. Simulating voice transcription...');
      setTimeout(() => {
        onChangePayload(prev => ({
          ...prev,
          text: prev.text ? `${prev.text} [Voice Note]: Yahan streetlight teen din se band hai, bachchon ke liye khatra hai.` : 'Yahan streetlight teen din se band hai, bachchon ke liye khatra hai.',
          voiceTranscript: 'Yahan streetlight teen din se band hai, bachchon ke liye khatra hai.'
        }));
        setIsRecording(false);
        setErrorMsg(null);
      }, 2500);
      return;
    }

    try {
      const recognition = new SpeechRecognitionConstructor();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      // Set language according to selector
      recognition.lang = inputPayload.preferredLanguage === 'hi' ? 'hi-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsRecording(true);
        setErrorMsg(null);
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        const transcript = event.results[0][0].transcript;
        onChangePayload(prev => ({
          ...prev,
          text: prev.text ? `${prev.text} ${transcript}` : transcript,
          voiceTranscript: transcript
        }));
      };

      recognition.onerror = (e: { error?: string; message?: string }) => {
        console.warn('Speech recognition notice:', e);
        setIsRecording(false);
        setErrorMsg('Microphone access interrupted or unsupported in iframe. Simulated speech fallback ready.');
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch {
      setIsRecording(false);
      setErrorMsg('Could not start microphone.');
    }
  };

  // Image upload handling with size & type validation
  const handleImageFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMsg(null);

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    const maxSizeBytes = 5 * 1024 * 1024; // 5 MB

    Array.from(files).forEach(file => {
      if (!validTypes.includes(file.type)) {
        setErrorMsg(`Unsupported file type: "${file.name}". Please upload JPG, PNG, or WebP.`);
        return;
      }
      if (file.size > maxSizeBytes) {
        setErrorMsg(`File "${file.name}" exceeds 5MB limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const resultUrl = e.target?.result as string;
        onChangePayload(prev => ({
          ...prev,
          images: [
            ...prev.images,
            { id: `img-${Date.now()}-${Math.random()}`, name: file.name, url: resultUrl, size: file.size }
          ]
        }));
      };
      reader.onerror = () => {
        setErrorMsg(`Failed to read file "${file.name}". Please try another image.`);
      };
      reader.readAsDataURL(file);
    });
  };

  // Document upload handling with type and size validation
  const handleDocFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMsg(null);

    const validExtensions = ['.pdf', '.txt', '.doc', '.docx', '.csv', '.rtf'];
    const maxDocSizeBytes = 10 * 1024 * 1024; // 10MB limit

    Array.from(files).forEach(file => {
      const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
      const isExtValid = validExtensions.includes(ext);
      const isMimeValid = file.type && (file.type.includes('pdf') || file.type.includes('text') || file.type.includes('document') || file.type.includes('sheet'));

      if (!isExtValid && !isMimeValid) {
        setErrorMsg(`Unsupported document type: "${file.name}". Please upload PDF, TXT, or DOCX.`);
        return;
      }
      if (file.size > maxDocSizeBytes) {
        setErrorMsg(`Document "${file.name}" exceeds 10MB size limit.`);
        return;
      }

      onChangePayload(prev => ({
        ...prev,
        documents: [
          ...prev.documents,
          { id: `doc-${Date.now()}-${Math.random()}`, name: file.name, size: file.size }
        ]
      }));
    });
  };

  // Geolocation lookup
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      onChangePayload(prev => ({ ...prev, location: 'Vikas Nagar, Sector 4, New Delhi' }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = `${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E (Near Civic Ward)`;
        onChangePayload(prev => ({ ...prev, location: coords }));
      },
      () => {
        onChangePayload(prev => ({ ...prev, location: 'Vikas Nagar Sector 4, New Delhi' }));
      }
    );
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFiles(e.dataTransfer.files);
    }
  };

  return (
    <section className="console-section glass-card" id="action-console">
      <div className="console-header">
        <div className="console-title-group">
          <h2>
            <Sparkles size={20} color="var(--accent-cyan)" />
            <span>Action Console</span>
          </h2>
          <p>Provide unstructured voice, photos, documents, or text. SignalSetu will compile verified action.</p>
        </div>

        {/* Language selector */}
        <div className="language-selector" title="Output Language">
          {(['en', 'hi', 'hinglish'] as OutputLanguage[]).map(lang => (
            <button
              key={lang}
              className={`lang-btn ${inputPayload.preferredLanguage === lang ? 'active' : ''}`}
              onClick={() => onChangePayload(prev => ({ ...prev, preferredLanguage: lang }))}
              id={`lang-btn-${lang}`}
            >
              {lang === 'en' ? 'English' : lang === 'hi' ? 'हिंदी' : 'Hinglish'}
            </button>
          ))}
        </div>
      </div>

      {/* Preset Quick Chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontWeight: 600 }}>Quick Presets:</span>
        {PRESET_SCENARIOS.map(preset => (
          <button
            key={preset.id}
            className="chip-btn"
            style={{
              borderColor: activePresetId === preset.id ? 'var(--accent-cyan)' : undefined,
              background: activePresetId === preset.id ? 'rgba(6, 182, 212, 0.18)' : undefined
            }}
            onClick={() => onSelectPreset(preset)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Drag & Drop Main Input Area */}
      <div
        className="input-area-wrapper"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{
          border: dragActive ? '2px dashed var(--accent-cyan)' : undefined,
          borderRadius: 'var(--radius-sm)'
        }}
      >
        <textarea
          className="main-textarea"
          rows={4}
          maxLength={4000}
          aria-label="Citizen statement or incident description"
          value={inputPayload.text}
          onChange={(e) => onChangePayload(prev => ({ ...prev, text: e.target.value }))}
          placeholder="Speak or type what happened in Hindi, Hinglish, or English... (e.g. 'Hamare area ki streetlight 3 din se band hai, raat ko bachchon ko accident ka khatra hai')"
          id="input-text-area"
        />

        {dragActive && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(6, 182, 212, 0.15)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#ffffff', fontWeight: 600 }}>
            <UploadCloud size={24} />
            <span>Drop images here to attach</span>
          </div>
        )}
      </div>

      {/* Error message notification if any */}
      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontSize: '0.82rem', marginBottom: '12px' }}>
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Multimodal Attachments Previews */}
      {(inputPayload.images.length > 0 || inputPayload.documents.length > 0) && (
        <div className="attachments-tray">
          {inputPayload.images.map(img => (
            <div key={img.id} className="attachment-badge">
              <img src={img.url} alt={img.name} />
              <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.name}</span>
              <button
                className="remove-attach-btn"
                onClick={() => onChangePayload(prev => ({ ...prev, images: prev.images.filter(i => i.id !== img.id) }))}
                title="Remove photo"
              >
                <X size={14} />
              </button>
            </div>
          ))}

          {inputPayload.documents.map(doc => (
            <div key={doc.id} className="attachment-badge" style={{ borderColor: 'rgba(139, 92, 246, 0.4)', background: 'rgba(139, 92, 246, 0.15)', color: '#d8b4fe' }}>
              <FileText size={16} />
              <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
              <button
                className="remove-attach-btn"
                onClick={() => onChangePayload(prev => ({ ...prev, documents: prev.documents.filter(d => d.id !== doc.id) }))}
                title="Remove doc"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Multimodal Toolbar */}
      <div className="multimodal-toolbar">
        <div className="tool-buttons">
          {/* Voice Input */}
          <button
            className={`tool-btn ${isRecording ? 'recording' : ''}`}
            onClick={handleToggleVoice}
            id="btn-voice-input"
            type="button"
          >
            {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
            <span>{isRecording ? 'Listening (Speak now)...' : 'Voice Input (Hindi/EN)'}</span>
          </button>

          {/* Photo Upload */}
          <input
            type="file"
            ref={imageInputRef}
            onChange={(e) => handleImageFiles(e.target.files)}
            accept="image/*"
            multiple
            style={{ display: 'none' }}
          />
          <button
            className="tool-btn"
            onClick={() => imageInputRef.current?.click()}
            id="btn-upload-image"
            type="button"
          >
            <ImageIcon size={16} />
            <span>Attach Photo(s)</span>
          </button>

          {/* Document Upload */}
          <input
            type="file"
            ref={docInputRef}
            onChange={(e) => handleDocFiles(e.target.files)}
            accept=".pdf,.doc,.docx,.txt"
            style={{ display: 'none' }}
          />
          <button
            className="tool-btn"
            onClick={() => docInputRef.current?.click()}
            id="btn-upload-doc"
            type="button"
          >
            <FileText size={16} />
            <span>Document</span>
          </button>
        </div>

        <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
          Supports Voice • JPG/PNG/WebP • Docs
        </div>
      </div>

      {/* Location Bar */}
      <div className="location-row" style={{ flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '280px' }}>
          <MapPin size={18} color="var(--accent-violet)" />
          <input
            type="text"
            className="location-input"
            value={inputPayload.location}
            onChange={(e) => onChangePayload(prev => ({ ...prev, location: e.target.value }))}
            placeholder="Location (e.g. Gali No. 4, Vikas Nagar near Primary School)"
            id="input-location"
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onOpenMap}
            type="button"
            id="btn-open-map"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(6, 182, 212, 0.15)', borderColor: 'var(--accent-cyan)' }}
            title="Open India Map with 500m incident radar"
          >
            <Compass size={14} color="var(--accent-cyan)" />
            <span>India Map Radar</span>
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleDetectLocation}
            type="button"
            id="btn-detect-location"
          >
            Detect GPS
          </button>
        </div>
      </div>

      {/* Action CTA */}
      <div className="console-cta-row">
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          SignalSetu compiles: <strong>Extracted Facts → Verification → Risk → Action Plan → Multi-Channel Drafts</strong>
        </div>

        <button
          className="btn btn-primary"
          style={{ padding: '12px 28px', fontSize: '1rem', minWidth: '220px' }}
          onClick={() => onAnalyze(activePresetId)}
          disabled={isLoading || (!inputPayload.text.trim() && inputPayload.images.length === 0)}
          id="btn-compile-action"
        >
          <Sparkles size={18} />
          <span>{isLoading ? 'Compiling Action...' : 'Analyze Situation'}</span>
        </button>
      </div>
    </section>
  );
};
