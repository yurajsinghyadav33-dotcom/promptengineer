import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDistanceMeters, ProximityService } from './nearbyIncidentsService.ts';
import { GeminiActionCompiler, PRESET_SCENARIOS } from './geminiService.ts';

test('Haversine Distance Calculator', async (t) => {
  await t.test('calculates 0 meters for identical coordinates', () => {
    const dist = calculateDistanceMeters(28.6289, 77.0788, 28.6289, 77.0788);
    assert.equal(dist, 0);
  });

  await t.test('calculates accurate distance between Delhi coordinates (~2.4 km)', () => {
    const dist = calculateDistanceMeters(28.6315, 77.2167, 28.6129, 77.2295);
    assert.ok(dist > 2000 && dist < 3000, `Expected ~2.4km, got ${dist}`);
  });

  await t.test('handles NaN or invalid coordinates gracefully with Infinity', () => {
    assert.equal(calculateDistanceMeters(NaN, 77.0, 28.0, 77.0), Infinity);
    assert.equal(calculateDistanceMeters(28.0, NaN, 28.0, 77.0), Infinity);
    assert.equal(calculateDistanceMeters(28.0, 77.0, NaN, 77.0), Infinity);
    assert.equal(calculateDistanceMeters(28.0, 77.0, 28.0, NaN), Infinity);
  });
});

test('Proximity Engine Matching Thresholds', async (t) => {
  await t.test('detects exact incident match when within 50 meters', () => {
    const match = ProximityService.findProximityMatch(28.62890, 77.07881, 500);
    assert.equal(match.matchType, 'exact');
    assert.ok(match.distanceMeters <= 50);
    assert.ok(match.incident);
    assert.ok(match.incident.title.includes('Streetlight'));
  });

  await t.test('detects nearby community incident when within 500 meters', () => {
    const match = ProximityService.findProximityMatch(28.6305, 77.0788, 500);
    assert.equal(match.matchType, 'nearby');
    assert.ok(match.distanceMeters > 50 && match.distanceMeters <= 500);
  });

  await t.test('detects area match when within 5000 meters but outside radius', () => {
    // ~1.8 km away from Sector 12 Dwarka (28.5823, 77.0500)
    const match = ProximityService.findProximityMatch(28.5950, 77.0500, 500);
    assert.equal(match.matchType, 'area');
    assert.ok(match.distanceMeters > 500 && match.distanceMeters <= 5000);
  });

  await t.test('returns none when coordinates are far away from all incidents', () => {
    const match = ProximityService.findProximityMatch(10.0, 65.0, 500);
    assert.equal(match.matchType, 'none');
    assert.equal(match.allNearby.length, 0);
  });

  await t.test('safely rejects out-of-bound or NaN latitude and longitude', () => {
    const invalidLat = ProximityService.findProximityMatch(95.0, 77.0);
    assert.equal(invalidLat.matchType, 'none');
    assert.equal(invalidLat.distanceMeters, Infinity);

    const invalidLng = ProximityService.findProximityMatch(28.0, 200.0);
    assert.equal(invalidLng.matchType, 'none');

    const nanMatch = ProximityService.findProximityMatch(NaN, NaN);
    assert.equal(nanMatch.matchType, 'none');
  });

  await t.test('corroborates existing incident by incrementing citizen verification count', () => {
    const initialList = ProximityService.getIncidents();
    const target = initialList[0];
    const initialCount = target.verificationsCount;

    const updated = ProximityService.corroborateIncident(target.id);
    assert.ok(updated);
    assert.equal(updated.verificationsCount, initialCount + 1);
  });

  await t.test('returns null when attempting to corroborate a non-existent incident', () => {
    const result = ProximityService.corroborateIncident('non-existent-incident-xyz');
    assert.equal(result, null);
  });

  await t.test('preserves immutability of incident data across reads', () => {
    const list1 = ProximityService.getIncidents();
    const list2 = ProximityService.getIncidents();
    assert.notEqual(list1, list2, 'getIncidents must return isolated array clones');
  });
});

test('GeminiActionCompiler Presets Full Coverage', async (t) => {
  await t.test('Preset A (Civic Streetlight): verifies facts, ledger, and civic action plan', async () => {
    const preset = PRESET_SCENARIOS[0];
    const result = await GeminiActionCompiler.analyze({
      text: preset.inputText,
      location: preset.location,
      images: [],
      documents: [],
      preferredLanguage: 'hinglish'
    }, preset.id);

    assert.equal(result.category, 'Civic Infrastructure');
    assert.equal(result.scenarioId, 'civic-light');
    assert.ok(result.facts.some(f => f.fact.includes('inoperative for 3 continuous days')));
    assert.ok(result.actionPlan.some(a => a.action.includes('Municipal Electrical JE portal') || a.action.includes('lineman')));
    assert.ok(result.missingQuestions.some(q => q.question.includes('311')));
    assert.ok(result.readyOutputs.complaint.hi.includes('नगर निगम'));
    assert.ok(result.verificationLedger.length >= 3);
  });

  await t.test('Preset B (Health Diabetes): verifies medical disclaimer and hypoglycemia safety instructions', async () => {
    const preset = PRESET_SCENARIOS[1];
    const result = await GeminiActionCompiler.analyze({
      text: preset.inputText,
      location: preset.location,
      images: [],
      documents: [],
      preferredLanguage: 'hinglish'
    }, preset.id);

    assert.equal(result.category, 'Health & Medication');
    assert.equal(result.urgency.level, 'High');
    assert.ok(result.urgency.immediateSafetyInstruction.includes('carbohydrates'));
    assert.ok(result.urgency.rationale.includes('hypoglycemic'));
    assert.ok(result.urgency.disclaimer?.includes('MEDICAL DISCLAIMER'));
    assert.ok(result.readyOutputs.emergency, 'Must include emergency dispatch packet for health emergency');
  });

  await t.test('Preset C (Safety Sparking Transformer): verifies 11KV critical safety cordon and 1912 emergency dispatch', async () => {
    const preset = PRESET_SCENARIOS[2];
    const result = await GeminiActionCompiler.analyze({
      text: preset.inputText,
      location: preset.location,
      images: [],
      documents: [],
      preferredLanguage: 'hinglish'
    }, preset.id);

    assert.equal(result.category, 'Emergency & Safety');
    assert.equal(result.urgency.level, 'Critical');
    assert.ok(result.urgency.immediateSafetyInstruction.includes('50-meter'));
    assert.ok(result.readyOutputs.emergency?.en.includes('1912'));
  });

  await t.test('Preset D (Accessibility RPwD Act): verifies statutory legal citation and barrier removal plan', async () => {
    const preset = PRESET_SCENARIOS[3];
    const result = await GeminiActionCompiler.analyze({
      text: preset.inputText,
      location: preset.location,
      images: [],
      documents: [],
      preferredLanguage: 'hinglish'
    }, preset.id);

    assert.equal(result.category, 'Accessibility & Rights');
    assert.ok(result.summary.includes('RPwD'));
    assert.ok(result.actionPlan.some(a => a.action.includes('RPwD Act') || a.action.includes('CPGRAMS')));
    assert.ok(result.facts.some(f => f.note?.includes('Harmonised Guidelines')));
    assert.ok(result.readyOutputs.complaint.en.includes('Rights of Persons with Disabilities'));
  });
});

test('Dynamic Novel Input & Edge Cases', async (t) => {
  await t.test('compiles dynamic novel input and generates domain-tailored outputs', async () => {
    const result = await GeminiActionCompiler.analyze({
      text: 'Water pipe burst on main road causing severe flooding and traffic jam',
      location: 'MG Road, Bengaluru',
      images: [],
      documents: [],
      preferredLanguage: 'en'
    });

    assert.ok(result.title);
    assert.equal(result.category, 'Civic Infrastructure');
    assert.ok(result.urgency.level);
    assert.ok(result.actionPlan.length > 0);
    assert.ok(result.readyOutputs.complaint.en.includes('MG Road, Bengaluru'));
    assert.ok(result.readyOutputs.whatsapp.en.includes('Civic & Safety Alert'));
  });

  await t.test('generates emergency dispatch packet for dynamic critical incidents', async () => {
    const result = await GeminiActionCompiler.analyze({
      text: 'LPG gas cylinder leakage smelling in apartment block with sparking meter board',
      location: 'Building 4, Sector 15',
      images: [],
      documents: [],
      preferredLanguage: 'en'
    });

    assert.equal(result.urgency.level, 'Critical');
    assert.ok(result.readyOutputs.emergency, 'Critical incidents must generate emergency packet');
    assert.ok(result.readyOutputs.emergency.en.includes('112'));
  });

  await t.test('handles pure Hindi Devanagari input and sets Hinglish language detection', async () => {
    const result = await GeminiActionCompiler.analyze({
      text: 'गली में आवारा कुत्तों का झुंड है और बच्चों पर हमला कर रहे हैं',
      location: 'रोहिणी सेक्टर ३, दिल्ली',
      images: [],
      documents: [],
      preferredLanguage: 'hi'
    });

    assert.equal(result.detectedLanguage, 'Hinglish');
    assert.ok(result.readyOutputs.complaint.hi);
    assert.ok(result.actionPlan.length >= 3);
  });

  await t.test('handles whitespace and minimal input without throwing errors', async () => {
    const result = await GeminiActionCompiler.analyze({
      text: '   pothole   ',
      location: 'Ring Road',
      images: [],
      documents: [],
      preferredLanguage: 'en'
    });

    assert.ok(result.id);
    assert.ok(result.title);
    assert.ok(result.actionPlan.length > 0);
  });
});

test('Clarification Question Answering & Verification Ledger Engine', async (t) => {
  await t.test('marks question answered, adds verified fact, and updates confidence', async () => {
    const preset = PRESET_SCENARIOS[0];
    const initial = await GeminiActionCompiler.analyze({
      text: preset.inputText,
      location: preset.location,
      images: [],
      documents: [],
      preferredLanguage: 'hinglish'
    }, preset.id);

    const questionToAnswer = initial.missingQuestions[0];
    const updated = GeminiActionCompiler.updateWithClarification(
      initial,
      questionToAnswer.id,
      'Near Metro Pillar 140 opposite Sharma Sweets'
    );

    const answeredQ = updated.missingQuestions.find(q => q.id === questionToAnswer.id);
    assert.equal(answeredQ?.answered, true);
    assert.equal(answeredQ?.userAnswer, 'Near Metro Pillar 140 opposite Sharma Sweets');
    assert.ok(updated.overallConfidence >= initial.overallConfidence);
    assert.ok(updated.overallConfidence <= 99, 'Confidence must not exceed 99');
    assert.ok(updated.facts.some(f => f.fact.includes('Metro Pillar 140')));
    assert.ok(updated.readyOutputs.complaint.en.includes('Metro Pillar 140'));
  });

  await t.test('handles clarification with non-existent question ID safely', async () => {
    const preset = PRESET_SCENARIOS[0];
    const initial = await GeminiActionCompiler.analyze({
      text: preset.inputText,
      location: preset.location,
      images: [],
      documents: [],
      preferredLanguage: 'hinglish'
    }, preset.id);

    const updated = GeminiActionCompiler.updateWithClarification(
      initial,
      'invalid-q-999',
      'Extra detail'
    );

    assert.ok(updated);
    assert.ok(updated.facts.some(f => f.fact.includes('Extra detail')));
  });
});

test('Security, Boundary Conditions & Resilience Suite', async (t) => {
  await t.test('handles API key setting, retrieval, and clearing securely in browser session', () => {
    GeminiActionCompiler.setApiKey('AIzaSyTestKey1234567890');
    assert.equal(GeminiActionCompiler.getApiKey(), 'AIzaSyTestKey1234567890');

    GeminiActionCompiler.setApiKey('');
    assert.equal(GeminiActionCompiler.getApiKey(), '');
  });

  await t.test('handles XSS and script payloads safely without throwing', async () => {
    const maliciousPayload = {
      text: '<script>alert("xss")</script><img src=x onerror=alert(1)> Broken manhole cover on footpath',
      location: '<b onmouseover=alert("pwn")>Connaught Place</b>',
      images: [],
      documents: [],
      preferredLanguage: 'en' as const
    };

    const result = await GeminiActionCompiler.analyze(maliciousPayload);
    assert.ok(result.id);
    assert.ok(result.title);
    assert.ok(result.readyOutputs.complaint.en.includes('Connaught Place'));
    assert.ok(result.actionPlan.length > 0);
  });

  await t.test('verifies all fact and ledger confidence scores are strictly bounded within [0, 100]', async () => {
    for (const preset of PRESET_SCENARIOS) {
      const result = await GeminiActionCompiler.analyze({
        text: preset.inputText,
        location: preset.location,
        images: [],
        documents: [],
        preferredLanguage: 'hinglish'
      }, preset.id);

      assert.ok(result.overallConfidence >= 0 && result.overallConfidence <= 100);

      for (const fact of result.facts) {
        assert.ok(fact.confidence >= 0 && fact.confidence <= 100, `Fact ${fact.id} confidence out of bounds: ${fact.confidence}`);
      }

      for (const item of result.verificationLedger) {
        assert.ok(item.confidence >= 0 && item.confidence <= 100, `Ledger ${item.id} confidence out of bounds: ${item.confidence}`);
      }
    }
  });

  await t.test('handles extreme input lengths (> 5,000 characters) gracefully without memory overflow', async () => {
    const longProblemText = 'Water pipeline burst leaking gallons of potable water onto the road. '.repeat(100);
    const result = await GeminiActionCompiler.analyze({
      text: longProblemText,
      location: 'Civil Lines, Delhi',
      images: [],
      documents: [],
      preferredLanguage: 'en'
    });

    assert.ok(result.id);
    assert.equal(result.category, 'Civic Infrastructure');
    assert.ok(result.summary.length <= 250, 'Summary must remain concise even with huge inputs');
    assert.ok(result.actionPlan.length > 0);
  });

  await t.test('guarantees pure immutability of original analysis object during clarification updates', async () => {
    const preset = PRESET_SCENARIOS[2];
    const initial = await GeminiActionCompiler.analyze({
      text: preset.inputText,
      location: preset.location,
      images: [],
      documents: [],
      preferredLanguage: 'hinglish'
    }, preset.id);

    const initialFactCount = initial.facts.length;
    const initialLedgerCount = initial.verificationLedger.length;
    const initialComplaintText = initial.readyOutputs.complaint.en;

    const updated = GeminiActionCompiler.updateWithClarification(
      initial,
      initial.missingQuestions[0].id,
      '50-meter safety tape cordoned off by local volunteers'
    );

    assert.notEqual(initial, updated, 'Updated analysis must be a separate object reference');
    assert.notEqual(initial.facts, updated.facts, 'Facts array must be cloned');
    assert.equal(initial.facts.length, initialFactCount, 'Original facts array must not be mutated in place');
    assert.equal(initial.verificationLedger.length, initialLedgerCount, 'Original ledger must remain untouched');
    assert.equal(initial.readyOutputs.complaint.en, initialComplaintText, 'Original complaint output must remain unmutated');
    assert.ok(updated.facts.length > initialFactCount);
  });
});
