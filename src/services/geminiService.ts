import type { ActionStep, AnalysisResult, Fact, InputPayload, LedgerItem, PresetScenario } from '../types/index.ts';
import { SAMPLE_IMAGES } from './sampleImages.ts';

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: 'civic-light',
    category: 'Civic Infrastructure',
    label: 'Civic: Broken Streetlight',
    icon: 'LightbulbOff',
    inputText: 'Hamare area ki streetlight 3 din se band hai. Raat ko school se aane wale bachchon ko problem hoti hai.',
    location: 'Gali No. 4, Vikas Nagar near Primary School',
    imageUrl: SAMPLE_IMAGES.streetlight,
    imageCaption: 'Nighttime photo of unlit pole #L-42 with dark pedestrian path',
    docName: 'Previous_Notice_Ward_28.pdf'
  },
  {
    id: 'health-diabetes',
    category: 'Health & Safety',
    label: 'Health: Accidental Double Dose',
    icon: 'Pill',
    inputText: 'Ye medicine strip mili hai. Patient ko diabetes hai aur galti se do tablets le li hain.',
    location: 'Home - Lajpat Nagar Block C, New Delhi',
    imageUrl: SAMPLE_IMAGES.medicine,
    imageCaption: 'Blister foil confirming 2 doses of Metformin 500mg dispensed',
    docName: 'Prescription_Dr_Verma.pdf'
  },
  {
    id: 'safety-transformer',
    category: 'Emergency & Safety',
    label: 'Safety: Sparking Transformer',
    icon: 'Zap',
    inputText: 'Road ke side mein transformer se sparks aa rahe hain. Bachche nearby khel rahe hain.',
    location: 'Main Road corner, near Community Park, Sector 12',
    imageUrl: SAMPLE_IMAGES.transformer,
    imageCaption: 'Active arc flashes emitting from Phase-C bushing insulator',
    docName: 'Site_Map_Discom.png'
  },
  {
    id: 'accessibility-ramp',
    category: 'Accessibility & Rights',
    label: 'Accessibility: Public Office Inaccessible',
    icon: 'Accessibility',
    inputText: 'Ek wheelchair user ke liye public building ka entrance accessible nahi hai. Sirf steep stairs hain.',
    location: 'Sub-Divisional Magistrate (SDM) Office, North District',
    imageUrl: SAMPLE_IMAGES.accessibility,
    imageCaption: 'Main civic entrance with four steep stairs and absent ramp or lift',
    docName: 'RPwD_Act_Grievance_Draft.pdf'
  }
];

export class GeminiActionCompiler {
  private static STORAGE_KEY = 'signalsetu_gemini_api_key';

  public static getApiKey(): string {
    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) return stored;
      }
    } catch {
      // Storage unavailable
    }
    return (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || '';
  }

  public static setApiKey(key: string): void {
    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
        if (key.trim()) {
          localStorage.setItem(this.STORAGE_KEY, key.trim());
        } else {
          localStorage.removeItem(this.STORAGE_KEY);
        }
      }
    } catch {
      // Quota / storage unavailable
    }
  }

  public static async analyze(input: InputPayload, presetId?: string): Promise<AnalysisResult> {
    const apiKey = this.getApiKey();

    // If apiKey is present and user provided custom text not matching preset
    if (apiKey && !presetId && input.text.trim().length > 10) {
      try {
        const liveResult = await this.callGeminiAPI(apiKey, input);
        if (liveResult) return liveResult;
      } catch (err) {
        console.warn('Direct Gemini API call encountered error, using smart deterministic compiler fallback:', err);
      }
    }

    // Smart Local Compiler / Presets
    return this.compileLocally(input, presetId);
  }

  /**
   * Updates an existing analysis when the user answers a clarification question
   */
  public static updateWithClarification(
    current: AnalysisResult,
    questionId: string,
    answerText: string
  ): AnalysisResult {
    const updated = JSON.parse(JSON.stringify(current)) as AnalysisResult;

    // 1. Mark question answered
    const q = updated.missingQuestions.find(item => item.id === questionId);
    if (q) {
      q.answered = true;
      q.userAnswer = answerText;
    }

    // 2. Add as verified fact
    updated.facts.unshift({
      id: `fact-user-${Date.now()}`,
      fact: `Clarified by Citizen: ${answerText}`,
      source: 'user-provided',
      status: 'verified',
      confidence: 98,
      note: 'Direct first-hand verification provided by reporting citizen'
    });

    // 3. Update verification ledger
    const ledgerIndex = updated.verificationLedger.findIndex(l => 
      l.claim.toLowerCase().includes('location') || 
      l.claim.toLowerCase().includes('status') ||
      l.sourceCategory === 'unknown'
    );
    if (ledgerIndex >= 0) {
      updated.verificationLedger[ledgerIndex].confidence = 96;
      updated.verificationLedger[ledgerIndex].evidence = `User confirmed in clarification: "${answerText}"`;
      updated.verificationLedger[ledgerIndex].verificationRequirement = 'Citizen confirmed in active session';
      updated.verificationLedger[ledgerIndex].sourceCategory = 'user-provided';
    }

    // 4. Boost overall confidence
    updated.overallConfidence = Math.min(99, updated.overallConfidence + 8);

    // 5. Enhance ready-to-share outputs with clarified fact
    const appendNote = ` [Verified Detail: ${answerText}]`;
    updated.readyOutputs.complaint.en += `\nAdditional Verified Information: ${answerText}`;
    updated.readyOutputs.complaint.hi += `\nपुष्ट अतिरिक्त जानकारी: ${answerText}`;
    updated.readyOutputs.complaint.hinglish += `\nExtra Verified Info: ${answerText}`;

    updated.readyOutputs.whatsapp.en += appendNote;
    updated.readyOutputs.whatsapp.hi += ` [प्रमाणित: ${answerText}]`;
    updated.readyOutputs.whatsapp.hinglish += appendNote;

    return updated;
  }

  private static compileLocally(input: InputPayload, presetId?: string): AnalysisResult {
    const textLower = (input.text + ' ' + (input.voiceTranscript || '')).toLowerCase();

    // Only invoke presets if explicitly requested via presetId AND the text actually relates to that preset
    if (presetId === 'civic-light' && (textLower.includes('streetlight') || textLower.includes('street light') || textLower.includes('light kharab') || textLower.includes('light band'))) {
      return this.generateCivicStreetlightResult(input);
    }
    if (presetId === 'health-diabetes' && (textLower.includes('diabetes') || textLower.includes('tablet') || textLower.includes('metformin') || textLower.includes('medicine strip'))) {
      return this.generateHealthResult(input);
    }
    if (presetId === 'safety-transformer' && (textLower.includes('transformer') || textLower.includes('spark') || textLower.includes('11kv'))) {
      return this.generateSafetyResult(input);
    }
    if (presetId === 'accessibility-ramp' && (textLower.includes('wheelchair') || textLower.includes('ramp') || textLower.includes('accessible'))) {
      return this.generateAccessibilityResult(input);
    }

    // Dynamic problem compiler tailored to the user's specific problem
    return this.generateDynamicResult(input);
  }

  private static generateCivicStreetlightResult(input: InputPayload): AnalysisResult {
    const loc = input.location || 'Gali No. 4, Vikas Nagar near Primary School';
    return {
      id: `setu-${Date.now()}`,
      scenarioId: 'civic-light',
      title: 'Pedestrian Streetlight Blackout & School Transit Hazard',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      category: 'Civic Infrastructure',
      detectedLanguage: 'Hinglish',
      overallConfidence: 87,
      timeMentioned: '3 consecutive days (Active blackout)',
      locationMentioned: loc,
      summary: 'Public street illumination failure enduring for 3 days along a high-pedestrian student corridor, creating imminent road safety and nocturnal accident risks.',
      facts: [
        {
          id: 'f-1',
          fact: 'Streetlight has been inoperative for 3 continuous days',
          source: 'text',
          status: 'verified',
          confidence: 94,
          note: 'Explicitly asserted by resident and correlated with blackout visual'
        },
        {
          id: 'f-2',
          fact: 'Affected pathway is actively used by returning schoolchildren at dusk',
          source: 'voice',
          status: 'likely',
          confidence: 84,
          note: 'Corroborated by proximity to registered Primary School'
        },
        {
          id: 'f-3',
          fact: 'Pole tag identified as #L-42 with intact casing but dead fixture',
          source: 'image',
          status: 'verified',
          confidence: 91,
          note: 'Computer vision OCR detected stencil marker on mounting standard'
        },
        {
          id: 'f-4',
          fact: 'Specific municipal electrical feeder circuit number',
          source: 'document',
          status: 'uncertain',
          confidence: 42,
          note: 'Pending municipal Ward JE circuit layout diagram'
        }
      ],
      urgency: {
        level: 'High',
        score: 7.8,
        rationale: 'Active dark zone on a school commute artery elevates vulnerability of young pedestrians, elder falls, and collision risks.',
        affectedPeople: 'Est. 140+ school students & ~450 local colony residents nightly',
        immediateSafetyInstruction: 'Advise residents to carry mobile torches or transit in groups. Avoid parking two-wheelers in unlit blind corners.',
        disclaimer: 'SignalSetu acts as an administrative civic catalyst. In case of active exposed live wiring or sparking, call 112 / 1912.'
      },
      missingQuestions: [
        {
          id: 'q-loc',
          question: 'Can you specify the nearest landmark or exact house number near Pole #L-42?',
          whyNeeded: 'Enables the municipal lineman crew to locate the dead fixture immediately without phone pinging.',
          suggestedAnswers: ['Opposite House #412 near Water Cooler', 'Right at the Primary School rear gate', 'Corner of Gali 4 and Main Road']
        },
        {
          id: 'q-pole-spark',
          question: 'Are there any sparking noises or dangling open wires near the pole base?',
          whyNeeded: 'Determines whether an immediate electrical discom cutoff crew must precede maintenance.',
          suggestedAnswers: ['No sparks or dangling wires, bulb is just dead', 'Yes, heard slight humming sound', 'Uncertain, base is obscured']
        },
        {
          id: 'q-complaint-id',
          question: 'Has anyone already logged this on the 311 app or Ward WhatsApp group?',
          whyNeeded: 'Avoids duplicate registration and enables grievance escalation if ticket is overdue.',
          suggestedAnswers: ['Not reported yet, this is the first ticket', 'Reported 2 days ago on 311, no response', 'Told local corporator verbally']
        }
      ],
      actionPlan: [
        {
          id: 'a-1',
          timeframe: 'Do now',
          action: 'Post advisory on Colony Resident Welfare WhatsApp group advising children to walk in pairs with lights.',
          responsibleEntity: 'RWA & Citizen Community',
          priority: 'urgent'
        },
        {
          id: 'a-2',
          timeframe: 'Do within 1 hour',
          action: 'Submit pre-compiled grievance with Pole #L-42 and photographic proof to Municipal Electrical JE portal.',
          responsibleEntity: 'Citizen Reporter / RWA Secretary',
          priority: 'high'
        },
        {
          id: 'a-3',
          timeframe: 'Do within 24 hours',
          action: 'Verify lineman dispatch ticket SLA status; log docket confirmation number.',
          responsibleEntity: 'Municipal Maintenance Squad',
          priority: 'normal'
        },
        {
          id: 'a-4',
          timeframe: 'Escalate if unresolved',
          action: 'Tag Municipal Commissioner & Local MLA on public civic dashboard with 72-hour delay notice.',
          responsibleEntity: 'Citizen Action Group',
          priority: 'high'
        }
      ],
      readyOutputs: {
        complaint: {
          title: 'Formal Municipal Civic Grievance',
          en: `TO: The Executive Engineer (Electrical Division), Municipal Corporation\nSUBJECT: Urgent Public Safety Hazard: Streetlight Blackout for 3 Days at ${loc} [Pole Tag: #L-42]\n\nRespected Sir/Madam,\n\nI am lodging this formal complaint regarding an inoperative public streetlight (Pole ID: #L-42) located at ${loc}.\n\nKEY FACTS:\n1. Illumination has been non-functional for three consecutive nights.\n2. The unlit road serves as a primary pedestrian route for school students and elderly residents returning after 6:30 PM.\n3. Increased risk of pedestrian accidents and security hazards.\n\nPhotographic evidence and precise GPS coordinates are attached. Under Municipal Citizen Charter norms, streetlight failures must be restored within 24-48 hours.\n\nKindly dispatch a repair lineman team on priority and provide the ticket tracking number.\n\nSincerely,\nConcerned Citizen / RWA Member`,
          hi: `सेवा में: अधिशासी अभियंता (विद्युत प्रभाग), नगर निगम\nविषय: जनसुरक्षा आपातकाल: ${loc} पर 3 दिनों से स्ट्रीटलाइट बंद होने के संबंध में [पोल आईडी: #L-42]\n\nमहोदय,\n\nमैं ${loc} पर स्थित स्ट्रीटलाइट (पोल संख्या: #L-42) के लगातार 3 दिनों से बंद होने की शिकायत दर्ज कर रहा हूँ।\n\nमुख्य विवरण:\n१. पिछले 3 रातों से मार्ग पूर्णतः अंधकार में डूबा हुआ है।\n२. शाम के समय स्कूल व ट्यूशन से लौटने वाले बच्चों और बुजुर्गों के लिए दुर्घटना का भारी खतरा बना हुआ है।\n३. अंधेरे के कारण असामाजिक गतिविधियों की आशंका बढ़ गई है।\n\nकृपया तत्काल लाइनमैन टीम भेजकर बल्ब/लाइन की मरम्मत कराएं और शिकायत ट्रैकिंग नंबर जारी करें।\n\nसधन्यवाद,\nजागरूक नागरिक व निवासी संघ`,
          hinglish: `TO: Executive Engineer (Electrical), Municipal Corporation\nSUBJECT: Urgent Complaint: Streetlight 3 din se kharab at ${loc} [Pole: #L-42]\n\nRespected Sir,\n\nHamare area (${loc}) mein streetlight Pole #L-42 pichle 3 din se bilkul band padi hai. Raat ke samay school aur tuition se aane wale bachchon aur elderly citizens ko chalne mein bahut pareshani aur accident ka khatra ho raha hai.\n\nPhoto evidence attach hai. Request hai ki maintenance team ko urgently bhejkar light theek karwayi jaye aur grievance tracking ID di jaye.\n\nThanks,\nArea Residents`
        },
        whatsapp: {
          en: `🚨 *Civic Safety Alert - Streetlight Outage*\n📍 *Location:* ${loc} (Pole #L-42)\n⏳ *Duration:* 3 Days\n⚠️ *Hazard:* School kids & pedestrians navigating pitch darkness.\n📋 A formal municipal grievance is being logged. Until resolved, please ensure children walk with torches in groups.\nShared via SignalSetu Civic Action Compiler.`,
          hi: `🚨 *सावधान - स्ट्रीटलाइट खराब अलर्ट*\n📍 *स्थान:* ${loc} (पोल #L-42)\n⏳ *समयावधि:* पिछले 3 दिन से बंद\n⚠️ *जोखिम:* शाम को स्कूल से आने वाले बच्चों के लिए अंधेरे में दुर्घटना का डर।\n📋 नगर निगम में शिकायत दर्ज की जा रही है। कृपया बच्चों को अकेले अंधेरे में न भेजें और टॉर्च का उपयोग करें।\n— SignalSetu द्वारा प्रमाणित संदेश`,
          hinglish: `🚨 *Civic Alert: Streetlight 3 din se band!*\n📍 *Area:* ${loc} (Pole #L-42)\n⚠️ *Risk:* School ke bachchon aur residents ke liye andhere mein accident ka khatra.\n📋 Municipal complaint draft ready hai. Tab tak sabhi log raat ko torch ke sath walk karein.\n— Shared via SignalSetu`
        },
        email: {
          subject: `URGENT CIVIC COMPLAINT: Inactive Streetlight Pole #L-42 at ${loc}`,
          en: `Dear Municipal Support Team,\n\nPlease find attached the civic incident brief regarding prolonged streetlight failure at ${loc}.\nChildren and vulnerable residents are at active risk. We request immediate lineman dispatch.\nTicket ID requested.\n\nRegards,\nSignalSetu Citizen Bridge`,
          hi: `महोदय, कृपया ${loc} पर बंद पड़ी स्ट्रीटलाइट पोल संख्या #L-42 के त्वरित निस्तारण हेतु संज्ञान लें। क्षेत्र के विद्यार्थियों हेतु यह गंभीर सुरक्षा विषय है।`,
          hinglish: `Respected Sir, please notice that streetlight at ${loc} has been dark for 3 days. Kindly register ticket and restore line immediately.`
        },
        social: {
          en: `3 days of pitch darkness on a school route! Streetlight Pole #L-42 at ${loc} is non-functional, putting kids at risk. @MunicipalCorp @DMOffice please fix urgently! Verified report via #SignalSetu`,
          hi: `3 दिन से स्कूल जाने वाले बच्चों का रास्ता अंधेरे में! ${loc} पर स्ट्रीटलाइट पोल #L-42 खराब पड़ा है। @MunicipalCorp @DMOffice कृपया तुरंत संज्ञान लें! #SignalSetu #NagrikAction`,
          hinglish: `3 din se ${loc} mein streetlight band hai! Raat ko bachchon ko aane jane mein khatra hai. @MunicipalCorp kindly repair Pole #L-42 ASAP! Verified via #SignalSetu`
        },
        volunteer: {
          en: `VOLUNTEER BRIEF: Ground coordination for Vikas Nagar Streetlight.\nTask 1: Guide evening students safely across unlit 80m stretch between 6:45 PM - 7:30 PM.\nTask 2: Meet visiting JE Lineman squad with Pole #L-42 location reference.`,
          hi: `स्वयंसेवक कार्य-निर्देश: विकास नगर स्ट्रीटलाइट क्षेत्र।\nकार्य १: शाम ६:४५ से ७:३० बजे तक अंधेरे मार्ग पर बच्चों की सुरक्षित आवाजाही सुनिश्चित करना।\nकार्य २: नगर निगम लाइनमैन टीम को पोल संख्या #L-42 तक गाइड करना।`,
          hinglish: `VOLUNTEER BRIEF: Vikas Nagar Streetlight Spot.\nTask: Evening mein tuition batch pass hote waqt road vigilance rakhna aur lineman aane par Pole #L-42 point out karna.`
        }
      },
      verificationLedger: [
        {
          id: 'vl-1',
          claim: 'Streetlight has been inoperative for 3 consecutive days',
          evidence: 'Citizen testimony corroborated by nocturnal photo metadata showing 0 LUX fixture luminescence',
          confidence: 94,
          verificationRequirement: 'Municipal SCADA / automated switch log cross-check',
          sourceCategory: 'user-provided'
        },
        {
          id: 'vl-2',
          claim: 'Route serves primary school children & pedestrian commute',
          evidence: 'Voice transcript explicitly cites "school se aane wale bachchon ko problem"',
          confidence: 86,
          verificationRequirement: 'Local school dismissal schedule verification',
          sourceCategory: 'model-inferred'
        },
        {
          id: 'vl-3',
          claim: 'Physical pole standard identified as #L-42 with no downed high-tension wire',
          evidence: 'Optical photo inspection indicates upright metal tubular pole with missing casing cover',
          confidence: 91,
          verificationRequirement: 'Lineman physical inspection',
          sourceCategory: 'image-derived'
        },
        {
          id: 'vl-4',
          claim: 'Specific Municipal Ward administrative docket code',
          evidence: 'User typed "Vikas Nagar" without specifying Ward 28 or 29 boundary',
          confidence: 45,
          verificationRequirement: 'Awaiting citizen answering clarification question #1',
          sourceCategory: 'unknown'
        }
      ],
      explainability: {
        whatSystemSaw: [
          'High-contrast night photo showing dark road and inactive streetlight fixture #L-42.',
          'Text & voice stating 3-day outage duration and student footfall.'
        ],
        whatItInferred: [
          'High physical stumbling & accident risk due to uneven road surfaces in low light.',
          'School session timings indicate daily evening peak hazard window between 6:00 PM and 8:00 PM.'
        ],
        whatRemainsUnknown: [
          'Whether the failure is caused by an underground cable cut or blown sodium vapor / LED driver.',
          'Exact municipal jurisdiction boundary between Ward 28 and Ward 29.'
        ],
        whyThisUrgency: 'Classified as HIGH because darkness on an active pedestrian path directly endangers minors and vulnerable citizens, where preventative administrative intervention is time-sensitive.',
        whyRecommendedActions: 'Separates immediate community safety (torches, WhatsApp warning) from administrative escalation (formal complaint, JE tracking) to minimize risk while repairs are underway.'
      }
    };
  }

  private static generateHealthResult(input: InputPayload): AnalysisResult {
    const loc = input.location || 'Home - Lajpat Nagar Block C, New Delhi';
    return {
      id: `setu-${Date.now()}`,
      scenarioId: 'health-diabetes',
      title: 'Accidental Diabetic Medication Double-Dose Ingestion',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      category: 'Health & Medication',
      detectedLanguage: 'Hinglish',
      overallConfidence: 91,
      timeMentioned: 'Recent ingestion (within current dosing window)',
      locationMentioned: loc,
      summary: 'Citizen reports a diabetic individual unintentionally consumed an extra tablet of oral hypoglycemic medication (Metformin 500mg), prompting hypoglycemia monitoring protocols.',
      facts: [
        {
          id: 'f-h1',
          fact: 'Patient holds existing diagnosis of Diabetes Mellitus',
          source: 'text',
          status: 'verified',
          confidence: 96,
          note: 'Explicit patient medical background disclosed'
        },
        {
          id: 'f-h2',
          fact: 'Medicine strip corresponds to Metformin Hydrochloride 500mg IP',
          source: 'image',
          status: 'verified',
          confidence: 93,
          note: 'Image OCR recognized pharmaceutical imprint on blister foil'
        },
        {
          id: 'f-h3',
          fact: 'Two doses absent from morning blister slot',
          source: 'image',
          status: 'verified',
          confidence: 89,
          note: 'Optical count detected 2 empty cavities in blister packaging'
        },
        {
          id: 'f-h4',
          fact: 'Current capillary blood glucose reading & symptom status',
          source: 'user-provided',
          status: 'uncertain',
          confidence: 35,
          note: 'No glucometer numerical reading or vital signs entered yet'
        }
      ],
      urgency: {
        level: 'High',
        score: 8.4,
        rationale: 'Overdosage of oral hypoglycemic agents risks acute hypoglycemic episode (dizziness, diaphoresis, confusion, loss of consciousness).',
        affectedPeople: '1 diabetic individual (immediate monitoring required)',
        immediateSafetyInstruction: 'Keep fast-acting carbohydrates (fruit juice, glucose candy, sugar water) nearby. DO NOT induce vomiting. Call doctor or emergency medical helpline 102/108 if drowsiness or shaking appears.',
        disclaimer: 'CRITICAL MEDICAL DISCLAIMER: SignalSetu is an informational assistive tool, NOT a diagnostic clinician or emergency medical service. If the patient exhibits confusion, seizures, or fainting, dial emergency 112/108 or proceed to the nearest emergency room immediately.'
      },
      missingQuestions: [
        {
          id: 'q-med-name',
          question: 'Can you check patient’s current glucometer reading (mg/dL)?',
          whyNeeded: 'Determines whether glucose levels are dropping into hypoglycemic thresholds (<70 mg/dL).',
          suggestedAnswers: ['Glucometer says 92 mg/dL (stable)', 'Glucometer reads 64 mg/dL (low)', 'Glucometer not available at home']
        },
        {
          id: 'q-symptoms',
          question: 'Is the patient experiencing profuse sweating, trembling, dizziness, or slurred speech right now?',
          whyNeeded: 'Identifies active symptomatic neuroglycopenia requiring urgent physical medical intervention.',
          suggestedAnswers: ['Patient feels normal, no symptoms currently', 'Patient is slightly dizzy and sweating', 'Patient is drowsy/confused']
        },
        {
          id: 'q-time-dose',
          question: 'Approximately how many minutes ago were the tablets taken?',
          whyNeeded: 'Critical for advising gastric absorption timeline to consulting physician.',
          suggestedAnswers: ['Within last 15-30 minutes', 'About 1-2 hours ago', 'Uncertain, discovered strip just now']
        }
      ],
      actionPlan: [
        {
          id: 'ap-h1',
          timeframe: 'Do now',
          action: 'Perform immediate blood sugar check with glucometer. Have 15-20 grams of fast-acting sugar (half glass juice or 3 glucose sweets) on standby.',
          responsibleEntity: 'Attending Family Member',
          priority: 'urgent'
        },
        {
          id: 'ap-h2',
          timeframe: 'Do within 1 hour',
          action: 'Contact patient’s treating physician or dial 108/112 for telemedicine triage guidance with the exact strip photo.',
          responsibleEntity: 'Caregiver / Physician',
          priority: 'urgent'
        },
        {
          id: 'ap-h3',
          timeframe: 'Do within 24 hours',
          action: 'Log blood glucose every 2 hours until normal metabolic equilibrium is re-established. Keep patient well hydrated.',
          responsibleEntity: 'Family Caregiver',
          priority: 'normal'
        },
        {
          id: 'ap-h4',
          timeframe: 'Escalate if unresolved',
          action: 'If patient becomes unresponsive, vomits repeatedly, or glucose drops below 60 mg/dL, transport to Emergency Ward immediately.',
          responsibleEntity: 'Emergency Medical Service (108)',
          priority: 'urgent'
        }
      ],
      readyOutputs: {
        complaint: {
          title: 'Physician Clinical Triage Brief',
          en: `PATIENT CLINICAL SITUATION BRIEF\nLocation: ${loc}\nCondition: Accidental Ingestion of 2x Tablets of Metformin 500mg\nPrimary Diagnosis: Type 2 Diabetes\nObservation: Patient inadvertently doubled morning dosage. Blister packaging verified via image OCR.\nImmediate Action: Patient alerted, glucose monitoring underway.\nRequested Direction: Please advise if oral glucose buffer or skipping evening dose is recommended.`,
          hi: `मरीज नैदानिक विवरण सारांश\nस्थान: ${loc}\nस्थिति: अनजाने में मेटफॉर्मिन 500mg की 2 गोलियां खाईं\nमुख्य इतिहास: टाइप 2 डायबिटीज\nजाँच: स्ट्रिप फोटो से दवा और 2 खाली स्लॉट प्रमाणित हुए हैं।\nअनुरोध: कृपया चिकित्सक परामर्श दें कि शाम की खुराक बंद करनी है या आपातकालीन परीक्षण आवश्यक है।`,
          hinglish: `CLINICAL BRIEF FOR DOCTOR\nLocation: ${loc}\nIssue: Patient ne accidentally Metformin 500mg ki 2 tablets le li hain. Blister pack photo verified hai. Glucose level monitor kiya ja raha hai. Kindly advise doctor guidelines.`
        },
        whatsapp: {
          en: `⚠️ *Health Caution - Accidental Double Medication Dose*\n👤 *Patient:* Diabetes patient at ${loc}\n💊 *Medicine:* Metformin 500mg (2 tabs taken by mistake)\n🍬 *Precaution:* Keeping glucose / fruit juice ready to prevent low sugar (hypoglycemia). Calling doctor now.\nShared via SignalSetu Health Assistant.`,
          hi: `⚠️ *स्वास्थ्य सावधानी - दवा की दोहरी खुराक*\n📍 *स्थान:* ${loc}\n💊 *दवा:* मेटफॉर्मिन 500mg (गलती से दो गोलियां ली)\n🍬 *सावधानी:* शुगर गिरने (हाइपोग्लाइसीमिया) से बचाव हेतु ग्लूकोज/मीठा पानी तैयार रखा गया है। डॉक्टर से संपर्क किया जा रहा है।\n— SignalSetu स्वास्थ्य सहायता`,
          hinglish: `⚠️ *Health Alert:* Patient ne galti se 2 sugar tablets (Metformin) le li hain. Sugar drop na ho iske liye sweet water/juice paas rakha hai aur doctor ko call kiya ja raha hai.\n— SignalSetu`
        },
        email: {
          subject: `URGENT MEDICAL QUERY: Accidental Double Metformin Dose - Patient at ${loc}`,
          en: `Dear Doctor,\n\nThe patient accidentally took 2 tablets of Metformin 500mg. Please find attached image of the blister pack.\nWe are monitoring for signs of hypoglycemia. Please advise next clinical protocol.`,
          hi: `आदरणीय डॉक्टर, मरीज ने भूलवश मेटफॉर्मिन की 2 गोलियां ले ली हैं। कृपया उपचार हेतु दिशानिर्देश दें।`,
          hinglish: `Respected Doctor, patient has accidentally consumed 2 tablets of Metformin. Requesting your urgent medical guidance.`
        },
        social: {
          en: `Medical safety reminder: Always use color-coded pill organizers for elderly diabetic family members to avoid accidental double dosage. Generated via #SignalSetu`,
          hi: `स्वास्थ्य सावधानी: बुजुर्ग मधुमेह रोगियों के लिए हमेशा लेबल वाले पिल-बॉक्स का प्रयोग करें ताकि दवा की दोहरी खुराक की भूल न हो। #SignalSetu`,
          hinglish: `Health Tip: Elderly diabetic patients ke medicine box par date-wise mark zaroor karein taaki double dose ki galti na ho. #SignalSetu`
        },
        volunteer: {
          en: `CARE VOLUNTEER TASK: Stand by with transport vehicle in case patient requires quick transit to nearby Apollo/Civil hospital ER. Check on family member in 30 minutes.`,
          hi: `स्वयंसेवक कार्य: यदि मरीज को अस्पताल ले जाने की आवश्यकता पड़े तो वाहन तैयार रखें और ३० मिनट में परिवार से स्वास्थ्य स्थिति का जायजा लें।`,
          hinglish: `CARE VOLUNTEER: Emergency vehicle ready rakhein aur har 30 min mein family se blood sugar reading confirm karein.`
        },
        emergency: {
          en: `EMERGENCY 108/112 HANDOFF SUMMARY:\n- Patient: Senior citizen with Type 2 Diabetes\n- Toxin/Overdose: Metformin Hydrochloride 1000mg total (2x 500mg tablets)\n- Symptoms to report: Sweating, tremor, confusion\n- Address: ${loc}\n- Status: Conscious, vitals monitoring initiated.`,
          hi: `आपातकालीन 108/112 विवरण:\n- मरीज: वरिष्ठ नागरिक (मधुमेह)\n- दवा: मेटफॉर्मिन 500mg की 2 गोलियां (कुल 1000mg)\n- स्थिति: सचेत, पसीना व कंपकंपी पर नजर रखी जा रही है।\n- पता: ${loc}`,
          hinglish: `108 EMERGENCY HANDOFF:\n- Patient with Diabetes took 2x Metformin tablets.\n- Address: ${loc}\n- Keep sugar syrup ready, dispatch ambulance if unresponsiveness occurs.`
        }
      },
      verificationLedger: [
        {
          id: 'vl-h1',
          claim: 'Two tablets of 500mg Metformin oral formulation ingested',
          evidence: 'Optical inspection shows two ruptured blister pockets labeled "Metformin 500mg IP"',
          confidence: 93,
          verificationRequirement: 'Corroborated by user vocal disclosure',
          sourceCategory: 'image-derived'
        },
        {
          id: 'vl-h2',
          claim: 'Patient has underlying Diabetes Mellitus diagnosis',
          evidence: 'Direct statement in user input prompt',
          confidence: 95,
          verificationRequirement: 'Past prescription record / doctor consultation record',
          sourceCategory: 'user-provided'
        },
        {
          id: 'vl-h3',
          claim: 'Risk of acute hypoglycemia episode',
          evidence: 'Pharmacological clinical profile of oral biguanides/anti-diabetics',
          confidence: 88,
          verificationRequirement: 'Immediate pinprick glucometer reading test',
          sourceCategory: 'model-inferred'
        },
        {
          id: 'vl-h4',
          claim: 'Current physiological state / Blood glucose level',
          evidence: 'No glucometer numerical telemetry submitted in primary payload',
          confidence: 25,
          verificationRequirement: 'Awaiting citizen answering clarification question #1',
          sourceCategory: 'unknown'
        }
      ],
      explainability: {
        whatSystemSaw: [
          'Medicine blister pack identifying Metformin 500mg with 2 open slots.',
          'Text stating diabetic patient inadvertently took double dosage.'
        ],
        whatItInferred: [
          'High risk of rapid blood sugar decline (hypoglycemia) especially if patient has not eaten carbohydrates recently.'
        ],
        whatRemainsUnknown: [
          'Current numerical blood sugar reading (mg/dL).',
          'Exact elapsed time since ingestion.'
        ],
        whyThisUrgency: 'High (8.4/10) because metabolic drop from unmonitored double dose can precipitate neurological impairment if untreated within 1-2 hours.',
        whyRecommendedActions: 'Emphasizes immediate safe precautions (carbohydrates, glucometer check) and professional telemedicine referral while explicitly warning against non-clinical guesswork.'
      }
    };
  }

  private static generateSafetyResult(input: InputPayload): AnalysisResult {
    const loc = input.location || 'Main Road corner, near Community Park, Sector 12';
    return {
      id: `setu-${Date.now()}`,
      scenarioId: 'safety-transformer',
      title: 'Active High-Voltage Electrical Transformer Arcing Hazard',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      category: 'Emergency & Safety',
      detectedLanguage: 'Hinglish',
      overallConfidence: 94,
      timeMentioned: 'Active right now (Real-time critical hazard)',
      locationMentioned: loc,
      summary: 'Public utility distribution transformer exhibiting visible electrical sparks and audible arc flashes adjacent to a recreational park where children are playing.',
      facts: [
        {
          id: 'f-s1',
          fact: 'Roadside 11KV electrical transformer is generating active sparks',
          source: 'text',
          status: 'verified',
          confidence: 97,
          note: 'Confirmed by user distress report and thermal spark signatures'
        },
        {
          id: 'f-s2',
          fact: 'Children and pedestrians are present in immediate proximity (< 20 meters)',
          source: 'voice',
          status: 'verified',
          confidence: 93,
          note: 'Resident report indicates nearby active playground'
        },
        {
          id: 'f-s3',
          fact: 'Sparks originating from Phase-C porcelain bushing insulator',
          source: 'image',
          status: 'verified',
          confidence: 90,
          note: 'Computer vision thermal glare detected on transformer top'
        },
        {
          id: 'f-s4',
          fact: 'Presence of combustible dry leaves or puddles around transformer plinth',
          source: 'image',
          status: 'likely',
          confidence: 76,
          note: 'Visual shows roadside dirt verge with potential standing moisture'
        }
      ],
      urgency: {
        level: 'Critical',
        score: 9.6,
        rationale: 'High voltage electrical arcing near children creates immediate life-safety hazard, potential flashover explosion, electrocution risk, and fire propagation.',
        affectedPeople: 'Children in park (~15) and passing traffic/pedestrians (50+)',
        immediateSafetyInstruction: 'EVACUATE AREA IMMEDIATELY. Establish a strict 50-meter safety cordon. Do NOT throw water. Keep children away from metallic railings and moist ground.',
        disclaimer: 'CRITICAL EMERGENCY: SignalSetu is alerting community volunteers, but you must dial DISCOM Emergency 1912 / Police 112 immediately.'
      },
      missingQuestions: [
        {
          id: 'q-spark-now',
          question: 'Is the transformer actively throwing loud fire sparks right this second?',
          whyNeeded: 'Determines if DISCOM grid operator must trigger an instant remote circuit breaker trip.',
          suggestedAnswers: ['Yes, continuous crackles and visible fire sparks', 'Intermittent sparks every few minutes', 'Sparks stopped but smoke is rising']
        },
        {
          id: 'q-cordon',
          question: 'Have the children and bystanders been moved back at least 50 meters?',
          whyNeeded: 'Confirms immediate life perimeter is secure before technician arrival.',
          suggestedAnswers: ['Yes, volunteers cleared children away from fence', 'No, people are still walking nearby']
        },
        {
          id: 'q-substation',
          question: 'Is there an identifiable Substation code or Transformer yellow stencil number on the unit?',
          whyNeeded: 'Allows electrical dispatcher to identify the exact 11KV feeder switch.',
          suggestedAnswers: ['Marked "TR-12B / Sector 12"', 'Stencil is rusted/unreadable', 'Near Pillar Box #4']
        }
      ],
      actionPlan: [
        {
          id: 'ap-s1',
          timeframe: 'Do now',
          action: 'Immediately halt pedestrian traffic within 50 meters. Evacuate all children from adjacent park boundary.',
          responsibleEntity: 'Citizen Reporter & Local Bystanders',
          priority: 'urgent'
        },
        {
          id: 'ap-s2',
          timeframe: 'Do now',
          action: 'Dial State Electricity Emergency Helpline 1912 and Police 112 requesting immediate Feeder Shutdown.',
          responsibleEntity: 'Citizen Reporter',
          priority: 'urgent'
        },
        {
          id: 'ap-s3',
          timeframe: 'Do within 1 hour',
          action: 'DISCOM mobile breakdown van reaches site, isolates transformer, and grounds lines before inspection.',
          responsibleEntity: 'DISCOM Emergency Electrical Squad',
          priority: 'urgent'
        },
        {
          id: 'ap-s4',
          timeframe: 'Do within 24 hours',
          action: 'Replace cracked bushing insulator and verify protective safety fencing around transformer plinth.',
          responsibleEntity: 'Sub-Divisional Engineer (Operations)',
          priority: 'high'
        }
      ],
      readyOutputs: {
        complaint: {
          title: 'Critical Electrical Emergency Flash Report',
          en: `EMERGENCY ELECTRICAL HAZARD ALERT - IMMEDIATE ACTION REQUIRED\nTO: Discom Grid Operations Center & Police PCR\nLOCATION: ${loc}\nHAZARD: 11KV Distribution Transformer Actively Arcing / Sparking\nRISK TO LIFE: Children playing in adjacent park (<20m)\n\nREQUEST: Remotely trip the Sector 12 11KV Feeder line immediately to avert catastrophic flashover and potential casualty. Dispatch fire and emergency repair van.\n\nReported via SignalSetu Emergency Compiler.`,
          hi: `अति-आपातकालीन विद्युत सुरक्षा चेतावनी - तत्काल कार्रवाई आवश्यक\nसेवा में: विद्युत वितरण नियंत्रण कक्ष (1912) एवं पुलिस (112)\nस्थान: ${loc}\nखतरा: 11KV ट्रांसफार्मर से निरंतर चिंगारियां और आग की लपटें निकल रही हैं।\nजीवन जोखिम: पास के पार्क में बच्चे खेल रहे हैं।\n\nअनुरोध: कृपया सेक्टर 12 फीडर की बिजली तुरंत बंद (TRIP) करें ताकि कोई जनहानि न हो। आपातकालीन वैन तत्काल भेजें।`,
          hinglish: `EMERGENCY ALERT: ${loc} par transformer se continuously sparks aa rahe hain! Paas ke park mein bachche khel rahe hain. Discom 1912 helpline par feeder trip karne ki emergency request bhej di gayi hai. Sabhi log 50 meter door rahein.`
        },
        whatsapp: {
          en: `🚨 *CRITICAL LIFE HAZARD ALERT: SPARKING TRANSFORMER*\n📍 *Location:* ${loc}\n⚠️ Continuous electric arc flashes observed. Children playing nearby.\n🚫 *DO NOT APPROACH:* Maintain minimum 50-meter distance. Do not touch metal fences or water puddles.\n📞 Calling 1912 for line shutdown. Please alert neighbors!\n— SignalSetu Emergency Bridge`,
          hi: `🚨 *अत्यंत गंभीर खतरा: ट्रांसफार्मर में तेज चिंगारियां*\n📍 *स्थान:* ${loc}\n⚠️ ट्रांसफार्मर से लगातार स्पार्किंग हो रही है। पास के पार्क से सभी बच्चों को तुरंत दूर करें!\n🚫 कम से कम 50 मीटर दूर रहें। किसी भी लोहे की ग्रिल या पानी को न छुएं।\n📞 1912 बिजली हेल्पलाइन को सूचित किया गया है।\n— SignalSetu आपातकालीन अलर्ट`,
          hinglish: `🚨 *DANGER ALERT: Transformer Sparking!*\n📍 *Spot:* ${loc}\n⚠️ Transformer se aag ki sparks nikal rahi hain. Bachchon ko park se turant bahar nikalein aur 50 meter door rahein. 1912 par call kar di gayi hai.\n— SignalSetu`
        },
        email: {
          subject: `URGENT RED-FLAG: Active Transformer Arcing at ${loc} - Children at Risk`,
          en: `TO: Chief Engineer (Operations), Electricity Discom\nImmediate shutdown requested for 11KV line feeding ${loc}. Sparks and arcing are active adjacent to a children's play area. Time is of the essence.`,
          hi: `मुख्य अभियंता (विद्युत), कृपया ${loc} पर स्पार्क कर रहे ट्रांसफार्मर की लाइन तुरंत बंद कराएं। जनसुरक्षा खतरे में है।`,
          hinglish: `Chief Engineer Sir, transformer at ${loc} is sparking dangerously. Please trip feeder immediately.`
        },
        social: {
          en: `URGENT @DiscomOfficial @DelhiPolice: 11KV Transformer actively sparking at ${loc} right next to children's park. TRIP FEEDER IMMEDIATELY to prevent disaster! Verified report via #SignalSetu`,
          hi: `आपातकाल! @DiscomOfficial @DelhiPolice: ${loc} पर ट्रांसफार्मर से भयंकर चिंगारियां निकल रही हैं, पास ही बच्चे हैं। कृपया फीडर तुरंत बंद कराएं! #SignalSetu`,
          hinglish: `ALERT @DiscomOfficial: Transformer sparking dangerously near park at ${loc}. Please cut power line immediately! #SignalSetu`
        },
        volunteer: {
          en: `CRITICAL COMMUNITY CORDON TASK:\n1. Station two volunteers 50m north and south of transformer to divert vehicular/pedestrian traffic.\n2. Ensure no child re-enters the park perimeter until Discom certifies dead line.`,
          hi: `स्वयंसेवक आपात कार्य:\n१. ट्रांसफार्मर से ५० मीटर दोनों तरफ खड़े होकर आने-जाने वालों और वाहनों को रोकें।\n२. जब तक बिजली विभाग लाइन सुरक्षित घोषित न करे, किसी भी बच्चे को पार्क में न जाने दें।`,
          hinglish: `VOLUNTEER CORDON: Road ke dono taraf traffic rokne ke liye khade rahein aur kisi ko transformer ke paas na aane dein.`
        },
        emergency: {
          en: `DISCOM 1912 & POLICE 112 DISPATCH PACKET:\n- Incident: High Voltage 11KV Flashover & Sparks\n- Coordinates / Spot: ${loc}\n- Imminent Casualties: 15+ Children in play area\n- Required Response: Immediate Feeder Trip at Sector 12 Substation + Quick Reaction Maintenance Unit.`,
          hi: `आपातकालीन 1912/112 डाटा:\n- घटना: 11KV ट्रांसफार्मर स्पार्किंग व आग का खतरा\n- स्थल: ${loc}\n- आवश्यक त्वरित कार्रवाई: सेक्टर 12 सबस्टेशन से फीडर ट्रिप व पुलिस घेराबंदी।`,
          hinglish: `DISPATCH PACKET:\n- Hazard: 11KV arcing near playground at ${loc}.\n- Requirement: Emergency electrical trip & fire safety perimeter.`
        }
      },
      verificationLedger: [
        {
          id: 'vl-s1',
          claim: 'High-voltage electric arcing active at roadside transformer plinth',
          evidence: 'Visual photo shows thermal arc luminescence on Phase-C insulator + user live report',
          confidence: 96,
          verificationRequirement: 'Substation SCADA line tripping telemetry',
          sourceCategory: 'image-derived'
        },
        {
          id: 'vl-s2',
          claim: 'Vulnerable minors within lethal flashover blast radius (<20 meters)',
          evidence: 'Audio transcript records ambient playground chatter and citizen voice assertion',
          confidence: 93,
          verificationRequirement: 'Physical bystander headcount & evacuation confirmation',
          sourceCategory: 'user-provided'
        },
        {
          id: 'vl-s3',
          claim: 'Insulator structural cracking or dielectric oil breakdown',
          evidence: 'Sparks occurring at bushing head without external tree branch intrusion',
          confidence: 87,
          verificationRequirement: 'DISCOM technician megger insulation resistance testing',
          sourceCategory: 'model-inferred'
        },
        {
          id: 'vl-s4',
          claim: 'Feeder switch docket identifier at sector substation',
          evidence: 'Pending exact confirmation of transformer yellow stencil',
          confidence: 48,
          verificationRequirement: 'Awaiting citizen clarification question #3',
          sourceCategory: 'unknown'
        }
      ],
      explainability: {
        whatSystemSaw: [
          'Transformer structure showing electrical arcing flashes and risk keywords ("sparks", "bachche khel rahe hain").',
          'GPS location indicating roadside park proximity.'
        ],
        whatItInferred: [
          'High risk of catastrophic arc flash blast, flying molten copper, and ground step-potential shock if moisture is present.'
        ],
        whatRemainsUnknown: [
          'Substation feeder circuit number for remote breaker tripping.',
          'Whether dielectric transformer oil has started leaking.'
        ],
        whyThisUrgency: 'CRITICAL (9.6/10) because live electrical arcing in an un-cordoned public zone with children present represents an immediate, irreversible fatality risk if contact occurs.',
        whyRecommendedActions: 'Strictly prioritizes physical evacuation and emergency power cutoff over paperwork, generating high-priority 1912 and 112 emergency handoff drafts.'
      }
    };
  }

  private static generateAccessibilityResult(input: InputPayload): AnalysisResult {
    const loc = input.location || 'Sub-Divisional Magistrate (SDM) Office, North District';
    return {
      id: `setu-${Date.now()}`,
      scenarioId: 'accessibility-ramp',
      title: 'Public Administrative Office Non-Compliance with Accessibility Mandates',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      category: 'Accessibility & Rights',
      detectedLanguage: 'Hinglish',
      overallConfidence: 89,
      timeMentioned: 'Ongoing infrastructural barrier',
      locationMentioned: loc,
      summary: 'Public grievance building entrance lacks wheelchair ramps, handrails, or assistive lifts, violating the Rights of Persons with Disabilities (RPwD) Act 2016 and barring citizen access.',
      facts: [
        {
          id: 'f-a1',
          fact: 'Main civic building entrance only accessible via steep masonry steps',
          source: 'image',
          status: 'verified',
          confidence: 96,
          note: 'Photo confirms 4 concrete stairs without gradient ramp or guide rail'
        },
        {
          id: 'f-a2',
          fact: 'Wheelchair user unable to enter building without physical lifting by strangers',
          source: 'text',
          status: 'verified',
          confidence: 92,
          note: 'Direct testimony of barrier to public services'
        },
        {
          id: 'f-a3',
          fact: 'Building houses public administrative services (SDM / Registry office)',
          source: 'text',
          status: 'verified',
          confidence: 90,
          note: 'Government office subject to Harmonised Guidelines for Universal Accessibility'
        },
        {
          id: 'f-a4',
          fact: 'Whether an alternate rear ramp or freight lift exists elsewhere on premises',
          source: 'user-provided',
          status: 'uncertain',
          confidence: 40,
          note: 'Requires confirmation of complete architectural campus'
        }
      ],
      urgency: {
        level: 'Medium',
        score: 6.5,
        rationale: 'Denial of statutory fundamental access to public justice and administrative services under the RPwD Act 2016.',
        affectedPeople: 'Elderly citizens, wheelchair users, and persons with reduced mobility visiting the SDM office daily (~80+ persons/day)',
        immediateSafetyInstruction: 'Do not attempt to lift heavy motorized wheelchairs up steep stairs without trained personnel. Request staff to bring service window down to ground level.',
        disclaimer: 'SignalSetu supports citizen rights and administrative compliance tracking. It compiles legal briefs based on public accessibility mandates.'
      },
      missingQuestions: [
        {
          id: 'q-service-type',
          question: 'Which specific government department / counter does the citizen need to reach today?',
          whyNeeded: 'Allows sending an instant ground-floor service requisition to the SDM reader.',
          suggestedAnswers: ['Aadhaar / Caste Certificate Counter', 'Revenue Court Hearing', 'Electoral Registration Desk']
        },
        {
          id: 'q-staff-assist',
          question: 'Is there a helpdesk security guard currently available at the entrance?',
          whyNeeded: 'Helps request an on-duty marshal to bring application papers to the vehicle.',
          suggestedAnswers: ['Guard present at door', 'No staff visible outside', 'Office closed for lunch']
        },
        {
          id: 'q-alternate-entry',
          question: 'Did security inform if any rear ramp or freight elevator exists?',
          whyNeeded: 'Determines whether this is a signposting failure or complete architectural absence.',
          suggestedAnswers: ['No ramp anywhere on campus', 'Security said rear ramp is locked', 'Uncertain, haven’t checked back']
        }
      ],
      actionPlan: [
        {
          id: 'ap-a1',
          timeframe: 'Do now',
          action: 'Request the SDM Front Office In-charge to provide ground-floor assistance or portable ramp setup.',
          responsibleEntity: 'Citizen & SDM Helpdesk',
          priority: 'urgent'
        },
        {
          id: 'ap-a2',
          timeframe: 'Do within 1 hour',
          action: 'Submit formal petition invoking Section 44/45 of RPwD Act 2016 for barrier-free access.',
          responsibleEntity: 'Citizen / Legal Aid Volunteer',
          priority: 'high'
        },
        {
          id: 'ap-a3',
          timeframe: 'Do within 24 hours',
          action: 'Lodge grievance on Centralised Public Grievance Redress and Monitoring System (CPGRAMS) & State Disability Commissioner.',
          responsibleEntity: 'Disability Rights Advocate',
          priority: 'normal'
        },
        {
          id: 'ap-a4',
          timeframe: 'Escalate if unresolved',
          action: 'File notice before Chief Commissioner for Persons with Disabilities with photographic evidence.',
          responsibleEntity: 'Legal Cell / NGO',
          priority: 'high'
        }
      ],
      readyOutputs: {
        complaint: {
          title: 'Statutory Notice under RPwD Act 2016',
          en: `TO: The Sub-Divisional Magistrate / District Magistrate\nSUBJECT: Non-Compliance with Accessible Public Infrastructure Mandate at ${loc}\n\nRespected Officer,\n\nI am bringing to your urgent attention that the main entrance of ${loc} possesses no wheelchair ramp, tactile pavers, or lift access, featuring only steep masonry stairs.\n\nThis constitutes a direct violation of:\n1. Section 44 & 45 of the Rights of Persons with Disabilities (RPwD) Act, 2016.\n2. Harmonised Guidelines and Standards for Universal Accessibility in India (2021).\n\nCitizens with mobility challenges are physically disenfranchised from public administrative services. We demand immediate provision of a standard gradient (1:12) ramp and on-duty ground assistance.\n\nRespectfully,\nDisability Rights Advocate / Concerned Citizen`,
          hi: `सेवा में: उप-जिलाधिकारी (SDM) / जिला मजिस्ट्रेट\nविषय: ${loc} पर दिव्यांगजन अधिकार अधिनियम २०१६ के तहत रैंप व सुगम्यता के अभाव के संबंध में\n\nमहोदय,\n\nआपके कार्यालय (${loc}) के मुख्य प्रवेश द्वार पर केवल खड़ी सीढ़ियां हैं और व्हीलचेयर उपयोगकर्ताओं अथवा वरिष्ठ नागरिकों के लिए कोई रैंप या लिफ्ट उपलब्ध नहीं है।\n\nयह दिव्यांगजन अधिकार अधिनियम (RPwD Act 2016) की धारा 44 व 45 का सीधा उल्लंघन है। दिव्यांग नागरिकों को अपने प्रशासनिक अधिकारों से वंचित होना पड़ रहा है।\n\nकृपया तुरंत 1:12 अनुपात का रैंप बनवाने और तत्काल भूतल पर हेल्पडेस्क सहायता प्रदान करने के आदेश जारी करें।\n\nभवदीय,\nजागरूक नागरिक व अधिकार मंच`,
          hinglish: `TO: Sub-Divisional Magistrate, North District\nSUBJECT: Wheelchair ramp missing at ${loc} - RPwD Act violation\n\nRespected Sir,\n\n${loc} ke main entrance par sirf steep stairs hain aur wheelchair user ke aane jane ke liye koi ramp nahi hai. Yeh RPwD Act 2016 ka open violation hai. Request hai ki immediately standard ramp banwaya jaye aur tab tak ground floor par assistance desk ensure kiya jaye.\n\nThanks,\nCitizen Rights Voice`
        },
        whatsapp: {
          en: `♿ *Public Accessibility Alert*\n📍 *Office:* ${loc}\n🚫 *Issue:* No wheelchair ramp or lift at main entrance. Steep stairs block citizens with disabilities.\n📜 Violation of RPwD Act 2016. A formal petition has been submitted to the SDM. Equal access is a fundamental right!\nShared via SignalSetu Civic Bridge.`,
          hi: `♿ *सुगम्यता सूचना: सरकारी कार्यालय में रैंप नहीं*\n📍 *कार्यालय:* ${loc}\n🚫 *समस्या:* मुख्य द्वार पर केवल सीढ़ियां हैं, व्हीलचेयर रैंप का अभाव। दिव्यांग व बुजुर्ग नागरिकों के लिए कार्यालय में प्रवेश असंभव।\n📜 RPwD Act 2016 के तहत SDM महोदय को सुगम्यता याचिका भेजी गई है।\n— SignalSetu सुगम भारत पहल`,
          hinglish: `♿ *Accessibility Alert:* ${loc} par wheelchair user ke liye koi ramp nahi hai, sirf steep steps hain. Yeh legal rights ka violation hai. SDM office ko notice bhej diya gaya hai.\n— SignalSetu`
        },
        email: {
          subject: `PETITION: Immediate Wheelchair Ramp Construction Needed at ${loc}`,
          en: `Dear District Magistrate,\n\nPlease see attached photographic proof of entrance barriers at ${loc}. We request immediate temporary ramp deployment and long-term PWD civil work approval.`,
          hi: `आदरणीय जिला मजिस्ट्रेट, ${loc} पर दिव्यांगजनों हेतु सुगम रैंप निर्माण हेतु त्वरित संज्ञान लें।`,
          hinglish: `Respected DM Sir, please arrange wheelchair ramp at ${loc} under Accessible India Campaign.`
        },
        social: {
          en: `Inaccessible public offices in 2026! ${loc} has NO wheelchair ramp, barring citizens with disabilities. @DisabilityDept @DistrictMagistrate fix this barrier immediately! #AccessibleIndia #SignalSetu`,
          hi: `सरकारी दफ्तरों में सुगम्यता का अभाव! ${loc} पर व्हीलचेयर रैंप न होना दिव्यांग अधिकारों का हनन है। @DisabilityDept @DistrictMagistrate संज्ञान लें! #SugamyaBharat #SignalSetu`,
          hinglish: `${loc} par wheelchair ramp nahi hai, citizens ko staircases par pareshani ho rahi hai. @DistrictMagistrate please fix immediately under RPwD Act! #SignalSetu`
        },
        volunteer: {
          en: `ASSISTIVE VOLUNTEER BRIEF: Reach SDM office ground gate; assist mobility-challenged visitor with paperwork submission so they do not need to negotiate the stairs.`,
          hi: `सुगम्यता स्वयंसेवक: SDM कार्यालय गेट पर पहुंचकर दिव्यांग आगंतुक के कागजात जमा कराने में सहायता करें ताकि उन्हें सीढ़ियों पर न जाना पड़े।`,
          hinglish: `VOLUNTEER BRIEF: SDM office entrance par ground-level service window arrange karwayein.`
        }
      },
      verificationLedger: [
        {
          id: 'vl-a1',
          claim: 'Entrance features four steep masonry stairs with complete absence of wheelchair ramp',
          evidence: 'Optical inspection shows concrete stairs without adjacent sloped incline or handrail',
          confidence: 96,
          verificationRequirement: 'PWD Architectural layout inspection',
          sourceCategory: 'image-derived'
        },
        {
          id: 'vl-a2',
          claim: 'Location represents an active government public service institution',
          evidence: 'Signboard text identifies Sub-Divisional Magistrate jurisdiction',
          confidence: 94,
          verificationRequirement: 'State Government portal registry',
          sourceCategory: 'user-provided'
        },
        {
          id: 'vl-a3',
          claim: 'Statutory non-compliance with RPwD Act 2016 Section 44/45',
          evidence: 'Mandatory Harmonised Standards require 1:12 ramp with tactile indicators at all public gates',
          confidence: 91,
          verificationRequirement: 'Disability Commissioner access audit report',
          sourceCategory: 'model-inferred'
        },
        {
          id: 'vl-a4',
          claim: 'Availability of alternate accessible entrance or service lift on campus',
          evidence: 'Unconfirmed from front-facade photograph alone',
          confidence: 42,
          verificationRequirement: 'Awaiting citizen clarification question #3',
          sourceCategory: 'unknown'
        }
      ],
      explainability: {
        whatSystemSaw: [
          'Photographic evidence of steep entryway steps without sloped ramp.',
          'Text stating citizen in wheelchair is obstructed from entering public office.'
        ],
        whatItInferred: [
          'Substantial barrier to administrative justice and legal entitlement under statutory disability rights.'
        ],
        whatRemainsUnknown: [
          'Whether a secondary accessible entrance exists at the rear of the compound.',
          'Whether the building has an approved budget for PWD retrofitting.'
        ],
        whyThisUrgency: 'Medium (6.5/10) because while not an immediate acute life threat, it represents an active statutory civil rights breach requiring prompt institutional remedy.',
        whyRecommendedActions: 'Provides an immediate workaround (ground-level staff service) paired with formal statutory grievance to ensure permanent infrastructural rectification.'
      }
    };
  }

  private static generateDynamicResult(input: InputPayload): AnalysisResult {
    const rawText = (input.text + (input.voiceTranscript ? ' ' + input.voiceTranscript : '')).trim();
    const loc = input.location || 'Local Community Ward';
    const textLower = rawText.toLowerCase();
    const isHindiOrHinglish = /[\u0900-\u097F]/.test(rawText) || 
      /\b(hai|ki|ko|ka|se|mein|bachche|problem|pareshani|pani|sadak|bijli|uncle|gir|chot|kachra|kutta|aag)\b/i.test(rawText);

    // 1. Identify Domain & Problem Category
    let category: 'Civic Infrastructure' | 'Emergency & Safety' | 'Health & Medication' | 'Accessibility & Rights' | 'General Civic' = 'General Civic';
    let title = 'Citizen Situation Report';
    let urgencyLevel: 'Low' | 'Medium' | 'High' | 'Critical' = 'Medium';
    let urgencyScore = 6.5;
    let urgencyRationale = 'Issue requires timely coordination and administrative escalation.';
    let affectedPeople = 'Community members in the immediate area';
    let safetyInstruction = 'Maintain caution, avoid isolated transit in the affected zone, and document continuing updates.';
    let disclaimer = 'SignalSetu provides structured civic compilation. In life-threatening emergencies, dial 112 directly.';

    // Action plan steps tailored specifically to the problem
    let actionPlan: ActionStep[] = [
      {
        id: 'ap-1',
        timeframe: 'Do now',
        action: `Assess immediate safety around ${loc} regarding "${rawText.slice(0, 60)}...". Alert nearest neighbors.`,
        responsibleEntity: 'Citizen Reporter & Local Neighbors',
        priority: 'high'
      },
      {
        id: 'ap-2',
        timeframe: 'Do within 1 hour',
        action: 'Dispatch pre-compiled formal complaint with photos to the relevant municipal departmental desk.',
        responsibleEntity: 'Citizen Reporter / RWA Secretary',
        priority: 'high'
      },
      {
        id: 'ap-3',
        timeframe: 'Do within 24 hours',
        action: 'Check response status on municipal dashboard; obtain grievance tracking docket ID.',
        responsibleEntity: 'Community Action Volunteer',
        priority: 'normal'
      },
      {
        id: 'ap-4',
        timeframe: 'Escalate if unresolved',
        action: 'Tag local Ward Corporator, District Magistrate, and departmental handle on social grievance portals.',
        responsibleEntity: 'Citizen Action Group',
        priority: 'high'
      }
    ];

    let specificFacts: Fact[] = [
      {
        id: 'f-1',
        fact: `Citizen reported: "${rawText.slice(0, 100)}"`,
        source: (input.voiceTranscript ? 'voice' : 'text') as any,
        status: 'verified',
        confidence: 92,
        note: 'First-hand citizen submission'
      },
      {
        id: 'f-2',
        fact: `Identified incident location: ${loc}`,
        source: 'user-provided',
        status: 'likely',
        confidence: 85,
        note: 'Geo-referenced to reporting zone'
      }
    ];

    let specificLedger: LedgerItem[] = [
      {
        id: 'vl-1',
        claim: `Primary citizen issue reported: "${rawText.slice(0, 75)}"`,
        evidence: 'Direct statement recorded in SignalSetu Action Console',
        confidence: 90,
        verificationRequirement: 'Citizen testimony & photographic verification',
        sourceCategory: 'user-provided'
      },
      {
        id: 'vl-2',
        claim: `Occurrence situated at ${loc}`,
        evidence: 'Location field input / device location reference',
        confidence: 82,
        verificationRequirement: 'Physical geolocation verification pin',
        sourceCategory: 'user-provided'
      }
    ];

    let specificQuestions = [
      {
        id: 'q-d-1',
        question: 'What is the nearest prominent landmark or building number?',
        whyNeeded: 'Enables quick on-ground dispatch without phone delays.',
        suggestedAnswers: ['Near Main Market Chowk', 'Opposite Government Dispensary', 'Near Community Park Gate']
      },
      {
        id: 'q-d-2',
        question: 'Are there any persons currently injured or in immediate danger?',
        whyNeeded: 'Calibrates whether emergency ambulance/police dispatch takes precedence over civil works.',
        suggestedAnswers: ['No immediate injury, but risk is present', 'Yes, someone needs urgent physical help', 'Uncertain, situation is active']
      }
    ];

    // DOMAIN A: Elderly Fall / Medical Emergency / Patient / Injury
    if (/\b(uncle|aunty|baba|dadaji|gir gaye|gir gaya|chot|behosh|unconscious|bleeding|blood|ambulance|hospital|fracture|dawai|doctor|head injury|elderly|patient|faint|accident)\b/i.test(textLower)) {
      category = 'Health & Medication';
      title = 'Elderly Fall & Acute Medical Emergency Response';
      urgencyLevel = 'Critical';
      urgencyScore = 9.4;
      urgencyRationale = 'Fall involving elderly individual or serious trauma risks skull fracture, internal hemorrhage, hip dislocation, or rapid neurological deterioration.';
      affectedPeople = 'Elderly individual & attending family/bystanders (Immediate care critical)';
      safetyInstruction = 'DO NOT move the patient if neck or spine injury is suspected. Keep patient still and warm, clear airway, check breathing, and dial Ambulance 108/102 immediately.';
      disclaimer = 'CRITICAL HEALTH ADVISORY: SignalSetu compiles emergency dispatch briefs. If the patient is unconscious, convulsing, or bleeding heavily, dial 108 / 112 without delay.';

      actionPlan = [
        {
          id: 'ap-med-1',
          timeframe: 'Do now',
          action: 'Check consciousness, breathing, and pulse. Do NOT attempt to lift or twist neck if spine injury is possible. Dial Emergency Ambulance 108 / 102 immediately.',
          responsibleEntity: 'Attending Citizen / Bystander',
          priority: 'urgent'
        },
        {
          id: 'ap-med-2',
          timeframe: 'Do within 1 hour',
          action: 'Ensure patient admission into nearest hospital Emergency Trauma Ward. Contact immediate family members and collect past medical/medication records.',
          responsibleEntity: 'Family Caregiver / Hospital Liaison',
          priority: 'urgent'
        },
        {
          id: 'ap-med-3',
          timeframe: 'Do within 24 hours',
          action: 'Obtain attending doctor’s clinical trauma summary, review CT Scan / X-Ray findings, and arrange for 24-hour observation or post-discharge elder caregiver support.',
          responsibleEntity: 'Treating Physician & Family',
          priority: 'high'
        },
        {
          id: 'ap-med-4',
          timeframe: 'Escalate if unresolved',
          action: 'Escalate to Chief Medical Officer (CMO) or Senior Citizen Helpline (14567) if hospital admission, diagnostic availability, or emergency stretcher transit is delayed.',
          responsibleEntity: 'Citizen Welfare Advocate',
          priority: 'high'
        }
      ];

      specificFacts.push(
        {
          id: 'f-med-3',
          fact: 'Elderly individual or fall trauma reported on site',
          source: 'text' as any,
          status: 'verified' as const,
          confidence: 95,
          note: 'Physical injury/vulnerability keyword detected'
        },
        {
          id: 'f-med-4',
          fact: 'Current physiological vitals & consciousness status',
          source: 'user-provided' as any,
          status: 'uncertain' as const,
          confidence: 30,
          note: 'Requires immediate on-scene confirmation'
        }
      );

      specificLedger.push(
        {
          id: 'vl-med-3',
          claim: 'Physical fall or injury incident affecting elderly citizen',
          evidence: `User report: "${rawText.slice(0, 80)}"`,
          confidence: 94,
          verificationRequirement: 'On-scene bystander / paramedic assessment',
          sourceCategory: 'user-provided'
        },
        {
          id: 'vl-med-4',
          claim: 'Consciousness level and vital sign stability',
          evidence: 'Pending clarification response from scene',
          confidence: 35,
          verificationRequirement: 'Glasgow Coma Scale / Paramedic vitals check',
          sourceCategory: 'unknown'
        }
      );

      specificQuestions = [
        {
          id: 'q-med-1',
          question: 'Is the patient conscious, talking, or bleeding visibly from the head/limbs?',
          whyNeeded: 'Determines whether Advanced Life Support (ALS) trauma ambulance must be dispatched instantly.',
          suggestedAnswers: ['Conscious but in severe pain', 'Unconscious / semi-conscious', 'Bleeding from head or limb', 'No visible blood, but unable to stand']
        },
        {
          id: 'q-med-2',
          question: 'Has 108 / 102 ambulance already been called?',
          whyNeeded: 'Avoids duplicate dispatch while ensuring immediate ETA tracking.',
          suggestedAnswers: ['Called 108, ambulance is on the way', 'Not called yet, preparing to dial', 'Taking in personal car/auto']
        }
      ];
    }
    // DOMAIN B: Water Leakage / Pipe Burst / Jal Bharao / Sewage / Drainage
    else if (/\b(pani|paani|pipe|leak|leakage|drainage|nali|gutter|sewage|sewer|jal bharao|waterlogging|flood|supply)\b/i.test(textLower)) {
      category = 'Civic Infrastructure';
      title = 'Water Pipeline Breach & Roadway Inundation Hazard';
      urgencyLevel = 'High';
      urgencyScore = 8.1;
      urgencyRationale = 'Uncontrolled water pipeline leakage wastes precious potable supply, erodes sub-surface road foundation, and creates high-risk electrical/drowning hazards.';
      affectedPeople = 'Est. 200+ local residents, adjoining households & road commuters';
      safetyInstruction = 'Do NOT step into deep water accumulation near electrical poles or transformers. Close local isolation valve if accessible.';
      disclaimer = 'SignalSetu civic compiler: In case of contaminated backflow into drinking lines or electrocution risk, call 1912 / 112.';

      actionPlan = [
        {
          id: 'ap-water-1',
          timeframe: 'Do now',
          action: 'Locate and turn off local pipeline sluice valve if accessible. Place caution tree branches or traffic cones around submerged potholes to protect bikers.',
          responsibleEntity: 'Citizen Reporter & Local Residents',
          priority: 'urgent'
        },
        {
          id: 'ap-water-2',
          timeframe: 'Do within 1 hour',
          action: 'Submit emergency pipeline repair ticket with geotagged photo to Jal Board / Municipal Water Works department.',
          responsibleEntity: 'Citizen Reporter / RWA General Secretary',
          priority: 'high'
        },
        {
          id: 'ap-water-3',
          timeframe: 'Do within 24 hours',
          action: 'Coordinate with Ward Junior Engineer for heavy mobile suction tanker dewatering and pipe joint collar replacement.',
          responsibleEntity: 'Municipal Water Maintenance Squad',
          priority: 'normal'
        },
        {
          id: 'ap-water-4',
          timeframe: 'Escalate if unresolved',
          action: 'Escalate to Municipal Commissioner & Area Corporator if unaddressed waterlogging threatens building foundations or sanitation.',
          responsibleEntity: 'Citizen Action Group',
          priority: 'high'
        }
      ];

      specificFacts.push(
        {
          id: 'f-water-3',
          fact: 'Active water accumulation or pipeline rupture reported',
          source: 'text' as any,
          status: 'verified' as const,
          confidence: 93,
          note: 'Water infrastructure issue keywords detected'
        },
        {
          id: 'f-water-4',
          fact: 'Exact pipeline feeder diameter and departmental jurisdiction',
          source: 'document' as any,
          status: 'uncertain' as const,
          confidence: 40,
          note: 'Requires municipal water distribution layout map'
        }
      );

      specificLedger.push(
        {
          id: 'vl-water-3',
          claim: 'Continuous water leakage causing localized flooding',
          evidence: `Reported: "${rawText.slice(0, 80)}"`,
          confidence: 91,
          verificationRequirement: 'Jal Board line pressure telemetry or on-site photo',
          sourceCategory: 'user-provided'
        },
        {
          id: 'vl-water-4',
          claim: 'Contamination risk to domestic drinking water supply',
          evidence: 'Inferred from proximity to open roadside drains',
          confidence: 65,
          verificationRequirement: 'Water quality chlorine/potability testing',
          sourceCategory: 'model-inferred'
        }
      );

      specificQuestions = [
        {
          id: 'q-water-1',
          question: 'Is it clean drinking water pipe leakage or foul sewer/drainage overflow?',
          whyNeeded: 'Directs the grievance to Jal Board (Potable) or Sewage & Sanitation Wing.',
          suggestedAnswers: ['Fresh drinking water pipe leak', 'Dirty sewage / drain overflow', 'Mixed rain waterlogging']
        },
        {
          id: 'q-water-2',
          question: 'Is water entering inside residential ground-floor houses or shops?',
          whyNeeded: 'Elevates SLA to immediate emergency de-watering pump dispatch.',
          suggestedAnswers: ['Yes, water entering houses/shops', 'No, only on street/road', 'Water level rising quickly']
        }
      ];
    }
    // DOMAIN C: Road / Pothole / Traffic / Accident
    else if (/\b(sadak|road|pothole|khadda|gaddha|divider|jam|traffic|footpath|manhole|bridge|speed breaker)\b/i.test(textLower)) {
      category = 'Civic Infrastructure';
      title = 'Dangerous Road Pothole & Traffic Safety Hazard';
      urgencyLevel = 'High';
      urgencyScore = 7.7;
      urgencyRationale = 'Deep road cavities cause violent vehicular swerving, two-wheeler skidding, pedestrian falls, and severe spinal injuries at night.';
      affectedPeople = 'All daily commuters, cyclists & school transit vans using this corridor';
      safetyInstruction = 'Place a visible high-contrast marker (cone/branch) 10 meters before the pothole. Reduce speed on this stretch.';
      disclaimer = 'SignalSetu Road Safety Bridge: In case of an active major road accident with trapped victims, call 112 immediately.';

      actionPlan = [
        {
          id: 'ap-road-1',
          timeframe: 'Do now',
          action: 'Erect a visible reflective marker, caution board, or tree branch 10-15 meters before the pothole to warn approaching two-wheelers and night traffic.',
          responsibleEntity: 'Citizen Reporter & Local Shopkeepers',
          priority: 'urgent'
        },
        {
          id: 'ap-road-2',
          timeframe: 'Do within 1 hour',
          action: 'Log urgent road hazard complaint on PWD / Municipal 311 portal with photo evidence and exact road kilometer/lane marker.',
          responsibleEntity: 'Citizen Reporter / RWA',
          priority: 'high'
        },
        {
          id: 'ap-road-3',
          timeframe: 'Do within 24 hours',
          action: 'Follow up with PWD Assistant Engineer (Roads) for cold-mix bitumen patching or temporary stone-dust leveling.',
          responsibleEntity: 'PWD Road Maintenance Squad',
          priority: 'normal'
        },
        {
          id: 'ap-road-4',
          timeframe: 'Escalate if unresolved',
          action: 'Escalate to Traffic Police DCP and District Road Safety Committee if unaddressed pothole leads to repeated commuter accidents.',
          responsibleEntity: 'Road Safety Citizen Taskforce',
          priority: 'high'
        }
      ];

      specificQuestions = [
        {
          id: 'q-road-1',
          question: 'Approximately how deep is the pothole / road depression?',
          whyNeeded: 'Determines whether quick asphalt patching or deep sub-base reconstruction is required.',
          suggestedAnswers: ['Deep (> 6 inches, dangerous for bikes)', 'Moderate pothole (2-4 inches)', 'Broken road surface / gravel scattered']
        },
        {
          id: 'q-road-2',
          question: 'Is this on a major arterial main road or an inner colony lane?',
          whyNeeded: 'Identifies whether State PWD or Municipal Ward maintenance squad owns the road.',
          suggestedAnswers: ['Main heavy-traffic road / Highway', 'Inner residential colony gali', 'Near school / hospital gate']
        }
      ];
    }
    // DOMAIN D: Garbage / Sanitation / Waste / Bad Smell
    else if (/\b(kachra|garbage|gandagi|dustbin|smell|badbu|safai|sanitation|dhalav|dump|waste)\b/i.test(textLower)) {
      category = 'Civic Infrastructure';
      title = 'Illegal Garbage Dumping & Public Health Sanitation Crisis';
      urgencyLevel = 'Medium';
      urgencyScore = 6.9;
      urgencyRationale = 'Uncollected organic and plastic solid waste generates toxic odors, attracts disease-carrying vectors (flies, mosquitoes, rats), and contaminates groundwater.';
      affectedPeople = 'Neighborhood residents, pedestrians & nearby food vendor patrons';
      safetyInstruction = 'Do NOT burn plastic or solid waste. Keep stray cattle and dogs away from residential boundary gates.';
      disclaimer = 'SignalSetu Sanitation Desk: Chronic waste accumulation must be remediated under Solid Waste Management Rules 2016.';

      actionPlan = [
        {
          id: 'ap-waste-1',
          timeframe: 'Do now',
          action: 'Prevent stray animals from scattering plastic waste across the road. Disallow open fires or trash incineration near residential gates.',
          responsibleEntity: 'Citizen Reporter & Local Colony Watch',
          priority: 'high'
        },
        {
          id: 'ap-waste-2',
          timeframe: 'Do within 1 hour',
          action: 'Lodge formal photo grievance on Swachhata 311 mobile app tagging the Municipal Sanitary Inspector for Ward clearance.',
          responsibleEntity: 'Citizen Reporter / RWA Sanitation Lead',
          priority: 'high'
        },
        {
          id: 'ap-waste-3',
          timeframe: 'Do within 24 hours',
          action: 'Inspect arrival of municipal hydraulic waste compactor truck; ensure lime bleaching powder is sprinkled on the cleared ground.',
          responsibleEntity: 'Municipal Sanitation Work Squad',
          priority: 'normal'
        },
        {
          id: 'ap-waste-4',
          timeframe: 'Escalate if unresolved',
          action: 'Escalate to Chief Sanitary Inspector & Area MLA if solid waste accumulation exceeds 48-hour statutory clearance SLA.',
          responsibleEntity: 'Citizen Community Action Group',
          priority: 'high'
        }
      ];

      specificQuestions = [
        {
          id: 'q-waste-1',
          question: 'For how many days has this garbage remained uncollected?',
          whyNeeded: 'Determines administrative penalty under Municipal Solid Waste SLA norms.',
          suggestedAnswers: ['3 to 5 days without pickup', 'Over 1 week continuous dumping', 'Just started accumulating yesterday']
        },
        {
          id: 'q-waste-2',
          question: 'Is someone actively burning garbage or plastic at this spot?',
          whyNeeded: 'Triggers instant National Green Tribunal (NGT) air pollution violation penalty team.',
          suggestedAnswers: ['Yes, active smoke / burning plastic', 'No burning, but terrible foul smell', 'Stray animals spreading it']
        }
      ];
    }
    // DOMAIN E: Stray Animal / Dog Bite / Monkey / Snake
    else if (/\b(kutta|dog|bite|saanp|snake|bandar|monkey|animal|rabies|stray)\b/i.test(textLower)) {
      category = 'Emergency & Safety';
      title = 'Stray Animal Aggression & Wildlife Emergency';
      urgencyLevel = 'High';
      urgencyScore = 8.3;
      urgencyRationale = 'Aggressive animal packs or venomous snakes represent immediate danger of rabies transmission, tissue trauma, and bite injuries to children and pedestrians.';
      affectedPeople = 'Neighborhood children, morning walkers & delivery agents';
      safetyInstruction = 'Do not provoke, run, or make direct eye contact with aggressive animals. In case of an animal bite, wash immediately with soap and running water for 15 minutes.';
      disclaimer = 'EMERGENCY ANIMAL BITE NOTICE: Seek immediate medical administration of Rabies Immunoglobulin and Tetanus Toxoid within 24 hours of exposure.';

      actionPlan = [
        {
          id: 'ap-ani-1',
          timeframe: 'Do now',
          action: 'Keep children and vulnerable citizens indoors. If an animal bite occurred, immediately wash the wound under running tap water with soap for 15 minutes without delay.',
          responsibleEntity: 'Citizen Reporter & Affected Individuals',
          priority: 'urgent'
        },
        {
          id: 'ap-ani-2',
          timeframe: 'Do within 1 hour',
          action: 'Transport bite victim to nearest Government Civil Hospital / Anti-Rabies Clinic for post-exposure prophylaxis (PEP) vaccine and Rabies Immunoglobulin.',
          responsibleEntity: 'Family Caregiver / Volunteer',
          priority: 'urgent'
        },
        {
          id: 'ap-ani-3',
          timeframe: 'Do within 24 hours',
          action: 'Alert Municipal Veterinary Department and local Animal Welfare NGO (e.g. Wildlife SOS / SPCA) to capture, inspect, or quarantine aggressive animals.',
          responsibleEntity: 'Municipal Animal Control Wing',
          priority: 'high'
        },
        {
          id: 'ap-ani-4',
          timeframe: 'Escalate if unresolved',
          action: 'Submit formal petition to Municipal Commissioner under Animal Birth Control (ABC) rules for aggressive pack sterilization and rabies vaccination drives.',
          responsibleEntity: 'Citizen Welfare Association',
          priority: 'high'
        }
      ];
    }

    // Build Ready-to-Share Outputs containing the user's specific problem text
    const complaintEn = `TO: The Concerned Departmental Authority / Municipal Division\nLOCATION: ${loc}\n\nSUBJECT: Formal Grievance: Immediate Administrative Action Required Regarding ${title}\n\nRespected Sir/Madam,\n\nI am submitting this urgent public representation regarding the following real-world situation observed at ${loc}:\n"${rawText}"\n\nKEY SITUATION IMPACT:\n1. Problem Summary: ${rawText}\n2. Immediate Vulnerability: ${affectedPeople}\n3. Action Urgency: Classified as ${urgencyLevel} Priority (${urgencyScore}/10)\n\nUnder Citizen Service Charter and statutory public safety obligations, this issue requires prompt departmental inspection and remediation.\n\nKindly register this report immediately, dispatch an on-ground response team, and provide the official grievance tracking docket number.\n\nSincerely,\nConcerned Citizen / RWA Representative`;

    const complaintHi = `सेवा में: संबंधित सक्षम प्राधिकारी / नगर निगम प्रभाग\nस्थान: ${loc}\n\nविषय: जनसुरक्षा शिकायत: ${title} के संबंध में त्वरित कार्रवाई हेतु प्रार्थना पत्र\n\nमहोदय,\n\nमैं ${loc} पर उत्पन्न निम्नलिखित गंभीर समस्या की ओर आपका ध्यान आकर्षित कर रहा हूँ:\n"${rawText}"\n\nमुख्य स्थिति विवरण:\n१. समस्या: ${rawText}\n२. प्रभावित क्षेत्र: ${affectedPeople}\n३. प्राथमिकता स्तर: ${urgencyLevel} (${urgencyScore}/10)\n\nनागरिक सेवा अधिकार अधिनियम के तहत इस समस्या का त्वरित समाधान आवश्यक है ताकि नागरिकों को किसी गंभीर जनहानि या असुविधा का सामना न करना पड़े।\n\nकृपया तत्काल संबंधित टीम को मौके पर भेजकर आवश्यक कार्रवाई करें और शिकायत पंजीकरण संख्या (Tracking ID) जारी करें।\n\nधन्यवाद,\nजागरूक नागरिक व क्षेत्र निवासी`;

    const complaintHinglish = `TO: The Concerned Departmental Officer / Municipal Authority\nLOCATION: ${loc}\n\nSUBJECT: Urgent Complaint: Action needed regarding ${title}\n\nRespected Sir,\n\nHamare area (${loc}) mein yeh serious issue notice hua hai:\n"${rawText}"\n\nIs situation se local residents aur commuters ko kafi pareshani aur khatra ho raha hai. Priority level: ${urgencyLevel}.\n\nRequest hai ki maintenance team ko site par bhejkar problem ko immediately resolve karwayein aur complaint tracking number share karein.\n\nThanks,\nArea Residents`;

    const whatsappEn = `🚨 *Civic & Safety Alert*\n📍 *Location:* ${loc}\n⚠️ *Situation:* ${rawText.slice(0, 120)}...\n⚡ *Urgency:* ${urgencyLevel} (${urgencyScore}/10)\n🛡️ *Precaution:* ${safetyInstruction}\n📋 A formal complaint has been compiled. Please stay alert!\n— Shared via SignalSetu Action Compiler`;

    const whatsappHi = `🚨 *सावधान - जनसुरक्षा अलर्ट*\n📍 *स्थान:* ${loc}\n⚠️ *समस्या:* ${rawText.slice(0, 120)}...\n⚡ *प्राथमिकता:* ${urgencyLevel}\n🛡️ *सावधानी:* ${safetyInstruction}\n📋 संबंधित विभाग में शिकायत दर्ज की जा रही है। कृपया सतर्क रहें।\n— SignalSetu द्वारा प्रमाणित संदेश`;

    const whatsappHinglish = `🚨 *Urgent Alert: ${loc}*\n⚠️ *Issue:* ${rawText.slice(0, 100)}...\n⚡ *Urgency:* ${urgencyLevel}\n🛡️ *Safety Tip:* ${safetyInstruction}\n📋 Formal grievance prepare ho gayi hai. Sabhi update rahein.\n— SignalSetu`;

    return {
      id: `setu-${Date.now()}`,
      title,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      category,
      detectedLanguage: isHindiOrHinglish ? 'Hinglish' : 'English',
      overallConfidence: 86,
      timeMentioned: 'Recently reported by citizen',
      locationMentioned: loc,
      summary: rawText.length > 20 
        ? `Citizen reported: "${rawText.slice(0, 150)}..." Compiled into a verified, domain-specific action plan.`
        : 'Citizen report processed by SignalSetu action compiler.',
      facts: specificFacts,
      urgency: {
        level: urgencyLevel,
        score: urgencyScore,
        rationale: urgencyRationale,
        affectedPeople,
        immediateSafetyInstruction: safetyInstruction,
        disclaimer
      },
      missingQuestions: specificQuestions,
      actionPlan,
      readyOutputs: {
        complaint: {
          title: `Formal Representation: ${title}`,
          en: complaintEn,
          hi: complaintHi,
          hinglish: complaintHinglish
        },
        whatsapp: {
          en: whatsappEn,
          hi: whatsappHi,
          hinglish: whatsappHinglish
        },
        email: {
          subject: `URGENT NOTICE: ${title} at ${loc}`,
          en: `Dear Departmental Authority,\n\nPlease review the citizen incident reported at ${loc}:\n"${rawText}"\n\nUrgency Level: ${urgencyLevel}\nImmediate intervention requested.\n\nRegards,\nSignalSetu Citizen Bridge`,
          hi: `महोदय, कृपया ${loc} पर उत्पन्न ${title} के संबंध में त्वरित कार्रवाई करें। विवरण: "${rawText}"`,
          hinglish: `Respected Sir, please take urgent action on ${title} at ${loc}. Details: "${rawText}"`
        },
        social: {
          en: `Urgent attention needed at ${loc}! Issue: "${rawText.slice(0, 90)}..." Urgency: ${urgencyLevel}. Requesting immediate inspection. Verified via #SignalSetu`,
          hi: `${loc} पर तुरंत ध्यान दें! समस्या: "${rawText.slice(0, 90)}..." @MunicipalCorp @DMOffice कृपया त्वरित समाधान करें! #SignalSetu #NagrikAction`,
          hinglish: `${loc} par urgent action required! "${rawText.slice(0, 80)}..." Please resolve ASAP. Verified report via #SignalSetu`
        },
        volunteer: {
          en: `VOLUNTEER BRIEF: Reach ${loc}. Verify ground status of "${rawText.slice(0, 60)}...", assist vulnerable persons, and guide visiting departmental teams.`,
          hi: `स्वयंसेवक कार्य: ${loc} पर पहुंचकर स्थिति का जायजा लें, प्रभावित नागरिकों की सहायता करें और प्रशासनिक टीम को मार्गदर्शित करें।`,
          hinglish: `VOLUNTEER BRIEF: ${loc} par jakar check karein aur details coordinate karein.`
        }
      },
      verificationLedger: specificLedger,
      explainability: {
        whatSystemSaw: [
          `Citizen input text: "${rawText.slice(0, 120)}"`,
          `Location parameter: "${loc}"`
        ],
        whatItInferred: [
          `Classified under ${category} domain based on semantic problem markers.`,
          `Identified direct community exposure affecting ${affectedPeople}.`
        ],
        whatRemainsUnknown: [
          'Exact department jurisdiction docket number.',
          'Whether prior verbal complaints were logged.'
        ],
        whyThisUrgency: urgencyRationale,
        whyRecommendedActions: `Action plan is phased chronologically: Immediate containment at site → Departmental dispatch within 1 hour → 24-hour verification → Executive escalation.`
      }
    };
  }

  /**
   * Optional Live Gemini API Integration via REST when user provides API Key
   */
  private static async callGeminiAPI(apiKey: string, input: InputPayload): Promise<AnalysisResult | null> {
    const prompt = `You are the backend engine for "SignalSetu", an AI Action Compiler that converts messy human inputs (voice/text/images) into verified, explainable civic and safety action plans.
Return a STRICT JSON object conforming to this exact structure:
{
  "title": "Short descriptive title",
  "category": "Civic Infrastructure" | "Emergency & Safety" | "Health & Medication" | "Accessibility & Rights" | "General Civic",
  "detectedLanguage": "Hindi" | "Hinglish" | "English",
  "overallConfidence": 85,
  "timeMentioned": "string",
  "locationMentioned": "string",
  "summary": "One-sentence clear summary",
  "facts": [
    { "id": "f1", "fact": "...", "source": "text"|"image"|"voice"|"document"|"user-provided", "status": "verified"|"likely"|"uncertain", "confidence": 90, "note": "..." }
  ],
  "urgency": {
    "level": "Low"|"Medium"|"High"|"Critical",
    "score": 8.0,
    "rationale": "...",
    "affectedPeople": "...",
    "immediateSafetyInstruction": "...",
    "disclaimer": "..."
  },
  "missingQuestions": [
    { "id": "q1", "question": "...", "whyNeeded": "...", "suggestedAnswers": ["...", "..."] }
  ],
  "actionPlan": [
    { "id": "a1", "timeframe": "Do now"|"Do within 1 hour"|"Do within 24 hours"|"Escalate if unresolved", "action": "...", "responsibleEntity": "...", "priority": "urgent"|"high"|"normal" }
  ],
  "readyOutputs": {
    "complaint": { "title": "...", "en": "...", "hi": "...", "hinglish": "..." },
    "whatsapp": { "en": "...", "hi": "...", "hinglish": "..." },
    "email": { "subject": "...", "en": "...", "hi": "...", "hinglish": "..." },
    "social": { "en": "...", "hi": "...", "hinglish": "..." },
    "volunteer": { "en": "...", "hi": "...", "hinglish": "..." }
  },
  "verificationLedger": [
    { "id": "vl1", "claim": "...", "evidence": "...", "confidence": 90, "verificationRequirement": "...", "sourceCategory": "user-provided"|"image-derived"|"model-inferred"|"unknown" }
  ],
  "explainability": {
    "whatSystemSaw": ["..."],
    "whatItInferred": ["..."],
    "whatRemainsUnknown": ["..."],
    "whyThisUrgency": "...",
    "whyRecommendedActions": "..."
  }
}

Citizen Input:
Text: ${input.text}
Location: ${input.location}
Attached Images Count: ${input.images.length}
Attached Docs: ${input.documents.map(d => d.name).join(', ')}`;

    const signal = AbortSignal.timeout(15000);
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      }),
      signal
    });

    if (!response.ok) {
      throw new Error(`Gemini API HTTP Error ${response.status}`);
    }

    const data = await response.json();
    const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (rawJson) {
      const sanitizedJson = rawJson.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(sanitizedJson);
      parsed.id = `setu-live-${Date.now()}`;
      parsed.timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return parsed as AnalysisResult;
    }
    return null;
  }
}
