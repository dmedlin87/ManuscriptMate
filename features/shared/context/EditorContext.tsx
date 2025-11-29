import React, { createContext, useContext, useCallback, useState, useMemo } from 'react';
import { useProjectStore } from '@/features/project';
import { useDocumentHistory } from '@/features/editor/hooks/useDocumentHistory';
import { HistoryItem, HighlightRange, EditorContext as EditorContextType } from '@/types';
import { Editor } from '@tiptap/react';
import { Branch, InlineComment } from '@/types/schema';

/**
 * EditorContext - The Unified Editor Core
 * 
 * Single source of truth for:
 * - Tiptap editor instance
 * - Text content and mutations
 * - Selection and cursor state
 * - Undo/Redo history stack
 * - Document navigation (highlight jumps)
 * - Branching (multiverse)
 * - Inline comments (critique system)
 */
export interface EditorContextValue {
  // Editor Instance
  editor: Editor | null;
  setEditor: (editor: Editor | null) => void;

  // Text & Content
  currentText: string;
  updateText: (text: string) => void;
  commit: (text: string, description: string, author: 'User' | 'Agent') => void;
  loadDocument: (text: string) => void;

  // History (Undo/Redo)
  history: HistoryItem[];
  redoStack: HistoryItem[];
  undo: () => boolean;
  redo: () => boolean;
  canUndo: boolean;
  canRedo: boolean;
  restore: (id: string) => void;
  hasUnsavedChanges: boolean;

  // Selection & Cursor
  selectionRange: { start: number; end: number; text: string } | null;
  selectionPos: { top: number; left: number } | null;
  cursorPosition: number;
  setSelection: (start: number, end: number) => void;
  setSelectionState: (range: { start: number; end: number; text: string } | null, pos: { top: number; left: number } | null) => void;
  clearSelection: () => void;

  // Navigation & Highlighting
  activeHighlight: HighlightRange | null;
  handleNavigateToIssue: (start: number, end: number) => void;
  scrollToPosition: (position: number) => void;

  // Computed Context (for agent)
  getEditorContext: () => EditorContextType;

  // Quill AI 3.0: Branching
  branches: Branch[];
  activeBranchId: string | null;
  isOnMain: boolean;
  createBranch: (name: string) => void;
  switchBranch: (branchId: string | null) => void;
  mergeBranch: (branchId: string) => void;
  deleteBranch: (branchId: string) => void;
  renameBranch: (branchId: string, newName: string) => void;

  // Quill AI 3.0: Inline Comments
  inlineComments: InlineComment[];
  setInlineComments: (comments: InlineComment[]) => void;
  dismissComment: (commentId: string) => void;
  clearComments: () => void;

  // Quill AI 3.0: Zen Mode
  isZenMode: boolean;
  toggleZenMode: () => void;
}

const EditorContext = createContext<EditorContextValue | undefined>(undefined);

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    activeChapterId, 
    updateChapterContent,
    getActiveChapter 
  } = useProjectStore();
  
  const activeChapter = getActiveChapter();

  // Tiptap Editor Instance
  const [editor, setEditor] = useState<Editor | null>(null);

  // Persistence Callback
  const handleSaveContent = useCallback((text: string) => {
    if (activeChapterId) updateChapterContent(activeChapterId, text);
  }, [activeChapterId, updateChapterContent]);

  // Full History & Text Hook with undo/redo
  const { 
    text: currentText, 
    updateText, 
    commit, 
    history, 
    redoStack,
    undo,
    redo,
    canUndo,
    canRedo,
    restore, 
    reset: loadDocument,
    hasUnsavedChanges 
  } = useDocumentHistory(
    activeChapter?.content || '', 
    activeChapterId, 
    handleSaveContent
  );

  // Selection State
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number; text: string } | null>(null);
  const [selectionPos, setSelectionPos] = useState<{ top: number; left: number } | null>(null);
  
  // Tiptap provides 'from' as cursor position if empty selection
  const cursorPosition = editor?.state.selection.from || 0;

  const setSelectionState = useCallback((
      range: { start: number; end: number; text: string } | null, 
      pos: { top: number; left: number } | null
  ) => {
      setSelectionRange(range);
      setSelectionPos(pos);
  }, []);

  const clearSelection = useCallback(() => {
      setSelectionRange(null);
      setSelectionPos(null);
      editor?.commands.focus();
  }, [editor]);

  // UI State
  const [activeHighlight, setActiveHighlight] = useState<HighlightRange | null>(null);

  // Programmatic selection setter (for issue deep-linking)
  const setSelection = useCallback((start: number, end: number) => {
    if (!editor) return;
    
    // Clamp to valid range
    const safeStart = Math.max(0, Math.min(start, editor.state.doc.content.size));
    const safeEnd = Math.max(safeStart, Math.min(end, editor.state.doc.content.size));
    
    editor.chain()
      .focus()
      .setTextSelection({ from: safeStart, to: safeEnd })
      .run();
    
    // Update local state
    const selectedText = editor.state.doc.textBetween(safeStart, safeEnd, ' ');
    setSelectionRange({ start: safeStart, end: safeEnd, text: selectedText });
  }, [editor]);

  // Navigate to issue and highlight it
  const handleNavigateToIssue = useCallback((start: number, end: number) => {
    setActiveHighlight({ start, end, type: 'issue' });
    setSelection(start, end);
  }, [setSelection]);

  // Scroll editor to position
  const scrollToPosition = useCallback((position: number) => {
    if (!editor) return;
    editor.chain().focus().setTextSelection(position).run();
  }, [editor]);

  // Get current editor context for agent
  const getEditorContext = useCallback((): EditorContextType => ({
    cursorPosition,
    selection: selectionRange,
    totalLength: currentText.length
  }), [cursorPosition, selectionRange, currentText.length]);

  // Quill AI 3.0: Branching State
  const [branches, setBranches] = useState<Branch[]>(activeChapter?.branches || []);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(activeChapter?.activeBranchId || null);
  const [mainContent, setMainContent] = useState(activeChapter?.content || '');

  // Sync branches with chapter changes
  React.useEffect(() => {
    if (activeChapter) {
      setBranches(activeChapter.branches || []);
      setActiveBranchId(activeChapter.activeBranchId || null);
      setMainContent(activeChapter.content || '');
    }
  }, [activeChapterId, activeChapter]);

  const isOnMain = !activeBranchId;

  const createBranch = useCallback((name: string) => {
    const newBranch: Branch = {
      id: crypto.randomUUID(),
      name,
      content: currentText,
      createdAt: Date.now(),
    };
    setBranches(prev => [...prev, newBranch]);
    // TODO: Persist to store
  }, [currentText]);

  const switchBranch = useCallback((branchId: string | null) => {
    if (branchId === null) {
      // Switch to main
      setActiveBranchId(null);
      updateText(mainContent);
    } else {
      const branch = branches.find(b => b.id === branchId);
      if (branch) {
        setActiveBranchId(branchId);
        updateText(branch.content);
      }
    }
  }, [branches, mainContent, updateText]);

  const mergeBranch = useCallback((branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (branch) {
      setMainContent(branch.content);
      updateText(branch.content);
      setActiveBranchId(null);
    }
  }, [branches, updateText]);

  const deleteBranch = useCallback((branchId: string) => {
    if (activeBranchId === branchId) {
      setActiveBranchId(null);
      updateText(mainContent);
    }
    setBranches(prev => prev.filter(b => b.id !== branchId));
  }, [activeBranchId, mainContent, updateText]);

  const renameBranch = useCallback((branchId: string, newName: string) => {
    setBranches(prev => prev.map(b => 
      b.id === branchId ? { ...b, name: newName } : b
    ));
  }, []);

  // Quill AI 3.0: Inline Comments State
  const [inlineComments, setInlineComments] = useState<InlineComment[]>(activeChapter?.comments || []);

  React.useEffect(() => {
    if (activeChapter) {
      setInlineComments(activeChapter.comments || []);
    }
  }, [activeChapterId, activeChapter]);

  // Quill AI 3.0: Zen Mode State
  const [isZenMode, setIsZenMode] = useState(false);
  const toggleZenMode = useCallback(() => setIsZenMode(prev => !prev), []);

  const dismissComment = useCallback((commentId: string) => {
    setInlineComments(prev => prev.map(c => 
      c.id === commentId ? { ...c, dismissed: true } : c
    ));
  }, []);

  const clearComments = useCallback(() => {
    setInlineComments([]);
  }, []);

  const value: EditorContextValue = {
    // Editor Instance
    editor,
    setEditor,
    // Text & Content
    currentText,
    updateText,
    commit,
    loadDocument,
    // History (Undo/Redo)
    history,
    redoStack,
    undo,
    redo,
    canUndo,
    canRedo,
    restore,
    hasUnsavedChanges,
    // Selection & Cursor
    selectionRange,
    selectionPos,
    cursorPosition,
    setSelection,
    setSelectionState,
    clearSelection,
    // Navigation & Highlighting
    activeHighlight,
    handleNavigateToIssue,
    scrollToPosition,
    // Computed Context
    getEditorContext,
    // Branching
    branches,
    activeBranchId,
    isOnMain,
    createBranch,
    switchBranch,
    mergeBranch,
    deleteBranch,
    renameBranch,
    // Inline Comments
    inlineComments,
    setInlineComments,
    dismissComment,
    clearComments,
    // Zen Mode
    isZenMode,
    toggleZenMode,
  };

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
};

// Backward compatibility alias
export const useManuscript = useEditor;
export type ManuscriptContextValue = EditorContextValue;
export const ManuscriptProvider = EditorProvider;