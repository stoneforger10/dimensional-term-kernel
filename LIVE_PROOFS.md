# Verified StudioNet proof matrix

[Contract](https://explorer-studio.genlayer.com/address/0xb16Ad7429d03f73A71B765D640f84B68af3e6c22) · [Matching source](https://github.com/stoneforger10/dimensional-term-kernel/blob/main/contracts/DimensionalTermKernel.py) · [Sanitized journal](PROOFS.json).

Chain 61999. Source SHA-256: `09ae498077b965ebd04ab39fcf1ef5864608573df214e23a698190dcd9d05f8d`. Published fixture revision: `afd4240ea55d03cb712cb6f76c960ea96e40d4bf`. One dedicated encrypted test signer operated this demonstration; validator independence is not inferred from the signer's identity. Sources define fictional units, not empirical measurements.

## Proof matrix

| Requirement | Evidence | Verified consequence |
|---|---|---|
| Material AI interpretation | interpret-ready; record-speed | Exact inferred SPAN/BEAT dimensions and scales yield speed 1/160 RATE |
| Absolute point versus difference | record-point-shift; record-point-difference | Point + interval yields 5963/20 COLD; point - point yields 10 DELTA |
| Type safety | dimension-mismatch; point-addition | Both expected ERROR; no calculation stored |
| Context and identity binding | root-substitution; calculation-replay; creator-nonce-replay | Exact-input/result record cannot be substituted or overwritten |
| Full evidence integrity | interpret-bad-hash; held-definitions | HASH_MISMATCH holds the unit environment; arithmetic blocked |
| Agreed uncertainty | interpret-ambiguous | Both undefined factors independently normalize to UNKNOWN; environment HELD |
| No model resampling | module-resampling | Same definition set cannot be reinterpreted under a fresh nonce |
| Immutable history and exact math | verify-live.mjs; reference.mjs | Rehashed every source/report/calculation and compared live results with independent BigInt arithmetic |
| Validator disagreement | Local callback test only | A valid-shaped but materially substituted factor is independently rejected; no live disagreement claimed |

## Environments

| Input | State | Source acquisition | Module root |
|---|---|---|---|
| ready | READY | OK | `f443b6a891cc686ddd803d12f3f8fe66fe0bdb3dba866c2f37d4ecec2129ac5f` |
| bad-hash | HELD | HASH_MISMATCH | `a696db81e51dac16c5fe2674473e5e45a12aa7be335cf3f954c706cc8e2ff57a` |
| ambiguous | HELD | OK | `0e92dce563515fa1c6a354a2e15654f76a403b1518167f442887cafd86d9d916` |

## Exact persisted calculations

| Expression | Target | Rational value | Kind | Calculation root |
|---|---|---|---|---|
| `150@SPAN 2@BEAT /` | RATE | 1/160 | LINEAR | `1f22f6bf9962a664c0f904da988bfe83e021fdb93b392541b943776c98cb19f2` |
| `20@HOT 5@DELTA +` | COLD | 5963/20 | POINT | `aee8b4e8bc782f2930f8ef0e99495f0aa971e702dfe2806e87a00d782fcf86d6` |
| `30@HOT 20@HOT -` | DELTA | 10/1 | LINEAR | `9454ddb0084bfc539d0e80d95dc195110d9ccc469538fccab05929e3bc2e0034` |

## Receipts

14 finalized receipts: 7 successful executions and 7 expected execution errors. All MAJORITY_AGREE. A successful failed-source observation is not a usable unit environment; FINALIZED alone is not success.

| Step | Execution / consensus | Explorer |
|---|---|---|
| deploy | SUCCESS; MAJORITY_AGREE | [receipt](https://explorer-studio.genlayer.com/tx/0x64b010624ef4c2a274d1d90052c0273422fb43b11135cec33ad57102fafc64de) |
| interpret-ready | SUCCESS; MAJORITY_AGREE | [receipt](https://explorer-studio.genlayer.com/tx/0xfb432bbb477268da55e73cc3fccb638149e8d4fb0db348758d77a126d07973d8) |
| record-speed | SUCCESS; MAJORITY_AGREE | [receipt](https://explorer-studio.genlayer.com/tx/0x395c6da1b22744be43faeb41544823a29ff051314da5436ae4f9dfa671d23ab4) |
| record-point-shift | SUCCESS; MAJORITY_AGREE | [receipt](https://explorer-studio.genlayer.com/tx/0x7cb9459b492652343dbe3a416d55922d13c4af4d58db2e0a1be4f1aebfc435c9) |
| record-point-difference | SUCCESS; MAJORITY_AGREE | [receipt](https://explorer-studio.genlayer.com/tx/0x5aa7226e9469bd12f06e36d2f6e735563d985abec01e7273561ef0b322ed33f1) |
| calculation-replay | ERROR (expected rejection); MAJORITY_AGREE | [receipt](https://explorer-studio.genlayer.com/tx/0x66c1e8e6f11df7026e9b8420d9e5dcc8a28689630fba8b022219adc5109d8ab4) |
| root-substitution | ERROR (expected rejection); MAJORITY_AGREE | [receipt](https://explorer-studio.genlayer.com/tx/0x7d8aacc1b7a5699f265bd99da431ff319f5ef588c87de4ce620f8d32cca0b873) |
| dimension-mismatch | ERROR (expected rejection); MAJORITY_AGREE | [receipt](https://explorer-studio.genlayer.com/tx/0xb2a972418027ac738a8fba116917248de31b46d02c83323642bff27440079e1d) |
| point-addition | ERROR (expected rejection); MAJORITY_AGREE | [receipt](https://explorer-studio.genlayer.com/tx/0x2a509e3347486b30d457e068a682a05dc4f29337c570c3ed1905c1654180706e) |
| interpret-bad-hash | SUCCESS; MAJORITY_AGREE | [receipt](https://explorer-studio.genlayer.com/tx/0x009e481865ecf77dfdae7398cea9e464b5c8cebd26f1574d87eaf72102aa0e9c) |
| held-definitions | ERROR (expected rejection); MAJORITY_AGREE | [receipt](https://explorer-studio.genlayer.com/tx/0xed0835f6a4cd5594db3cb0617fd8e977273b3010e5468e75320d430b566309a9) |
| interpret-ambiguous | SUCCESS; MAJORITY_AGREE | [receipt](https://explorer-studio.genlayer.com/tx/0xb063058ea82f0d84337ea31c564a6aec63e42db55c9a7847f59c89e6c986dade) |
| module-resampling | ERROR (expected rejection); MAJORITY_AGREE | [receipt](https://explorer-studio.genlayer.com/tx/0x1d7cb7c48624c6bb33d1f2591fe9b7193e31ae1fdd137c018ecbed6384018764) |
| creator-nonce-replay | ERROR (expected rejection); MAJORITY_AGREE | [receipt](https://explorer-studio.genlayer.com/tx/0x262c4348568fbb5ff84c6703c4636946d14dc42c06006a13129142c2d090133c) |

## Reproduction and limits

Local validation: 42 Python tests, four independent JavaScript tests, seven SDK calldata roundtrips and GenVM lint pass.

`node --require ./scripts/native-http.cjs scripts/verify-live.mjs` is read-only and sends no transactions. It checks source equality, every finalized execution/consensus result, context and evidence roots, source bytes/commitments, immutable calculations, root rejection and independent BigInt arithmetic. Local tests mock web/LLM; they are not distributed consensus proofs.

Experimental and unaudited. No physical measurement, service, funds, agent alignment, source authority or freshness is attested. Authored definitions are interpreted, not proved physically correct. No universal novelty or steward acceptance is claimed.
