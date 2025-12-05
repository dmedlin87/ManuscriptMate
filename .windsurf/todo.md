# TODO

## Current task: UX must-haves (tooltips/shortcuts/inline guidance/context)

1. Add tooltips with shortcuts and disabled reasons to primary MagicBar actions and any editor toolbar buttons.
2. Add inline guidance/empty-state hints when no selection or empty doc (e.g., “Highlight text and press Shift+Enter to open Magic”).
3. Wire smart context assembly (getSmartAgentContext) into AgentController sendMessage to use model-aware budgets and relevant memories.
4. Add targeted tests or instrumentation where feasible (context wiring), and run relevant suites.

## Previous refactor tasks (backlog)

1. Wire shared context + tool adapter: replace promptBuilder usage in AgentController and useAgentOrchestrator with agentContextBuilder; use createToolCallAdapter in orchestrator; add streaming guard.
2. Cleanup lifecycle: ensure eventBus unsubscribe on reinit/unmount and tighten reset/dispose semantics in AgentController.
3. Add tests for tool loop, abort, persona reinit, streaming guard, and subscription cleanup.
4. Run targeted tests (or at least relevant suites) after refactor.
