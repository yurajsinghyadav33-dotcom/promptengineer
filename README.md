# SignalSetu (सिग्नलसेतु)
> **Turn real-world confusion into verified, explainable civic and safety action.**

SignalSetu is a Gemini-powered **Universal Action Compiler** that bridges messy human distress into structured, evidence-backed public actions. It acts not merely as a chatbot, but as an action compiler:
```
Messy Input (Voice / Hindi / Images / Docs)
                    ↓
             Extracted Facts
                    ↓
          Verification Ledger
                    ↓
              Risk & Urgency
                    ↓
           Time-Phased Actions
                    ↓
Multi-Channel Ready-to-Share Drafts (HI / EN / Hinglish)
```

---

## 🌟 Key Features

1. **Multimodal Input Engine**:
   - Natural voice input (Hindi & English Web Speech API with automatic simulation fallback).
   - Multi-photo upload with computer vision verification & OCR detection.
   - Document upload with validation.
2. **India Geospatial Incident Radar & Proximity Matching**:
   - Interactive OpenStreetMap India Map with live GPS location detection and reverse geocoding.
   - Configurable radar radius (`100m`, `500m`, `1km`, `5km`) using Haversine distance calculations.
   - Automatically compares detected coordinates against community reports:
     - **Exact Match (<50m)** / **Nearby Match (<500m)** / **Area Match (<5km)**.
   - Allows citizens to **1-click corroborate** existing reports (boosting community verification scores) or adopt/report new situations.

3. **The Verification Ledger (Signature Differentiator)**:
   - Maps every claim to concrete evidence.
   - Shows confidence percentages, evidentiary sources (`user-provided`, `image-derived`, `model-inferred`, `unknown`), and explicit criteria required for verification.

3. **Interactive Clarification Mode**:
   - Never overwhelms the user with endless questions.
   - Presents at most three prioritized, high-value questions.
   - Answering dynamically updates the analysis and verification ledger in-place **without restarting**.

4. **Multi-Format Ready-to-Share Output Hub**:
   - Formal administrative grievances (with Municipal / RPwD Act legal references).
   - WhatsApp community alerts.
   - Email drafts.
   - Public social posts (X / Twitter format).
   - Volunteer ground coordination briefs.
   - Emergency dispatch handoffs (108 / 112 / 1912).
   - Instant language switching between **English**, **हिंदी (Hindi)**, and **Hinglish**.
   - One-click copy with celebration confetti, Web Share API, and `.txt` download.

5. **90-Second Guided 1-Click Interactive Demo**:
   - Walks judges and audience through the entire workflow end-to-end in under 90 seconds.

6. **Responsible AI & Explainability ("Why this result?")**:
   - Audit trail detailing what the system saw, what it inferred, what remains unknown, why the urgency was chosen, and the rationale for the action plan.

7. **Zero-Config Offline Mock AI + Optional Live Gemini API**:
   - Runs out-of-the-box with deterministic mock scenarios (Civic, Health, Safety, Accessibility).
   - Seamlessly accepts a Google Gemini API Key (`gemini-1.5-flash`) for live arbitrary prompts.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation
```bash
# Clone or open project directory
cd prompt

# Install dependencies
npm install

# Start development server
npm run dev

# Run automated unit tests
npm test

# Run linter
npm run lint

# Build for production
npm run build
```

Open the development URL displayed in your terminal (or your production deployment domain) in your browser.

---

## 🔑 Gemini AI Configuration

SignalSetu includes an intelligent local compiler adapter, making it **100% functional without an API key**.

To enable live Google Gemini multimodal queries:
1. Click the **"Mock AI Mode"** or **"Gemini Live"** button in the top navbar.
2. Enter your Google Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
3. Click **"Save Key"**. The key is stored securely in browser `localStorage`.
4. Alternatively, create a `.env` file in the root:
   ```env
   VITE_GEMINI_API_KEY=AIzaSy...
   ```

---

## 📋 Preset Scenarios (Demo Ready)

| Scenario | Category | Input Language | Highlight |
|---|---|---|---|
| **A. Broken Streetlight** | Civic Infrastructure | Hinglish / Hindi | 3-day outage on school route, Pole #L-42 detected |
| **B. Accidental Double Dose** | Health & Safety | Hinglish | Diabetic patient took 2x Metformin; hypoglycemia precaution |
| **C. Sparking Transformer** | Emergency & Safety | Hinglish | Critical 11KV arcing near children's playground |
| **D. SDM Office Inaccessible** | Accessibility & Rights | Hinglish / Hindi | Steep stairs violating RPwD Act 2016; ramp petition |

---

## 🛡️ Safety & Responsible AI Notes

- **Emergency Protocol**: SignalSetu is an assistive compilation tool. For life-threatening incidents, active fire, live exposed conductors, or acute medical collapse, users are directed to contact official emergency helplines immediately (**112**, **108**, **1912**).
- **Medical Disclaimer**: The application does not provide clinical diagnoses or prescribe pharmaceuticals. It extracts reported symptoms to assist attending physicians and triage teams.
- **Privacy & Grounding**: No private citizen data is transmitted to third-party trackers. All session data persists in browser `localStorage` for continuity across page refreshes.

---

## 🎙️ Demo Pitch Line

> *"SignalSetu does not simply understand what a person says. It converts unclear human situations into evidence-backed, explainable actions."*
