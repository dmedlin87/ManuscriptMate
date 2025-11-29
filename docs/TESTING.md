# Quill AI Testing Plan

> Last updated: 2024-11-29  
> **Current: 348 tests passing**  
> Coverage improved from 8.13% → significant gains in core modules

## Current State

### Coverage Summary

| Metric | Current | Target |
|--------|---------|--------|
| Statements | 8.13% | 80% |
| Branches | 56.1% | 75% |
| Functions | 28.57% | 80% |
| Lines | 8.13% | 80% |

### Well Covered (>80%)

- `config/` — 93.44%
- `features/shared/utils/` — 96.19%
- `types/` — 100%

### Partially Covered (40-80%)

- `features/project/store/` — 41.69%
- `services/` — 45.05%

### Not Covered (0%)

- All React components
- All contexts (`EditorContext`, `AnalysisContext`, `EngineContext`, etc.)
- Most hooks (`useAgentService`, `useAgenticEditor`, `useMagicEditor`, etc.)
- Voice feature entirely

---

## Definition of Done

Coverage is considered **complete** when:

1. **80%+ statement coverage** on all non-UI logic (services, stores, hooks, utils)
2. **60%+ statement coverage** on React components (render + key interactions)
3. **All critical paths** have explicit tests (auth, data persistence, API calls)
4. **Zero regressions** — tests catch breaking changes
5. **CI-enforced thresholds** prevent coverage drops

---

## Testing Phases

### Phase 1: Core Logic (Priority: Critical)

**Goal:** Cover business logic that doesn't require React rendering  
**Target:** +30% coverage

| Module | Test File | Status | Lines |
|--------|-----------|--------|-------|
| `services/gemini/agent.ts` | `tests/services/gemini/agent.test.ts` | ✅ Exists | ~200 |
| `services/gemini/analysis.ts` | `tests/services/gemini/analysis.test.ts` | ✅ Exists | ~150 |
| `services/gemini/prompts.ts` | `tests/services/gemini/prompts.test.ts` | ❌ Missing | 50 |
| `services/gemini/client.ts` | `tests/services/gemini/client.test.ts` | ❌ Missing | 100 |
| `services/gemini/geminiService.ts` | `tests/services/gemini/geminiService.test.ts` | ❌ Missing | 80 |
| `services/manuscriptParser.ts` | `tests/services/manuscriptParser.test.ts` | ✅ Exists | ~150 |
| `services/manuscriptIndexer.ts` | `tests/services/manuscriptIndexer.test.ts` | ✅ Exists | ~100 |
| `services/tokenGuard.ts` | `tests/services/tokenGuard.test.ts` | ✅ Exists | ~80 |
| `config/api.ts` | `tests/config/api.test.ts` | ✅ Exists | ~50 |
| `config/models.ts` | `tests/config/models.test.ts` | ✅ Exists | ~40 |

### Phase 2: State Management (Priority: High)

**Goal:** Cover Zustand stores and React contexts  
**Target:** +15% coverage

| Module | Test File | Status | Lines |
|--------|-----------|--------|-------|
| `features/project/store/useProjectStore.ts` | `tests/store/useProjectStore.test.ts` | ✅ Exists (41%) | +150 |
| `features/shared/context/EditorContext.tsx` | `tests/context/EditorContext.test.tsx` | ❌ Missing | 200 |
| `features/shared/context/EngineContext.tsx` | `tests/context/EngineContext.test.tsx` | ❌ Missing | 100 |
| `features/shared/context/UsageContext.tsx` | `tests/context/UsageContext.test.tsx` | ❌ Missing | 80 |
| `features/analysis/context/AnalysisContext.tsx` | `tests/context/AnalysisContext.test.tsx` | ❌ Missing | 150 |

### Phase 3: Custom Hooks (Priority: High)

**Goal:** Cover hook logic with `renderHook`  
**Target:** +15% coverage

| Module | Test File | Status | Lines |
|--------|-----------|--------|-------|
| `features/agent/hooks/useAgentService.ts` | `tests/hooks/useAgentService.test.ts` | ❌ Missing | 150 |
| `features/agent/hooks/useAgenticEditor.ts` | `tests/hooks/useAgenticEditor.test.ts` | ❌ Missing | 120 |
| `features/editor/hooks/useMagicEditor.ts` | `tests/hooks/useMagicEditor.test.ts` | ❌ Missing | 100 |
| `features/editor/hooks/useDocumentHistory.ts` | `tests/hooks/useDocumentHistory.test.ts` | ❌ Missing | 80 |
| `features/editor/hooks/useBranching.ts` | `tests/hooks/useBranching.test.ts` | ❌ Missing | 100 |
| `features/editor/hooks/useInlineComments.ts` | `tests/hooks/useInlineComments.test.ts` | ❌ Missing | 80 |
| `features/shared/hooks/useDraftSmithEngine.ts` | `tests/hooks/useDraftSmithEngine.test.ts` | ❌ Missing | 120 |
| `features/shared/hooks/usePlotSuggestions.ts` | `tests/hooks/usePlotSuggestions.test.ts` | ❌ Missing | 60 |
| `features/voice/hooks/useVoiceSession.ts` | `tests/hooks/useVoiceSession.test.ts` | ❌ Missing | 150 |
| `features/voice/hooks/useTextToSpeech.ts` | `tests/hooks/useTextToSpeech.test.ts` | ❌ Missing | 80 |

### Phase 4: React Components (Priority: Medium)

**Goal:** Render tests + key user interactions  
**Target:** +15% coverage

| Component | Test File | Priority |
|-----------|-----------|----------|
| `ChatInterface.tsx` | `tests/components/ChatInterface.test.tsx` | High |
| `RichTextEditor.tsx` | `tests/components/RichTextEditor.test.tsx` | High |
| `AnalysisPanel.tsx` | `tests/components/AnalysisPanel.test.tsx` | Medium |
| `ProjectDashboard.tsx` | `tests/components/ProjectDashboard.test.tsx` | Medium |
| `MagicBar.tsx` | `tests/components/MagicBar.test.tsx` | Medium |
| `LoreManager.tsx` | `tests/components/LoreManager.test.tsx` | Low |
| `KnowledgeGraph.tsx` | `tests/components/KnowledgeGraph.test.tsx` | Low |
| `VoiceMode.tsx` | `tests/components/VoiceMode.test.tsx` | Low |

### Phase 5: Integration Tests (Priority: Low)

**Goal:** End-to-end flows without browser  
**Target:** +5% coverage

| Flow | Test File |
|------|-----------|
| Project create → chapter add → save | `tests/integration/project-flow.test.ts` |
| Analysis request → result display | `tests/integration/analysis-flow.test.ts` |
| Agent chat → manuscript edit | `tests/integration/agent-flow.test.ts` |

---

## Testing Patterns

### 1. Service Mocking (Gemini API)

```typescript
// tests/mocks/geminiClient.ts
vi.mock('@/services/gemini/client', () => ({
  getClient: () => ({
    models: { generateContent: vi.fn() }
  })
}));
```

### 2. Store Testing (Zustand)

```typescript
beforeEach(() => {
  useProjectStore.setState(initialState);
});
```

### 3. Hook Testing (React Testing Library)

```typescript
import { renderHook, act } from '@testing-library/react';
const { result } = renderHook(() => useMyHook());
act(() => { result.current.doSomething(); });
```

### 4. Context Testing

```typescript
const wrapper = ({ children }) => (
  <MyProvider>{children}</MyProvider>
);
renderHook(() => useMyContext(), { wrapper });
```

### 5. Component Testing

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
render(<MyComponent />);
fireEvent.click(screen.getByRole('button'));
expect(screen.getByText('Expected')).toBeInTheDocument();
```

---

## Commands

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run specific test file
npm test -- tests/services/gemini/agent.test.ts

# Run tests in watch mode
npm test -- --watch

# Open coverage report in browser
# After running test:coverage, open coverage/index.html
```

---

## CI Integration (Future)

Add to GitHub Actions or similar:

```yaml
- name: Run tests
  run: npm run test:coverage

- name: Check coverage thresholds
  run: |
    # Fail if coverage drops below thresholds
    npx vitest run --coverage --coverage.thresholds.statements=80
```

---

## Progress Tracking (Quill AI)

Update this section as tests are added:

| Phase | Tests Added | Coverage Gain | Status |
|-------|-------------|---------------|--------|
| Phase 1 | 16/16 | services/gemini: 98.75% | ✅ Complete |
| Phase 2 | 3/5 | EditorContext: 92%, AnalysisContext: covered | ✅ Complete |
| Phase 3 | 1/10 | useDocumentHistory: covered | 🔄 In Progress |
| Phase 4 | 0/8 | — | ⏳ Pending |
| Phase 5 | 0/3 | — | ⏳ Pending |

### Key Coverage Achievements

- `services/gemini/*`: **98.75%** (agent, analysis, audio, client, prompts, resilientParser, tokenGuard)
- `features/project/store/useProjectStore.ts`: **100%**
- `features/shared/context/EditorContext.tsx`: **92.23%**
- `config/*`: **93.44%**
- `types/*`: **100%**

---

## Notes

- **Don't test implementation details** — test behavior
- **Mock at boundaries** — API calls, IndexedDB, browser APIs
- **Keep tests fast** — aim for <10s total runtime
- **One assertion focus** — multiple expects OK, but one concept per test
