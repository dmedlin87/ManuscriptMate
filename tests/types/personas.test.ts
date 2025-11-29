import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PERSONAS,
  buildPersonaInstruction,
  Persona,
} from '@/types/personas';

describe('DEFAULT_PERSONAS', () => {
  it('contains three default personas', () => {
    expect(DEFAULT_PERSONAS).toHaveLength(3);
  });

  it('has the architect persona', () => {
    const architect = DEFAULT_PERSONAS.find(p => p.id === 'architect');
    expect(architect).toBeDefined();
    expect(architect?.name).toBe('The Architect');
    expect(architect?.role).toBe('Plot & Structure Specialist');
    expect(architect?.style).toBe('direct');
  });

  it('has the poet persona', () => {
    const poet = DEFAULT_PERSONAS.find(p => p.id === 'poet');
    expect(poet).toBeDefined();
    expect(poet?.name).toBe('The Poet');
    expect(poet?.role).toBe('Prose & Tone Specialist');
    expect(poet?.style).toBe('creative');
  });

  it('has the scholar persona', () => {
    const scholar = DEFAULT_PERSONAS.find(p => p.id === 'scholar');
    expect(scholar).toBeDefined();
    expect(scholar?.name).toBe('The Scholar');
    expect(scholar?.role).toBe('Lore & Consistency Specialist');
    expect(scholar?.style).toBe('socratic');
  });

  it('all personas have required fields', () => {
    DEFAULT_PERSONAS.forEach(persona => {
      expect(persona.id).toBeTruthy();
      expect(persona.name).toBeTruthy();
      expect(persona.role).toBeTruthy();
      expect(persona.systemPrompt).toBeTruthy();
      expect(persona.icon).toBeTruthy();
      expect(persona.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(['direct', 'socratic', 'creative']).toContain(persona.style);
    });
  });
});

describe('buildPersonaInstruction', () => {
  const mockPersona: Persona = {
    id: 'test',
    name: 'Test Persona',
    role: 'Test Role',
    systemPrompt: 'Test system prompt content',
    style: 'direct',
    icon: '🧪',
    color: '#000000',
  };

  it('inserts persona block before manuscript context', () => {
    const baseInstruction = 'Some base text\n\n[FULL MANUSCRIPT CONTEXT]\n\nMore text';
    const result = buildPersonaInstruction(baseInstruction, mockPersona);

    expect(result).toContain('[ACTIVE PERSONA: Test Persona]');
    expect(result).toContain('Test system prompt content');
    expect(result).toContain('STYLE MODE: DIRECT');
  });

  it('includes the persona name in "stay in character" reminder', () => {
    const baseInstruction = '[FULL MANUSCRIPT CONTEXT]';
    const result = buildPersonaInstruction(baseInstruction, mockPersona);

    expect(result).toContain('You ARE Test Persona');
  });

  it('uppercases the style mode', () => {
    const baseInstruction = '[FULL MANUSCRIPT CONTEXT]';
    
    const creativePerson: Persona = { ...mockPersona, style: 'creative' };
    const creativeResult = buildPersonaInstruction(baseInstruction, creativePerson);
    expect(creativeResult).toContain('STYLE MODE: CREATIVE');

    const socraticPerson: Persona = { ...mockPersona, style: 'socratic' };
    const socraticResult = buildPersonaInstruction(baseInstruction, socraticPerson);
    expect(socraticResult).toContain('STYLE MODE: SOCRATIC');
  });

  it('preserves the full manuscript context marker', () => {
    const baseInstruction = 'Before [FULL MANUSCRIPT CONTEXT] After';
    const result = buildPersonaInstruction(baseInstruction, mockPersona);

    expect(result).toContain('[FULL MANUSCRIPT CONTEXT]');
  });

  it('returns original if no manuscript context marker', () => {
    const baseInstruction = 'No marker here';
    const result = buildPersonaInstruction(baseInstruction, mockPersona);

    // Since there's no [FULL MANUSCRIPT CONTEXT] to replace, string is unchanged
    expect(result).toBe(baseInstruction);
  });
});
