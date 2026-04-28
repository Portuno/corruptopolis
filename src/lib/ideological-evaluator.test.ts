import assert from "node:assert/strict";
import test from "node:test";

import {
    NEUTRAL_EVAL_RESULT,
    parseIdeologicalEval,
} from "@/lib/ideological-evaluator";

test("parseIdeologicalEval accepts strict valid JSON payload", () => {
    const raw = JSON.stringify({
        clinical_analysis:
            "Message aligns with jobs concerns, boosts credibility, reduces distrust, and increases faction receptivity today.",
        modifier: 0.7342,
    });

    const parsed = parseIdeologicalEval(raw);
    assert.ok(parsed);
    assert.equal(parsed.clinicalAnalysis.split(/\s+/).length, 15);
    assert.equal(parsed.modifier, 0.734);
});

test("parseIdeologicalEval rejects outputs with extra keys", () => {
    const raw = JSON.stringify({
        clinical_analysis:
            "Message aligns with jobs concerns, boosts credibility, reduces distrust, and increases faction receptivity today.",
        modifier: 0.5,
        extra: "not allowed",
    });
    const parsed = parseIdeologicalEval(raw);
    assert.equal(parsed, null);
});

test("parseIdeologicalEval rejects non-15-word clinical analysis", () => {
    const raw = JSON.stringify({
        clinical_analysis:
            "Message aligns with jobs concerns, boosts credibility, and increases faction receptivity today.",
        modifier: 0.4,
    });
    const parsed = parseIdeologicalEval(raw);
    assert.equal(parsed, null);
});

test("parseIdeologicalEval clamps out-of-range modifier", () => {
    const raw = JSON.stringify({
        clinical_analysis:
            "Hostile tone triggers backlash, weak logic collapses trust, and faction identity rejects narrative influence immediately.",
        modifier: -3.2,
    });
    const parsed = parseIdeologicalEval(raw);
    assert.ok(parsed);
    assert.equal(parsed.modifier, -1);
});

test("parseIdeologicalEval supports fenced json responses", () => {
    const raw = `\`\`\`json
{
  "clinical_analysis": "Directive matches faction doctrine, lowers resistance, increases trust, and improves persuasive uptake under pressure.",
  "modifier": 0.62
}
\`\`\``;
    const parsed = parseIdeologicalEval(raw);
    assert.ok(parsed);
    assert.equal(parsed.modifier, 0.62);
});

test("neutral fallback payload is stable and contract-safe", () => {
    assert.equal(NEUTRAL_EVAL_RESULT.modifier, 0);
    assert.equal(
        NEUTRAL_EVAL_RESULT.clinicalAnalysis.split(/\s+/).length,
        15,
    );
});
