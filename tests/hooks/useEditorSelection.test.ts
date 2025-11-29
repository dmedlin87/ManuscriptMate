import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Editor } from '@tiptap/react';
import { useEditorSelection } from '@/features/editor/hooks/useEditorSelection';

describe('useEditorSelection', () => {
  let mockEditor: any;
  let chainSpy: any;
  let focusSpy: any;
  let setTextSelectionSpy: any;
  let runSpy: any;

  beforeEach(() => {
    runSpy = vi.fn();
    setTextSelectionSpy = vi.fn().mockReturnValue({ run: runSpy });
    focusSpy = vi.fn().mockReturnValue({ setTextSelection: setTextSelectionSpy, run: runSpy });
    chainSpy = vi.fn().mockReturnValue({ focus: focusSpy });

    mockEditor = {
      state: {
        doc: {
          content: { size: 100 },
          textBetween: vi.fn().mockReturnValue('selected text'),
        },
        selection: { from: 10 },
      },
      chain: chainSpy,
      commands: {
        focus: vi.fn(),
      },
    } as unknown as Editor;
  });

  it('initializes with default values', () => {
    const { result } = renderHook(() =>
      useEditorSelection({ editor: null, currentText: '' })
    );

    expect(result.current.selectionRange).toBeNull();
    expect(result.current.selectionPos).toBeNull();
    expect(result.current.cursorPosition).toBe(0);
  });

  it('initializes with editor cursor position', () => {
    const { result } = renderHook(() =>
      useEditorSelection({ editor: mockEditor, currentText: 'test content' })
    );

    expect(result.current.cursorPosition).toBe(10);
  });

  it('sets selection and updates editor', () => {
    const { result } = renderHook(() =>
      useEditorSelection({ editor: mockEditor, currentText: 'test content' })
    );

    act(() => {
      result.current.setSelection(5, 15);
    });

    // Verify editor commands
    expect(chainSpy).toHaveBeenCalled();
    expect(focusSpy).toHaveBeenCalled();
    expect(setTextSelectionSpy).toHaveBeenCalledWith({ from: 5, to: 15 });
    expect(runSpy).toHaveBeenCalled();

    // Verify hook state
    expect(result.current.selectionRange).toEqual({
      start: 5,
      end: 15,
      text: 'selected text',
    });
  });

  it('handles out of bounds selection', () => {
    const { result } = renderHook(() =>
      useEditorSelection({ editor: mockEditor, currentText: 'test content' })
    );

    act(() => {
      result.current.setSelection(-5, 200);
    });

    // Should clamp to 0 and doc size (100)
    expect(setTextSelectionSpy).toHaveBeenCalledWith({ from: 0, to: 100 });
  });

  it('does nothing if editor is null', () => {
    const { result } = renderHook(() =>
      useEditorSelection({ editor: null, currentText: '' })
    );

    act(() => {
      result.current.setSelection(5, 10);
    });

    expect(result.current.selectionRange).toBeNull();
  });

  it('clears selection', () => {
    const { result } = renderHook(() =>
      useEditorSelection({ editor: mockEditor, currentText: 'test' })
    );

    act(() => {
      result.current.setSelectionState(
        { start: 0, end: 5, text: 'test' },
        { top: 10, left: 10 }
      );
    });

    expect(result.current.selectionRange).not.toBeNull();

    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectionRange).toBeNull();
    expect(result.current.selectionPos).toBeNull();
    expect(mockEditor.commands.focus).toHaveBeenCalled();
  });

  it('navigates to issue', () => {
    const { result } = renderHook(() =>
      useEditorSelection({ editor: mockEditor, currentText: 'test' })
    );

    act(() => {
      result.current.handleNavigateToIssue(10, 20);
    });

    expect(result.current.activeHighlight).toEqual({
      start: 10,
      end: 20,
      type: 'issue',
    });
    expect(setTextSelectionSpy).toHaveBeenCalledWith({ from: 10, to: 20 });
  });

  it('scrolls to position', () => {
    const { result } = renderHook(() =>
      useEditorSelection({ editor: mockEditor, currentText: 'test' })
    );

    act(() => {
      result.current.scrollToPosition(50);
    });

    expect(setTextSelectionSpy).toHaveBeenCalledWith(50);
  });

  it('returns correct editor context', () => {
    const { result } = renderHook(() =>
      useEditorSelection({ editor: mockEditor, currentText: 'test content' })
    );

    act(() => {
      result.current.setSelectionState(
        { start: 5, end: 10, text: 'test' },
        null
      );
    });

    const context = result.current.getEditorContext();

    expect(context).toEqual({
      cursorPosition: 10,
      selection: { start: 5, end: 10, text: 'test' },
      totalLength: 12, // 'test content'.length
    });
  });
});
