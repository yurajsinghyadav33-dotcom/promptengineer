import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDistanceMeters, ProximityService } from './nearbyIncidentsService.ts';
import { GeminiActionCompiler, PRESET_SCENARIOS } from './geminiService.ts';

test('Haversine Distance Calculator', async (t) => {
  await t.test('calculates 0 meters for identical coordinates', () => {
    const dist = calculateDistanceMeters(28.6289, 77.0788, 28.6289, 77.0788);
    assert.equal(dist, 0);
  });

  await t.test('calculates accurate distance between Delhi coordinates (~5.8 km)', () => {
    // Delhi Connaught Place (28.6315, 77.2167) to India Gate (28.6129, 77.2295)
    const dist = calculateDistanceMeters(28.6315, 77.2167, 28.6129, 77.2295);
    // Real ground distance is ~2.4 km
    assert.ok(dist > 2000 && dist < 3000, `Expected ~2.4km, got ${dist}`);
  });
});

test('Proximity Engine Matching Thresholds', async (t) => {
  await t.test('detects exact incident match when within 50 meters', () => {
    // Streetlight preset is at 28.6289, 77.0788
    const match = ProximityService.findProximityMatch(28.62890, 77.07881, 500);
    assert.equal(match.matchType, 'exact');
    assert.ok(match.distanceMeters <= 50);
    assert.ok(match.incident);
    assert.ok(match.incident.title.includes('Streetlight'));
  });

  await t.test('detects nearby community incident when within 500 meters', () => {
    // ~200 meters away from 28.6289, 77.0788
    const match = ProximityService.findProximityMatch(28.6305, 77.0788, 500);
    assert.equal(match.matchType, 'nearby');
    assert.ok(match.distanceMeters > 50 && match.distanceMeters <= 500);
  });

  await t.test('returns none when coordinates are far away from all incidents', () => {
    // Coordinates in the Arabian Sea far from Indian incidents
    const match = ProximityService.findProximityMatch(10.0, 65.0, 500);
    assert.equal(match.matchType, 'none');
  });
});

test('GeminiActionCompiler Deterministic Local Compilation', async (t) => {
  await t.test('compiles preset streetlight scenario with complete action schema', async () => {
    const preset = PRESET_SCENARIOS[0];
    const result = await GeminiActionCompiler.analyze({
      text: preset.inputText,
      location: preset.location,
      images: [],
      documents: [],
      preferredLanguage: 'hinglish'
    }, preset.id);

    assert.ok(result.id);
    assert.equal(result.category, 'Civic Infrastructure');
    assert.ok(result.facts.length >= 3);
    assert.ok(result.actionPlan.length >= 3);
    assert.ok(result.readyOutputs.complaint);
    assert.ok(result.readyOutputs.whatsapp);
    assert.ok(result.verificationLedger.length >= 2);
    assert.ok(result.explainability.whyThisUrgency);
  });

  await t.test('compiles dynamic novel input without preset ID', async () => {
    const result = await GeminiActionCompiler.analyze({
      text: 'Water pipe burst on main road causing severe flooding and traffic jam',
      location: 'MG Road, Bengaluru',
      images: [],
      documents: [],
      preferredLanguage: 'en'
    });

    assert.ok(result.title);
    assert.ok(result.urgency.level);
    assert.ok(result.actionPlan.length > 0);
  });

  await t.test('updates analysis with user clarification and increments verified facts', async () => {
    const preset = PRESET_SCENARIOS[0];
    const initial = await GeminiActionCompiler.analyze({
      text: preset.inputText,
      location: preset.location,
      images: [],
      documents: [],
      preferredLanguage: 'hinglish'
    }, preset.id);

    const questionToAnswer = initial.missingQuestions[0];
    assert.ok(questionToAnswer, 'Expected at least one missing question');

    const updated = GeminiActionCompiler.updateWithClarification(
      initial,
      questionToAnswer.id,
      'Near Metro Pillar 140'
    );

    const answeredQ = updated.missingQuestions.find(q => q.id === questionToAnswer.id);
    assert.equal(answeredQ?.answered, true);
    assert.equal(answeredQ?.userAnswer, 'Near Metro Pillar 140');
    assert.ok(updated.overallConfidence >= initial.overallConfidence);
    assert.ok(updated.facts.some(f => f.fact.includes('Near Metro Pillar 140')));
  });
});
