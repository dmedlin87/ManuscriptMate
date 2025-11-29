import React, { createContext, useContext, useCallback, useState } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { useDocumentHistory } from '../hooks/useDocumentHistory';
import { HistoryItem, HighlightRange } from '../types';
import { Editor } from '@tiptap/react';

export interface ManuscriptContextValue {
  editor: Editor | null;
  setEditor: (editor: Editor | null) => void;
  currentText: string;
  updateText: (text: string) => void;
  commit: (text: string, description: string, author: 'User' | 'Agent') => void;
  history: HistoryItem[];
  restore: (id: string) => void;
  hasUnsavedChanges: boolean;
  selectionRange: { start: number; end: number; text: string } | null;
  selectionPos: { top: number; left: number } | null;
  cursorPosition: number;
  setSelectionState: (range: { start: number; end: number; text: string } | null, pos: { top: number; left: number } | null) => void;
  clearSelection: () => void;
  activeHighlight: HighlightRange | null;
  handleNavigateToIssue: (start: number, end: number) => void;
}

const ManuscriptContext = createContext<ManuscriptContextValue | undefined>(undefined);

export const ManuscriptProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    activeChapterId, 
    updateChapterContent,
    getActiveChapter 
  } = useProjectStore();
  
  const activeChapter = getActiveChapter();
  const [editor, setEditor] = useState<Editor | null>(null);

  const handleSaveContent = useCallback((text: string) => {
    if (activeChapterId) updateChapterContent(activeChapterId, text);
  }, [activeChapterId, updateChapterContent]);

  const { text: currentText, updateText, commit, history, restore, hasUnsavedChanges } = useDocumentHistory(
    activeChapter?.content || '', 
    activeChapterId, 
    handleSaveContent
  );

  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number; text: string } | null>(null);
  const [selectionPos, setSelectionPos] = useState<{ top: number; left: number } | null>(null);
  
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

  const [activeHighlight, setActiveHighlight] = useState<HighlightRange | null>(null);

  const handleNavigateToIssue = useCallback((start: number, end: number) => {
    setActiveHighlight({ start, end, type: 'issue' });
  }, []);

  const value: ManuscriptContextValue = {
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
    handleNavigateToIssue
  };

  return (
    <ManuscriptContext.Provider value={value}>
      {children}
    </ManuscriptContext.Provider>
  );
};

export const useManuscript = () => {
  const context = useContext(ManuscriptContext);
  if (!context) {
    throw new Error('useManuscript must be used within a ManuscriptProvider');
  }
  return context;
};
