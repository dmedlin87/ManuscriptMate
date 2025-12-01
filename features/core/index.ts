/**
 * Core Feature
 *
 * Centralized exports for global application contexts that power the
 * editor, engine, and agent layers.
 */

// Editor Context
export {
  EditorProvider,
  useEditor,
  useEditorState,
  useEditorActions,
  useManuscript,
  ManuscriptProvider,
  type EditorContextValue,
  type ManuscriptContextValue,
} from './context/EditorContext';

// Engine Context
export {
  EngineProvider,
  useEngine,
  type EngineContextValue,
  type EngineState,
  type EngineActions,
} from './context/EngineContext';

// App Brain Context
export {
  AppBrainProvider,
  useAppBrain,
  useAppBrainState,
  useAppBrainActions,
  useAppBrainContext,
  type AppBrainValue,
} from './context/AppBrainContext';
