import { describe, it, expect } from 'vitest';
import * as config from '@/config';
import * as editorFeatures from '@/features/editor';
import * as sharedFeatures from '@/features/shared';
import * as projectFeatures from '@/features/project';

describe('Barrel Exports', () => {
  describe('config', () => {
    it('exports models and api', () => {
      expect(config.ModelConfig).toBeDefined();
      expect(config.ApiDefaults).toBeDefined();
      expect(config.getApiKey).toBeDefined();
    });
  });

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
