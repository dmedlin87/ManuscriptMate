import React, { createContext, useContext, useCallback, useState, useMemo } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { useDocumentHistory } from '../hooks/useDocumentHistory';
import { HistoryItem, HighlightRange } from '../types';
import { Editor } from '@tiptap/react';
import { Branch, InlineComment } from '../types/schema';

export interface EditorContextValue {
  // Editor Instance
  editor: Editor | null;
  setEditor: (editor: Editor | null) => void;

  // Text & History
  currentText: string;
  updateText: (text: string) => void;
  commit: (text: string, description: string, author: 'User' | 'Agent') => void;
  history: HistoryItem[];
  restore: (id: string) => void;
  hasUnsavedChanges: boolean;

  // Selection
  selectionRange: { start: number; end: number; text: string } | null;
  selectionPos: { top: number; left: number } | null;
  cursorPosition: number;
  
  // Selection Setters (called by RichTextEditor)
  setSelectionState: (range: { start: number; end: number; text: string } | null, pos: { top: number; left: number } | null) => void;
  clearSelection: () => void;

  // UI State
  activeHighlight: HighlightRange | null;
  handleNavigateToIssue: (start: number, end: number) => void;

  // DraftSmith 3.0: Branching
  branches: Branch[];
  activeBranchId: string | null;
  isOnMain: boolean;
  createBranch: (name: string) => void;
  switchBranch: (branchId: string | null) => void;
  mergeBranch: (branchId: string) => void;
  deleteBranch: (branchId: string) => void;
  renameBranch: (branchId: string, newName: string) => void;

  // DraftSmith 3.0: Inline Comments
  inlineComments: InlineComment[];
  setInlineComments: (comments: InlineComment[]) => void;
  dismissComment: (commentId: string) => void;
  clearComments: () => void;
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

  // History & Text Hook
  const { text: currentText, updateText, commit, history, restore, hasUnsavedChanges } = useDocumentHistory(
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

  const handleNavigateToIssue = useCallback((start: number, end: number) => {
    setActiveHighlight({ start, end, type: 'issue' });
  }, []);

  // DraftSmith 3.0: Branching State
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

  // DraftSmith 3.0: Inline Comments State
  const [inlineComments, setInlineComments] = useState<InlineComment[]>(activeChapter?.comments || []);

  React.useEffect(() => {
    if (activeChapter) {
      setInlineComments(activeChapter.comments || []);
    }
  }, [activeChapterId, activeChapter]);

  const dismissComment = useCallback((commentId: string) => {
    setInlineComments(prev => prev.map(c => 
      c.id === commentId ? { ...c, dismissed: true } : c
    ));
  }, []);

  const clearComments = useCallback(() => {
    setInlineComments([]);
  }, []);

  const value: EditorContextValue = {
    editor,
    setEditor,
    currentText,
    updateText,
    commit,
    history,
    restore,
    hasUnsavedChanges,
    selectionRange,
    selectionPos,
    cursorPosition,
    setSelectionState,
    clearSelection,
    activeHighlight,
    handleNavigateToIssue,
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