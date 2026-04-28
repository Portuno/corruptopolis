# Ideological Evaluator Contract

## Request

`POST /api/gemini` with:

```json
{
  "intent": "faction_message",
  "faction": "political | military | economic | religious | scientific | cultural",
  "message": "player discourse text",
  "clientKey": "optional user Gemini key"
}
```

## Response (faction_message)

```json
{
  "ok": true,
  "intent": "faction_message",
  "modifier": 0.384,
  "clinicalAnalysis": "Exactly fifteen words, normalized for deterministic game-side handling and transparent persuasion feedback loops.",
  "requestId": "..."
}
```

- `modifier` is clamped to `[-1.0, 1.0]` and rounded to 3 decimals.
- `clinicalAnalysis` is accepted only when it has exactly 15 words.
- If model output is malformed:
  - the API retries once with a schema-repair prompt,
  - then falls back to a neutral safe result (`modifier: 0.0`) if needed.

## Gameplay Integration

The evaluator does not apply board math directly. It only emits `modifier`.
Board progression stays in gameplay systems where `modifier * factionWeight(1..12)` shifts hex alignment.

## Crisis Response Compatibility

`intent: "crisis_response"` now uses the same strict ideological contract (`modifier` + `clinicalAnalysis`).
For compatibility with existing UI code, the API also includes:

- `alignmentModifier` (derived as `round(modifier * 20)`, clamped to `[-20, 20]`)
- `eval` (alias of `clinicalAnalysis`)
