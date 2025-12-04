# Intelligence Engine

The intelligence engine is Quill AI's **deterministic manuscript indexer**. It analyzes each chapter locally (no model calls) to build a rich set of signals:

- Structural fingerprint (scenes, paragraphs, stats).
- Entity graph (characters, locations, objects, relationships).
- Timeline (events, causal chains, promises).
- Style and voice fingerprints.
- Attention heatmap (risk hotspots and suggestions).
- Manuscript HUD (cursor-aware summary for the UI and agent).

These signals power the HUD, cross-chapter dashboards, memory auto-observation, and the omniscient agent's context—without spending tokens.

Related docs:

- [Architecture](./ARCHITECTURE.md)
- [App Brain, Memory, and Intelligence Flow](./APP_BRAIN_FLOW.md)
- [Memory System](./MEMORY_SYSTEM.md)
- [Agent Architecture](./AGENT_ARCHITECTURE.md)

---

## 1. Core Types

Defined in `types/intelligence.ts`.

At the highest level, **`ManuscriptIntelligence`** groups all intelligence signals for a single chapter:

- `chapterId`: the chapter this intelligence belongs to.
- `structural: StructuralFingerprint`
- `entities: EntityGraph`
- `timeline: Timeline`
- `style: StyleFingerprint`
- `voice: VoiceFingerprint`
- `heatmap: AttentionHeatmap`
- `delta: ManuscriptDelta`
- `hud: ManuscriptHUD`

### 1.1 StructuralFingerprint

Captures how the manuscript is structured:

- **Scenes:** start/end offsets, type (e.g. scene/beat), and tension scores.
- **Paragraphs:** offsets, lengths, and paragraph type classification.
- **Dialogue map:** speaker/quote pairs with offsets.
- **Stats:** word/sentence/paragraph counts, dialogue ratio, scene counts, etc.
- **`processedAt`:** timestamp for caching and staleness checks.

### 1.2 EntityGraph

Represents the manuscript's **character/location/object graph**:

- `nodes`: entities with
  - `type` (character, location, object, ...)
  - `name`, aliases, mention count, first mention offset
  - per-chapter mentions
- `edges`: relationships/co-occurrences between entities with
  - `type` (interacts, relationship, ...)
  - co-occurrence counts, example evidence, chapters
- `processedAt`: timestamp

The graph supports questions like "who appears together most often?" and "where was this character introduced?".

### 1.3 Timeline

Tracks **narrative time and plot promises**:

- `events`: ordered events with timestamps/offsets.
- `causalChains`: simple cause/effect links.
- `promises`: open plot threads and their resolution status.

Timeline data supports consistency checks and memory creation around unresolved promises.

### 1.4 StyleFingerprint & VoiceFingerprint

- **StyleFingerprint** aggregates global style metrics:
  - sentence length distributions
  - dialogue vs narration ratio
  - pacing-related statistics
  - style and risk flags
- **VoiceFingerprint** focuses on dialogue voices:
  - per-character dialogue stats
  - voice/intonation patterns derived from the dialogue map

### 1.5 AttentionHeatmap

The **attention heatmap** maps the manuscript into fixed-size sections and scores each section:

- `sections`: list of `HeatmapSection` records with
  - `offset`, `length`
  - risk scores (e.g. pacing, clarity, style)
  - flags and suggestions
- `hotspots`: top high-risk regions with an offset, summary reason, and severity.
- `processedAt`: timestamp.

Helper functions in `services/intelligence/heatmapBuilder.ts`:

- `getSectionAtOffset(heatmap, offset)` — section under the cursor.
- `getHighRiskSections(heatmap, threshold)` — sorted high-risk sections.
- `getSuggestionsForRange(heatmap, startOffset, endOffset)` — deduplicated suggestions for a text span.

### 1.6 ManuscriptDelta & Chunk Index

The **delta** and **chunk index** make incremental processing possible:

- `ManuscriptDelta` tracks
  - content hash
  - changed ranges
  - affected entities.
- `ChunkRecord` & `ChunkAnalysis` capture cached analysis for semantic chunks:
  - `ChunkRecord`: id, level (`scene` | `chapter` | `act` | `book`), offsets, hash, status, hierarchy, and cached `analysis`.
  - `ChunkAnalysis`: summary, metrics (word count, dialogue ratio, avg tension), extracted names, open promises, style flags, risk score, and optional detailed fingerprints.

The engine uses these structures to avoid full reprocessing when most of the chapter is unchanged.

---

## 2. Full Manuscript Processing

Main entry points live in `services/intelligence/index.ts`.

### 2.1 `processManuscript`

```ts
processManuscript(
  text: string,
  chapterId: string,
  previousText?: string,
  previousIntelligence?: ManuscriptIntelligence
): ManuscriptIntelligence
```

Runs the full intelligence pipeline **without caching**:

1. **Structural parsing** — `parseStructure(text)`
   - Finds scenes, paragraphs, dialogue, and structural stats.
2. **Entity extraction** — `extractEntities(...)`
   - Builds the entity graph from text, paragraphs, and dialogue.
3. **Timeline building** — `buildTimeline(text, structural.scenes, chapterId)`
4. **Style analysis** — `analyzeStyle(text)`
5. **Voice analysis** — `analyzeVoices(structural.dialogueMap)`
6. **Heatmap building** — `buildHeatmap(text, structural, entities, timeline, style)`
7. **Delta tracking** — `createDelta(previousText, text, previousIntelligence?.entities, previousIntelligence?.timeline)`
   - If there is no previous state, falls back to `createEmptyDelta(text)`.
8. **HUD construction** — `buildHUD(...)`
   - Builds an initial `ManuscriptHUD` (usually with cursor at 0).

Returns a fully-populated `ManuscriptIntelligence` object.

### 2.2 `processManuscriptCached`

```ts
processManuscriptCached(
  text: string,
  chapterId: string,
  previousText?: string,
  previousIntelligence?: ManuscriptIntelligence
): ManuscriptIntelligence
```

A cached variant that reuses expensive sub-results when possible:

- Uses `parseStructureCached`, `extractEntitiesCached`, and `analyzeStyleCached`.
- Still rebuilds timeline and heatmap, since they depend on multiple components.
- Recomputes delta similarly to `processManuscript`.
- Builds `hud` the same way.

Use this path when you want correctness + better performance without full incremental patching.

---

## 3. Incremental Processing

Incremental processing lives in `services/intelligence/incrementalProcessor.ts`.

### 3.1 `processManuscriptIncremental`

```ts
processManuscriptIncremental(
  newText: string,
  chapterId: string,
  prevText: string,
  prevIntelligence: ManuscriptIntelligence
): IncrementalProcessingResult
```

High-level flow:

1. **Hash comparison**
   - If the new text hash matches `prevIntelligence.delta.contentHash`, return the cached intelligence.
2. **Delta computation**
   - `createDelta(prevText, newText, prevIntelligence.entities, prevIntelligence.timeline)`.
   - If `delta.changedRanges` is empty, just update the delta and return.
3. **Compute affected ranges**
   - `computeAffectedRanges(delta.changedRanges)` narrows which spans need work.
4. **Structural patching**
   - `patchStructure(newText, prevIntelligence.structural, affectedRanges)`.
   - Returns updated structural fingerprint and counts of reprocessed vs reused scenes.
5. **Entity patching**
   - `patchEntities(newText, prevIntelligence.entities, delta.affectedEntities, structural, chapterId)`.
6. **Timeline**
   - Rebuilds timeline via `buildTimeline(newText, structural.scenes, chapterId)`.
7. **Style**
   - Computes a `totalChangeSize` heuristic.
   - If above a threshold, fully recomputes style; otherwise, reuses the previous style fingerprint.
8. **Voice**
   - Always recomputes `analyzeVoices(structural.dialogueMap)`.
9. **Heatmap**
   - Rebuilds heatmap from the new structural/entities/timeline/style.
10. **HUD** — builds a new `hud` with `buildHUD(intelligence, 0)`.

The result includes both the new `ManuscriptIntelligence` and processing stats (`scenesReprocessed`, `entitiesUpdated`, `processingTimeMs`, etc.).

Use this when you need to keep intelligence up-to-date while the user is editing, without doing full re-analysis on every change.

---

## 4. Instant & Debounced Metrics

For responsive UI feedback, the engine exposes **lighter-weight** processing modes.

### 4.1 `processInstant`

```ts
processInstant(
  text: string,
  cursorOffset: number,
  cachedStructural?: StructuralFingerprint
): InstantMetrics
```

- If a recent `StructuralFingerprint` is available, uses it to:
  - return word/sentence/paragraph counts
  - find the current scene and its tension
- Otherwise, falls back to a quick text-based calculation without full parsing.

Used for the HUD panel and quick metrics that update as the user types.

### 4.2 `processDebounced`

```ts
processDebounced(
  text: string,
  cursorOffset: number
): DebouncedMetrics
```

- Runs full `parseStructure(text)`.
- Returns the instant metrics plus:
  - `dialogueRatio`
  - `avgSentenceLength`
  - `currentParagraphType`

This is suitable for **debounced** updates when the cursor moves or the text changes significantly.

---

## 5. Cross-Chapter Intelligence

`mergeChapterIntelligence` in `services/intelligence/index.ts` aggregates intelligence across chapters:

```ts
mergeChapterIntelligence(chapters: ManuscriptIntelligence[]): {
  entities: EntityGraph;
  timeline: Timeline;
  projectStats: {
    totalWords: number;
    totalScenes: number;
    avgTension: number;
    topCharacters: string[];
  };
}
```

- Merges entity graphs via `mergeEntityGraphs`.
- Merges timelines via `mergeTimelines`.
- Computes project-wide stats:
  - `totalWords`
  - `totalScenes`
  - `avgTension` across all scenes
  - `topCharacters` by mention count.

These aggregates feed project-level dashboards and can be surfaced to the agent/App Brain for global reasoning.

---

## 6. Worker & Concurrency Model

The intelligence engine can run in a **Web Worker** to avoid blocking the UI.

- Worker implementation: `services/intelligence/worker.ts`.
- Entry point: `createIntelligenceWorker()` (see that file for details).

The worker supports multiple message types, for example:

- `PROCESS_FULL` — full intelligence pass (possibly using incremental or cached processing).
- `PROCESS_STRUCTURAL` — structural parsing only.
- `PROCESS_ENTITIES` — structural parsing + entity extraction.
- `PROCESS_STYLE` — style analysis only.

Each message includes:

- a unique `id`
- `payload` (text, chapterId, and optional previous intelligence)

The worker tracks `currentRequestId` and:

- discards late results from cancelled/obsolete requests
- returns results as `WorkerResponse` messages with a `type` (`RESULT`, `PARTIAL`, or `ERROR`).

On the UI side, `features/shared/hooks/useManuscriptIntelligence.ts` coordinates:

- whether to send work to the worker or run locally
- how to update React state when results arrive
- how to update the HUD (`updateHUDForCursor`).

---

## 7. Integration with App Brain, Analysis, and Memory

The intelligence engine is part of the **AI engine layer** described in `ARCHITECTURE.md` and is surfaced in several places:

- **Editor & HUD**
  - `useManuscriptIntelligence` keeps `ManuscriptIntelligence` up-to-date for the active chapter.
  - HUD components consume `hud`, `heatmap`, and metrics to show pacing, word counts, hotspots, and entity info.
- **App Brain**
  - App Brain aggregates intelligence together with manuscript, analysis, and layout state.
  - Intelligence signals (entities, timeline, heatmap, stats) are available to the omniscient agent via context builders.
- **Memory system**
  - `services/memory/autoObserver.ts` consumes `ManuscriptIntelligence` to create `MemoryNote`s about:
    - character arcs and relationships
    - open plot threads (`timeline.promises`)
    - recurring motifs or stylistic issues.
- **Agent tools & context**
  - Agent tools and App Brain context builders can:
    - answer questions like "where does this character first appear?"
    - highlight hotspots in the manuscript
    - surface unresolved promises and risk areas.

The intelligence engine thus provides **stable, deterministic structure** that the model can rely on, while the agent and LLM focus on higher-level reasoning and generation.

---

## 8. When to Extend the Intelligence Engine

Consider extending the intelligence engine when:

- You need **new deterministic signals** (e.g. motif tracking, POV stability) that do not require model calls.
- You want better **cross-chapter insights** (e.g. series-level timelines, character presence heatmaps).
- You are adding **new HUD visualizations** that depend on structural or style metrics.

Guidelines:

- Prefer enriching existing fingerprints (structural, style, entities, timeline, heatmap) before inventing new top-level types.
- Keep incremental processing in mind:
  - make new metrics derivable from existing deltas or affected ranges when possible.
  - update `processManuscriptIncremental` if new work is expensive.
- When adding new intelligence fields that impact prompts:
  - update context builders in `services/appBrain/contextBuilder.ts` / `adaptiveContext.ts` as needed.
  - consider whether new signals should feed into the memory system or agent tools.

---

## 9. Debugging Intelligence Issues

When HUD, dashboards, or agent behavior look wrong, treat the deterministic intelligence engine like any other data pipeline and debug it step by step:

- **Confirm the inputs**
  - Check the raw chapter text, `chapterId`, and any previous intelligence you are passing in.
  - Verify that the editor is actually committing the latest text (e.g., commits vs. transient cursor edits).
- **Inspect intermediate fingerprints**
  - Log or snapshot individual fingerprints (structural, entities, timeline, style, heatmap) rather than only looking at the final HUD.
  - Compare a “good” chapter vs. a “bad” one to see which fingerprint diverges first.
- **Check delta and incremental paths**
  - Temporarily run the same chapter through `processManuscript` (full) and `processManuscriptIncremental` and compare results.
  - If full vs. incremental disagree, focus on delta computation, affected ranges, and patching logic.
- **Validate cross-chapter aggregation**
  - If project-level dashboards or agent answers look off, inspect the per-chapter `ManuscriptIntelligence` first, then check `mergeChapterIntelligence` outputs.
  - Look for obviously missing entities, timelines that stop early, or extreme stats that skew averages.
- **Trace HUD derivation**
  - When HUD panels are inconsistent with the underlying fingerprints, confirm how the HUD is derived from `ManuscriptIntelligence` (cursor position, active chapter, and the mapping from fingerprints to UI widgets).
- **Isolate worker vs. main-thread behavior**
  - If results differ between environments, run the same inputs directly through the core processing functions (bypassing the worker) to rule out message-routing or cancellation issues.

In general, prefer to debug by comparing **before/after fingerprints** for the same text rather than starting from agent prompts. Once the deterministic signals are correct, most downstream issues reduce to prompt composition or context budgeting rather than bugs in the intelligence engine itself.
