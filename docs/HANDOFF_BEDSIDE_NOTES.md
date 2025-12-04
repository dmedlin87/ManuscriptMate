# Bedside Notes: Handoff Summary

This handoff captures the current state of the bedside-note feature (planning memory) and what remains to finish the roadmap slices.

## Current Capabilities

- **Persistent planning note** per project (plan, scope:project, tagged `meta:bedside-note`) auto-created and surfaced first in memory context.
- **Evolution via chains** (`evolveBedsideNote`):
  - Structured content storage, embeddings, conflict detection/tagging (`conflict:detected`, `conflict:resolution:*`).
  - Roll-up from chapter → arc → project when evolving chapter/arc notes.
  - Extra tags support; keeps prior versions.
- **Triggers implemented**
  - **Analysis**: `useMemoryIntelligence` builds plan text from analysis+goals and evolves bedside note (`changeReason: analysis_update`).
  - **Proactive thinking**: When LLM thinks something is significant, it evolves bedside note with suggestions + reminders (`changeReason: proactive_thinking`).
  - **Goal lifecycle**: add/complete/abandon goal evolves bedside note with counts (`changeReason: goal_lifecycle`).
  - **Staleness refresh**: `buildMemorySection` refreshes bedside note if `updatedAt` is older than `DEFAULT_BEDSIDE_NOTE_STALENESS_MS` (6h) (`changeReason: staleness_refresh`).
  - **Chapter transition** (new): ProactiveThinker listens to `CHAPTER_CHANGED` and evolves bedside with chapter title/issues/watched entities (`changeReason: chapter_transition`, tagged with chapter).
  - **Significant edit bursts** (new): ProactiveThinker accumulates text deltas; if >500 chars and cooldown passed, evolves bedside note with reminder (`changeReason: significant_edit`, tagged with chapter/edit).
  - **Session boundary** (new): `handleSessionStart/End` evolve bedside with reminders/summary on session lifecycle (`changeReason: session_start` / `session_boundary`, debounced).
- **Agent-driven updates**: `update_bedside_note` tool + `applyBedsideNoteMutation` for structured edits (`changeReason: agent_*`).
- **Author cross-project**: `seedProjectBedsideNoteFromAuthor`, `recordProjectRetrospective` for author-scoped bedside notes.
- **UI**: `BedsideNotePanel` renders structured content, conflicts, notifications (conflicts, stalled goals), history.

## Not Yet Implemented (high-value next steps)

- **Hierarchical prompt assembly**: adaptive/context builders now prioritize bedside notes by active chapter/arc, but there is no explicit fetch/render of distinct chapter/arc/project bedside notes into separate sections; only ordering + roll-up is present.
- **Significant edit/testing**: new chapter/significant-edit triggers lack test coverage.
- **Large edit threshold configuration**: thresholds are hardcoded in ProactiveThinker (delta≥500, cooldown 5m).

## Key Files

- `services/memory/chains.ts` — evolveBedsideNote, conflict handling, roll-up, embeddings, author seed/retrospective.
- `services/memory/index.ts` — goal lifecycle sync calls evolveBedsideNote.
- `services/memory/sessionLifecycle.ts` — session start/end bedside evolution and summary/briefing handling.
- `services/memory/bedsideNoteMutations.ts` — agent-driven structured updates.
- `features/agent/hooks/useMemoryIntelligence.ts` — analysis-driven bedside evolution.
- `services/appBrain/proactiveThinker.ts` — proactive, chapter-transition, significant-edit bedside evolution.
- `services/appBrain/adaptiveContext.ts` — staleness refresh, bedside ordering, conflict surfacing in memory section.
- `features/memory/components/BedsideNotePanel.tsx` — UI rendering.

## Suggested Next Actions

1) **Session boundary trigger**: On session start/end (or orchestrator reset), evolve bedside note with briefing/summary (`changeReason: session_boundary`).
2) **Hierarchical prompt assembly**: In adaptive/context builders, explicitly fetch/render project/arc/chapter bedside notes as separate sections when present (not just sort/roll-up).
3) **Tests**: Add coverage for new chapter transition and significant-edit triggers; verify staleness refresh path; add mutation/tool wiring tests if missing.
4) **Threshold config**: Expose significant-edit thresholds in ThinkerConfig for tuning.

## Status

- Tests not re-run after chapter/significant-edit trigger change.
- Roadmap doc: `docs/BEDSIDE_NOTE_ROADMAP.md` (complete, with priorities).
