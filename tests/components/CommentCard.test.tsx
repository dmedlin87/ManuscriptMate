import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import { CommentCard } from '@/features/editor/components/CommentCard';
import type { CommentMarkAttributes } from '@/features/editor/extensions/CommentMark';

const baseComment: CommentMarkAttributes & { quote?: string } = {
  commentId: 'c-1',
  type: 'plot',
  issue: 'A plot issue',
  suggestion: 'A helpful suggestion',
  severity: 'warning',
  quote: 'Highlighted text',
};

describe('CommentCard', () => {
  it('renders issue, suggestion and highlighted quote', () => {
    const onClose = vi.fn();
    const onFixWithAgent = vi.fn();
    const onDismiss = vi.fn();

    render(
      <CommentCard
        comment={baseComment}
        position={{ top: 100, left: 120 }}
        onClose={onClose}
        onFixWithAgent={onFixWithAgent}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText('Issue')).toBeInTheDocument();
    expect(screen.getByText(baseComment.issue)).toBeInTheDocument();
    expect(screen.getByText('Suggestion')).toBeInTheDocument();
    expect(screen.getByText(baseComment.suggestion)).toBeInTheDocument();
    // Header label for the highlighted quote
    expect(
      screen.getByRole('heading', { name: /Highlighted Text/i })
    ).toBeInTheDocument();
  });

  it('calls onFixWithAgent with comment details', () => {
    const onClose = vi.fn();
    const onFixWithAgent = vi.fn();
    const onDismiss = vi.fn();

    render(
      <CommentCard
        comment={baseComment}
        position={{ top: 50, left: 60 }}
        onClose={onClose}
        onFixWithAgent={onFixWithAgent}
        onDismiss={onDismiss}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /fix with agent/i }));

    expect(onFixWithAgent).toHaveBeenCalledWith(
      baseComment.issue,
      baseComment.suggestion,
      baseComment.quote,
    );
  });

  it('calls onDismiss with the comment id', () => {
    const onClose = vi.fn();
    const onFixWithAgent = vi.fn();
    const onDismiss = vi.fn();

    render(
      <CommentCard
        comment={baseComment}
        position={{ top: 10, left: 10 }}
        onClose={onClose}
        onFixWithAgent={onFixWithAgent}
        onDismiss={onDismiss}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));

    expect(onDismiss).toHaveBeenCalledWith(baseComment.commentId);
  });

  it('closes when Escape is pressed', () => {
    const onClose = vi.fn();

    render(
      <CommentCard
        comment={baseComment}
        position={{ top: 10, left: 10 }}
        onClose={onClose}
        onFixWithAgent={vi.fn()}
        onDismiss={vi.fn()}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
  });

  it('repositions when near viewport edges', async () => {
    const onClose = vi.fn();
    const onFixWithAgent = vi.fn();
    const onDismiss = vi.fn();

    const getBoundingClientRectMock = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({
        width: 200,
        height: 200,
        top: 0,
        left: 0,
        bottom: 200,
        right: 200,
        x: 0,
        y: 0,
        toJSON: () => {},
      } as DOMRect);

    const innerWidthSpy = vi
      .spyOn(window, 'innerWidth', 'get')
      .mockReturnValue(300);
    const innerHeightSpy = vi
      .spyOn(window, 'innerHeight', 'get')
      .mockReturnValue(400);

    const { container } = render(
      <CommentCard
        comment={baseComment}
        position={{ top: 300, left: 200 }}
        onClose={onClose}
        onFixWithAgent={onFixWithAgent}
        onDismiss={onDismiss}
      />
    );

    const card = container.firstChild as HTMLDivElement;

    try {
      await waitFor(() => {
        expect(card.style.top).toBe('70px');
        expect(card.style.left).toBe('80px');
      });
    } finally {
      getBoundingClientRectMock.mockRestore();
      innerWidthSpy.mockRestore();
      innerHeightSpy.mockRestore();
    }
  });

  it('clamps left position when too close to the edge', async () => {
    const onClose = vi.fn();

    const getBoundingClientRectMock = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({
        width: 180,
        height: 100,
        top: 0,
        left: 0,
        bottom: 100,
        right: 180,
        x: 0,
        y: 0,
        toJSON: () => {},
      } as DOMRect);

    const innerWidthSpy = vi
      .spyOn(window, 'innerWidth', 'get')
      .mockReturnValue(200);
    const innerHeightSpy = vi
      .spyOn(window, 'innerHeight', 'get')
      .mockReturnValue(400);

    const { container } = render(
      <CommentCard
        comment={baseComment}
        position={{ top: 10, left: 0 }}
        onClose={onClose}
        onFixWithAgent={vi.fn()}
        onDismiss={vi.fn()}
      />
    );

    const card = container.firstChild as HTMLDivElement;

    try {
      await waitFor(() => {
        expect(card.style.left).toBe('20px');
      });
    } finally {
      getBoundingClientRectMock.mockRestore();
      innerWidthSpy.mockRestore();
      innerHeightSpy.mockRestore();
    }
  });
});
