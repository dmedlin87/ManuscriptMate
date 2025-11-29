/**
 * Tests for Gemini prompt templates
 * Verifies prompt structure and required placeholders
 */

import { describe, it, expect } from 'vitest';
import {
  ANALYSIS_PROMPT,
  PLOT_IDEAS_PROMPT,
  REWRITE_SYSTEM_INSTRUCTION,
  CONTEXTUAL_HELP_SYSTEM_INSTRUCTION,
  AGENT_SYSTEM_INSTRUCTION,
  LIVE_AGENT_SYSTEM_INSTRUCTION,
  PACING_PROMPT,
  CHARACTER_PROMPT,
  PLOT_PROMPT,
  SETTING_PROMPT,
} from '@/services/gemini/prompts';

describe('ANALYSIS_PROMPT', () => {
  it('is defined and non-empty', () => {
    expect(ANALYSIS_PROMPT).toBeDefined();
    expect(ANALYSIS_PROMPT.length).toBeGreaterThan(100);
  });

  it('contains required placeholders', () => {
    expect(ANALYSIS_PROMPT).toContain('{{SETTING_CONTEXT}}');
    expect(ANALYSIS_PROMPT).toContain('{{INDEX_CONTEXT}}');
    expect(ANALYSIS_PROMPT).toContain('{{SETTING_LABEL}}');
    expect(ANALYSIS_PROMPT).toContain('{{TEXT}}');
  });

  it('includes analysis focus areas', () => {
    expect(ANALYSIS_PROMPT).toContain('PACING & FLOW');
    expect(ANALYSIS_PROMPT).toContain('PLOT HOLES & INCONSISTENCIES');
    expect(ANALYSIS_PROMPT).toContain('CHARACTER ARCS & RELATIONSHIPS');
    expect(ANALYSIS_PROMPT).toContain('SETTING & ERA CONSISTENCY');
  });

  it('requests JSON output format', () => {
    expect(ANALYSIS_PROMPT).toContain('JSON format');
  });
});

describe('PLOT_IDEAS_PROMPT', () => {
  it('is defined and non-empty', () => {
    expect(PLOT_IDEAS_PROMPT).toBeDefined();
    expect(PLOT_IDEAS_PROMPT.length).toBeGreaterThan(100);
  });

  it('contains required placeholders', () => {
    expect(PLOT_IDEAS_PROMPT).toContain('{{SUGGESTION_TYPE}}');
    expect(PLOT_IDEAS_PROMPT).toContain('{{USER_INSTRUCTION}}');
    expect(PLOT_IDEAS_PROMPT).toContain('{{TEXT}}');
  });

  it('includes step structure', () => {
    expect(PLOT_IDEAS_PROMPT).toContain('STEP 1: ANALYZE');
    expect(PLOT_IDEAS_PROMPT).toContain('STEP 2: BRAINSTORM');
  });

  it('specifies quality criteria', () => {
    expect(PLOT_IDEAS_PROMPT).toContain('Specific');
    expect(PLOT_IDEAS_PROMPT).toContain('Integrated');
    expect(PLOT_IDEAS_PROMPT).toContain('Novel');
  });
});

describe('REWRITE_SYSTEM_INSTRUCTION', () => {
  it('is defined and non-empty', () => {
    expect(REWRITE_SYSTEM_INSTRUCTION).toBeDefined();
    expect(REWRITE_SYSTEM_INSTRUCTION.length).toBeGreaterThan(100);
  });

  it('contains setting placeholder', () => {
    expect(REWRITE_SYSTEM_INSTRUCTION).toContain('{{SETTING_INSTRUCTION}}');
  });

  it('includes all edit modes', () => {
    expect(REWRITE_SYSTEM_INSTRUCTION).toContain("Show, Don't Tell");
    expect(REWRITE_SYSTEM_INSTRUCTION).toContain('Dialogue Doctor');
    expect(REWRITE_SYSTEM_INSTRUCTION).toContain('Tone Tuner');
  });

  it('specifies JSON output format', () => {
    expect(REWRITE_SYSTEM_INSTRUCTION).toContain('valid JSON');
    expect(REWRITE_SYSTEM_INSTRUCTION).toContain('variations');
  });

  it('requests 3 variations', () => {
    expect(REWRITE_SYSTEM_INSTRUCTION).toContain('3 distinct');
  });
});

describe('CONTEXTUAL_HELP_SYSTEM_INSTRUCTION', () => {
  it('is defined and non-empty', () => {
    expect(CONTEXTUAL_HELP_SYSTEM_INSTRUCTION).toBeDefined();
    expect(CONTEXTUAL_HELP_SYSTEM_INSTRUCTION.length).toBeGreaterThan(20);
  });

  it('includes help types', () => {
    expect(CONTEXTUAL_HELP_SYSTEM_INSTRUCTION).toContain('Explain');
    expect(CONTEXTUAL_HELP_SYSTEM_INSTRUCTION).toContain('Thesaurus');
  });
});

describe('AGENT_SYSTEM_INSTRUCTION', () => {
  it('is defined and non-empty', () => {
    expect(AGENT_SYSTEM_INSTRUCTION).toBeDefined();
    expect(AGENT_SYSTEM_INSTRUCTION.length).toBeGreaterThan(200);
  });

  it('contains context placeholders', () => {
    expect(AGENT_SYSTEM_INSTRUCTION).toContain('{{LORE_CONTEXT}}');
    expect(AGENT_SYSTEM_INSTRUCTION).toContain('{{ANALYSIS_CONTEXT}}');
    expect(AGENT_SYSTEM_INSTRUCTION).toContain('{{FULL_MANUSCRIPT}}');
  });

  it('defines capabilities', () => {
    expect(AGENT_SYSTEM_INSTRUCTION).toContain('CAPABILITIES');
    expect(AGENT_SYSTEM_INSTRUCTION).toContain('READ');
    expect(AGENT_SYSTEM_INSTRUCTION).toContain('EDIT');
  });

  it('mentions available tools', () => {
    expect(AGENT_SYSTEM_INSTRUCTION).toContain('update_manuscript');
    expect(AGENT_SYSTEM_INSTRUCTION).toContain('undo_last_change');
  });

  it('defines behavior guidelines', () => {
    expect(AGENT_SYSTEM_INSTRUCTION).toContain('BEHAVIOR');
    expect(AGENT_SYSTEM_INSTRUCTION).toContain('ACTIVE CHAPTER');
  });
});

describe('LIVE_AGENT_SYSTEM_INSTRUCTION', () => {
  it('is defined and non-empty', () => {
    expect(LIVE_AGENT_SYSTEM_INSTRUCTION).toBeDefined();
    expect(LIVE_AGENT_SYSTEM_INSTRUCTION.length).toBeGreaterThan(20);
  });

  it('establishes writing coach persona', () => {
    expect(LIVE_AGENT_SYSTEM_INSTRUCTION).toContain('writing coach');
    expect(LIVE_AGENT_SYSTEM_INSTRUCTION).toContain('encouraging');
  });
});

describe('PACING_PROMPT', () => {
  it('is defined and non-empty', () => {
    expect(PACING_PROMPT).toBeDefined();
    expect(PACING_PROMPT.length).toBeGreaterThan(50);
  });

  it('contains required placeholders', () => {
    expect(PACING_PROMPT).toContain('{{SETTING_CONTEXT}}');
    expect(PACING_PROMPT).toContain('{{TEXT}}');
  });

  it('focuses on pacing elements', () => {
    expect(PACING_PROMPT).toContain('rhythm');
    expect(PACING_PROMPT).toContain('flow');
    expect(PACING_PROMPT).toContain('slow');
    expect(PACING_PROMPT).toContain('fast');
  });
});

describe('CHARACTER_PROMPT', () => {
  it('is defined and non-empty', () => {
    expect(CHARACTER_PROMPT).toBeDefined();
    expect(CHARACTER_PROMPT.length).toBeGreaterThan(50);
  });

  it('contains required placeholders', () => {
    expect(CHARACTER_PROMPT).toContain('{{INDEX_CONTEXT}}');
    expect(CHARACTER_PROMPT).toContain('{{TEXT}}');
  });

  it('requests character analysis elements', () => {
    expect(CHARACTER_PROMPT).toContain('Name');
    expect(CHARACTER_PROMPT).toContain('bio');
    expect(CHARACTER_PROMPT).toContain('arc');
    expect(CHARACTER_PROMPT).toContain('Relationships');
  });
});

describe('PLOT_PROMPT', () => {
  it('is defined and non-empty', () => {
    expect(PLOT_PROMPT).toBeDefined();
    expect(PLOT_PROMPT.length).toBeGreaterThan(50);
  });

  it('contains required placeholder', () => {
    expect(PLOT_PROMPT).toContain('{{TEXT}}');
  });

  it('requests plot analysis elements', () => {
    expect(PLOT_PROMPT).toContain('Executive summary');
    expect(PLOT_PROMPT).toContain('strengths');
    expect(PLOT_PROMPT).toContain('weaknesses');
    expect(PLOT_PROMPT).toContain('Plot holes');
  });

  it('requires quotes for issues', () => {
    expect(PLOT_PROMPT).toContain('EXACT QUOTE');
  });
});

describe('SETTING_PROMPT', () => {
  it('is defined and non-empty', () => {
    expect(SETTING_PROMPT).toBeDefined();
    expect(SETTING_PROMPT.length).toBeGreaterThan(50);
  });

  it('contains required placeholders', () => {
    expect(SETTING_PROMPT).toContain('{{TIME_PERIOD}}');
    expect(SETTING_PROMPT).toContain('{{LOCATION}}');
    expect(SETTING_PROMPT).toContain('{{TEXT}}');
  });

  it('focuses on historical accuracy', () => {
    expect(SETTING_PROMPT).toContain('anachronism');
    expect(SETTING_PROMPT).toContain('era');
    expect(SETTING_PROMPT).toContain('historical');
  });

  it('requests alternatives for issues', () => {
    expect(SETTING_PROMPT).toContain('Alternative phrasings');
  });
});
