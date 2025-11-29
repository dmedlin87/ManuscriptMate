import { describe, it, expect, vi } from 'vitest';
import * as editorFeatures from '@/features/editor';
import * as sharedFeatures from '@/features/shared';
import * as projectFeatures from '@/features/project';

// Prevent real Gemini client initialization when loading barrels
vi.mock('@/services/gemini/client', () => ({
  ai: {},
  isApiConfigured: () => false,
  getApiStatus: () => ({ configured: false, error: 'mocked in tests' }),
}));

describe('Barrel Exports', () => {
  describe('features/editor', () => {
    it('exports main editor components', () => {
      expect(editorFeatures.RichTextEditor).toBeDefined();
      expect(editorFeatures.EditorWorkspace).toBeDefined();
    });
  });

  describe('features/shared', () => {
    it('exports shared contexts and hooks', () => {
      expect(sharedFeatures.useEditor).toBeDefined();
      expect(sharedFeatures.useEngine).toBeDefined();
      expect(sharedFeatures.UsageBadge).toBeDefined();
      expect(sharedFeatures.ErrorBoundary).toBeDefined();
    });
  });

  describe('features/project', () => {
    it('exports project components', () => {
      expect(projectFeatures.ProjectDashboard).toBeDefined();
      expect(projectFeatures.useProjectStore).toBeDefined();
    });
  });
});
