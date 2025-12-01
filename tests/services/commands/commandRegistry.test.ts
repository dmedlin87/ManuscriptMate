import { describe, it, expect } from 'vitest';
import { CommandRegistry } from '@/services/commands';

describe('CommandRegistry', () => {
  it('registers default commands and can resolve them', () => {
    // Defaults are registered in constructor
    const allNames = CommandRegistry.getAllNames();

    expect(allNames).toContain('navigate_to_text');
    expect(allNames).toContain('jump_to_chapter');
    expect(allNames).toContain('run_analysis');
    expect(allNames).toContain('switch_panel');
    expect(allNames).toContain('rewrite_selection');

    const meta = CommandRegistry.get('navigate_to_text');
    expect(meta).toBeDefined();
    expect(meta?.category).toBe('navigation');

    const instance = CommandRegistry.create('navigate_to_text');
    expect(instance).toBeDefined();
    expect(typeof instance!.execute).toBe('function');
  });

  it('reports reversibility correctly and groups by category', () => {
    expect(CommandRegistry.isReversible('update_manuscript')).toBe(true);
    expect(CommandRegistry.isReversible('navigate_to_text')).toBe(false);

    const editingCommands = CommandRegistry.getByCategory('editing');
    expect(editingCommands.length).toBeGreaterThan(0);
    expect(editingCommands.some(c => c.name === 'update_manuscript')).toBe(true);
  });

  it('allows registering custom commands at runtime', () => {
    const factory = () => ({
      name: 'custom',
      category: 'ui',
      async execute() {
        return 'done';
      },
    }) as any;

    CommandRegistry.register({
      name: 'custom_command',
      category: 'ui',
      description: 'Custom test command',
      reversible: false,
      factory,
    });

    expect(CommandRegistry.has('custom_command')).toBe(true);

    const meta = CommandRegistry.get('custom_command');
    expect(meta?.description).toBe('Custom test command');

    const instance = CommandRegistry.create('custom_command');
    expect(instance).toBeDefined();
    expect(instance!.execute).toBeTypeOf('function');
  });
});
