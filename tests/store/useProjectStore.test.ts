import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProjectStore } from '@/features/project/store/useProjectStore';

// Mock the database
vi.mock('@/services/db', () => ({
  db: {
    projects: {
      orderBy: vi.fn(() => ({
        reverse: vi.fn(() => ({
          toArray: vi.fn(() => Promise.resolve([]))
        }))
      })),
      get: vi.fn(() => Promise.resolve(null)),
      add: vi.fn(() => Promise.resolve()),
      update: vi.fn(() => Promise.resolve()),
      bulkPut: vi.fn(() => Promise.resolve()),
    },
    chapters: {
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          sortBy: vi.fn(() => Promise.resolve([]))
        }))
      })),
      add: vi.fn(() => Promise.resolve()),
      update: vi.fn(() => Promise.resolve()),
      delete: vi.fn(() => Promise.resolve()),
      bulkAdd: vi.fn(() => Promise.resolve()),
      bulkPut: vi.fn(() => Promise.resolve()),
    }
  }
}));

// Mock manuscriptIndexer
vi.mock('@/services/manuscriptIndexer', () => ({
  createEmptyIndex: vi.fn(() => ({
    characters: {},
    lastUpdated: {},
  }))
}));

describe('useProjectStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    useProjectStore.setState({
      projects: [],
      currentProject: null,
      chapters: [],
      activeChapterId: null,
      isLoading: false,
    });
  });

  describe('initial state', () => {
    it('starts with empty state', () => {
      const state = useProjectStore.getState();
      expect(state.projects).toEqual([]);
      expect(state.currentProject).toBeNull();
      expect(state.chapters).toEqual([]);
      expect(state.activeChapterId).toBeNull();
    });
  });

  describe('selectChapter', () => {
    it('updates activeChapterId', () => {
      const { selectChapter } = useProjectStore.getState();
      selectChapter('test-chapter-id');
      
      expect(useProjectStore.getState().activeChapterId).toBe('test-chapter-id');
    });
  });

  describe('getActiveChapter', () => {
    it('returns undefined when no active chapter', () => {
      const { getActiveChapter } = useProjectStore.getState();
      expect(getActiveChapter()).toBeUndefined();
    });

    it('returns the active chapter when set', () => {
      const testChapter = {
        id: 'chapter-1',
        projectId: 'project-1',
        title: 'Test Chapter',
        content: 'Test content',
        order: 0,
        updatedAt: Date.now(),
      };

      useProjectStore.setState({
        chapters: [testChapter],
        activeChapterId: 'chapter-1',
      });

      const { getActiveChapter } = useProjectStore.getState();
      const active = getActiveChapter();
      
      expect(active?.title).toBe('Test Chapter');
      expect(active?.content).toBe('Test content');
    });
  });

  describe('chapter state updates', () => {
    it('updates chapter content in local state', async () => {
      const testChapter = {
        id: 'chapter-1',
        projectId: 'project-1',
        title: 'Test Chapter',
        content: 'Original content',
        order: 0,
        updatedAt: Date.now(),
      };

      const testProject = {
        id: 'project-1',
        title: 'Test Project',
        author: 'Test Author',
        manuscriptIndex: { characters: {}, lastUpdated: {} },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      useProjectStore.setState({
        currentProject: testProject,
        chapters: [testChapter],
        activeChapterId: 'chapter-1',
      });

      const { updateChapterContent } = useProjectStore.getState();
      await updateChapterContent('chapter-1', 'Updated content');

      const updated = useProjectStore.getState().chapters[0];
      expect(updated.content).toBe('Updated content');
    });

    it('updates chapter title in local state', async () => {
      const testChapter = {
        id: 'chapter-1',
        projectId: 'project-1',
        title: 'Original Title',
        content: 'Content',
        order: 0,
        updatedAt: Date.now(),
      };

      useProjectStore.setState({
        chapters: [testChapter],
        activeChapterId: 'chapter-1',
      });

      const { updateChapterTitle } = useProjectStore.getState();
      await updateChapterTitle('chapter-1', 'New Title');

      const updated = useProjectStore.getState().chapters[0];
      expect(updated.title).toBe('New Title');
    });
  });

  describe('deleteChapter', () => {
    it('removes chapter and updates active', async () => {
      const chapters = [
        { id: 'chapter-1', projectId: 'p1', title: 'Ch 1', content: '', order: 0, updatedAt: 0 },
        { id: 'chapter-2', projectId: 'p1', title: 'Ch 2', content: '', order: 1, updatedAt: 0 },
      ];

      useProjectStore.setState({
        chapters,
        activeChapterId: 'chapter-1',
      });

      const { deleteChapter } = useProjectStore.getState();
      await deleteChapter('chapter-1');

      const state = useProjectStore.getState();
      expect(state.chapters).toHaveLength(1);
      expect(state.chapters[0].id).toBe('chapter-2');
      expect(state.activeChapterId).toBe('chapter-2');
    });
  });
});
