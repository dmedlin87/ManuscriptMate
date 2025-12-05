# TODO

1. Wire shared context + tool adapter: replace promptBuilder usage in AgentController and useAgentOrchestrator with agentContextBuilder; use createToolCallAdapter in orchestrator; add streaming guard.
2. Cleanup lifecycle: ensure eventBus unsubscribe on reinit/unmount and tighten reset/dispose semantics in AgentController.
3. Add tests for tool loop, abort, persona reinit, streaming guard, and subscription cleanup.
4. Run targeted tests (or at least relevant suites) after refactor.
