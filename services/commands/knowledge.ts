import type { AppBrainCommand, KnowledgeDependencies } from './types';

export class QueryLoreCommand
  implements AppBrainCommand<string, string, KnowledgeDependencies>
{
  async execute(query: string, deps: KnowledgeDependencies): Promise<string> {
    const lore = deps.lore;
    if (!lore) {
      return 'No lore data available for this project.';
    }

    const lowerQuery = query.toLowerCase();

    const matchingChars = lore.characters.filter(
      (c) =>
        c.name.toLowerCase().includes(lowerQuery) ||
        c.bio?.toLowerCase().includes(lowerQuery) ||
        c.arc?.toLowerCase().includes(lowerQuery),
    );

    const matchingRules = lore.worldRules.filter((r) =>
      r.toLowerCase().includes(lowerQuery),
    );

    let result = '';
    if (matchingChars.length > 0) {
      result += 'Characters:\n';
      matchingChars.forEach((c) => {
        result += `• ${c.name}: ${c.bio?.slice(0, 100) || 'No bio'}...\n`;
      });
    }
    if (matchingRules.length > 0) {
      result += '\nWorld Rules:\n';
      matchingRules.forEach((r) => {
        result += `• ${r}\n`;
      });
    }

    return result || `No lore found matching "${query}"`;
  }
}

export class GetCharacterInfoCommand
  implements AppBrainCommand<string, string, KnowledgeDependencies>
{
  async execute(name: string, deps: KnowledgeDependencies): Promise<string> {
    const lore = deps.lore;
    const char = lore?.characters.find(
      (c) => c.name.toLowerCase() === name.toLowerCase(),
    );

    if (!char) {
      return `Character "${name}" not found in lore.`;
    }

    let info = `**${char.name}**\n\n`;
    if (char.bio) info += `Bio: ${char.bio}\n\n`;
    if (char.arc) info += `Arc: ${char.arc}\n\n`;
    if (char.relationships && char.relationships.length > 0) {
      info += `Relationships: ${char.relationships.join(', ')}\n\n`;
    }
    if (char.inconsistencies && char.inconsistencies.length > 0) {
      info += `⚠️ Inconsistencies:\n`;
      char.inconsistencies.forEach((i) => {
        info += `• ${i.issue}\n`;
      });
    }

    return info;
  }
}
