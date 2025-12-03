/**
 * Character Context Extractor
 *
 * Aggregates character information from multiple sources (lore, manuscript index,
 * entity graph) to provide comprehensive context for image generation and other uses.
 */

import { CharacterProfile } from '../../types';
import { CharacterIndex, EntityAttribute } from '../../types/schema';
import { EntityNode, EntityGraph } from '../../types/intelligence';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ComprehensiveCharacterContext {
  // Core identity
  name: string;
  aliases: string[];

  // Narrative data (from lore)
  bio?: string;
  arc?: string;
  arcStages?: Array<{ stage: string; description: string }>;
  voiceTraits?: string;

  // Visual data
  physicalAppearance?: string;
  visualAttributes?: CharacterProfile['visualAttributes'];
  appearanceEvolution?: CharacterProfile['appearanceEvolution'];

  // Extracted attributes (from manuscript index)
  extractedAttributes: Record<string, EntityAttribute[]>;

  // Relationships
  relationships: Array<{
    name: string;
    type: string;
    dynamic: string;
  }>;

  // Plot involvement
  plotThreads: string[];
  mentions: Array<{ chapterId: string; position: number }>;
  firstMention: { chapterId: string; position: number } | null;
  mentionCount: number;

  // Consistency tracking
  inconsistencies: Array<{
    issue: string;
    quote?: string;
    startIndex?: number;
    endIndex?: number;
  }>;

  // Development notes
  developmentSuggestion?: string;
}

export interface ImagePromptData {
  name: string;
  description: string;
  detailedAttributes: string[];
  styleNotes: string[];
  contextualInfo: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract comprehensive context for a character from all available sources
 */
export function extractCharacterContext(
  characterName: string,
  loreCharacters: CharacterProfile[],
  manuscriptIndex: Record<string, CharacterIndex> | undefined,
  entityGraph: EntityGraph | null
): ComprehensiveCharacterContext | null {
  // Find the character in lore
  const loreProfile = loreCharacters.find(
    (c) => c.name.toLowerCase() === characterName.toLowerCase()
  );

  // Find in manuscript index
  const indexEntry = manuscriptIndex?.[characterName];

  // Find in entity graph
  const entityNode = entityGraph?.nodes.find(
    (n) => n.type === 'character' &&
           (n.name.toLowerCase() === characterName.toLowerCase() ||
            n.aliases.some((a) => a.toLowerCase() === characterName.toLowerCase()))
  );

  // If character not found in any source, return null
  if (!loreProfile && !indexEntry && !entityNode) {
    return null;
  }

  // Aggregate all aliases
  const aliases = new Set<string>();
  if (entityNode?.aliases) {
    entityNode.aliases.forEach((a) => aliases.add(a));
  }

  // Build comprehensive context
  const context: ComprehensiveCharacterContext = {
    name: loreProfile?.name || indexEntry?.name || entityNode?.name || characterName,
    aliases: Array.from(aliases),

    // From lore
    bio: loreProfile?.bio,
    arc: loreProfile?.arc,
    arcStages: loreProfile?.arcStages,
    voiceTraits: loreProfile?.voiceTraits,
    physicalAppearance: loreProfile?.physicalAppearance,
    visualAttributes: loreProfile?.visualAttributes,
    appearanceEvolution: loreProfile?.appearanceEvolution,

    // From manuscript index
    extractedAttributes: indexEntry?.attributes || {},

    // Relationships
    relationships: loreProfile?.relationships || [],

    // Plot involvement
    plotThreads: loreProfile?.plotThreads || [],
    mentions: indexEntry?.mentions || entityNode?.mentions || [],
    firstMention: indexEntry?.firstMention ||
                   (entityNode?.firstMention !== undefined
                     ? { chapterId: '', position: entityNode.firstMention }
                     : null),
    mentionCount: entityNode?.mentionCount || indexEntry?.mentions?.length || 0,

    // Consistency
    inconsistencies: loreProfile?.inconsistencies || [],

    // Development
    developmentSuggestion: loreProfile?.developmentSuggestion,
  };

  return context;
}

/**
 * Extract context for multiple characters
 */
export function extractMultipleCharacterContexts(
  characterNames: string[],
  loreCharacters: CharacterProfile[],
  manuscriptIndex: Record<string, CharacterIndex> | undefined,
  entityGraph: EntityGraph | null
): Record<string, ComprehensiveCharacterContext> {
  const contexts: Record<string, ComprehensiveCharacterContext> = {};

  for (const name of characterNames) {
    const context = extractCharacterContext(
      name,
      loreCharacters,
      manuscriptIndex,
      entityGraph
    );
    if (context) {
      contexts[name] = context;
    }
  }

  return contexts;
}

/**
 * Get all available characters from all sources
 */
export function getAllCharacterNames(
  loreCharacters: CharacterProfile[],
  manuscriptIndex: Record<string, CharacterIndex> | undefined,
  entityGraph: EntityGraph | null
): string[] {
  const names = new Set<string>();

  // From lore
  loreCharacters.forEach((c) => names.add(c.name));

  // From manuscript index
  if (manuscriptIndex) {
    Object.keys(manuscriptIndex).forEach((name) => names.add(name));
  }

  // From entity graph
  entityGraph?.nodes
    .filter((n) => n.type === 'character')
    .forEach((n) => names.add(n.name));

  return Array.from(names).sort();
}

// ─────────────────────────────────────────────────────────────────────────────
// VISUAL DESCRIPTION UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a consolidated visual description from all available sources
 */
export function buildVisualDescription(
  context: ComprehensiveCharacterContext
): string {
  const parts: string[] = [];

  // Start with explicit physical appearance if available
  if (context.physicalAppearance) {
    parts.push(context.physicalAppearance);
  }

  // Add structured visual attributes
  if (context.visualAttributes) {
    const attrs = context.visualAttributes;
    const descriptions: string[] = [];

    if (attrs.age) descriptions.push(`${attrs.age} years old`);
    if (attrs.gender) descriptions.push(attrs.gender);
    if (attrs.height) descriptions.push(`${attrs.height} tall`);
    if (attrs.build) descriptions.push(`${attrs.build} build`);
    if (attrs.hairColor && attrs.hairStyle) {
      descriptions.push(`${attrs.hairColor} ${attrs.hairStyle} hair`);
    } else if (attrs.hairColor) {
      descriptions.push(`${attrs.hairColor} hair`);
    } else if (attrs.hairStyle) {
      descriptions.push(`${attrs.hairStyle} hair`);
    }
    if (attrs.eyeColor) descriptions.push(`${attrs.eyeColor} eyes`);
    if (attrs.skinTone) descriptions.push(`${attrs.skinTone} skin`);

    if (descriptions.length > 0) {
      parts.push(descriptions.join(', '));
    }

    if (attrs.facialFeatures && attrs.facialFeatures.length > 0) {
      parts.push(`Facial features: ${attrs.facialFeatures.join(', ')}`);
    }

    if (attrs.distinguishingMarks && attrs.distinguishingMarks.length > 0) {
      parts.push(`Distinguishing marks: ${attrs.distinguishingMarks.join(', ')}`);
    }

    if (attrs.typicalClothing) {
      parts.push(`Typically wears: ${attrs.typicalClothing}`);
    }

    if (attrs.accessories && attrs.accessories.length > 0) {
      parts.push(`Accessories: ${attrs.accessories.join(', ')}`);
    }
  }

  // Add attributes from manuscript extraction
  if (Object.keys(context.extractedAttributes).length > 0) {
    const extractedParts: string[] = [];

    for (const [attrName, values] of Object.entries(context.extractedAttributes)) {
      if (values.length > 0) {
        // Use the most recent value
        const latestValue = values[values.length - 1].value;
        extractedParts.push(`${attrName}: ${latestValue}`);
      }
    }

    if (extractedParts.length > 0) {
      parts.push(`Extracted details: ${extractedParts.join('; ')}`);
    }
  }

  return parts.join('. ') || 'No visual description available.';
}

/**
 * Build an image generation prompt from character context
 */
export function buildImagePrompt(
  context: ComprehensiveCharacterContext,
  additionalContext?: string
): ImagePromptData {
  const detailedAttributes: string[] = [];
  const styleNotes: string[] = [];
  const contextualInfo: string[] = [];

  // Build description
  let description = buildVisualDescription(context);

  // Add detailed attributes
  if (context.visualAttributes) {
    const attrs = context.visualAttributes;

    if (attrs.age) detailedAttributes.push(`Age: ${attrs.age}`);
    if (attrs.gender) detailedAttributes.push(`Gender: ${attrs.gender}`);
    if (attrs.height) detailedAttributes.push(`Height: ${attrs.height}`);
    if (attrs.build) detailedAttributes.push(`Build: ${attrs.build}`);
    if (attrs.hairColor) detailedAttributes.push(`Hair color: ${attrs.hairColor}`);
    if (attrs.hairStyle) detailedAttributes.push(`Hair style: ${attrs.hairStyle}`);
    if (attrs.eyeColor) detailedAttributes.push(`Eye color: ${attrs.eyeColor}`);
    if (attrs.skinTone) detailedAttributes.push(`Skin tone: ${attrs.skinTone}`);

    if (attrs.facialFeatures) {
      attrs.facialFeatures.forEach((f) => detailedAttributes.push(`Facial: ${f}`));
    }

    if (attrs.distinguishingMarks) {
      attrs.distinguishingMarks.forEach((m) => detailedAttributes.push(`Mark: ${m}`));
    }

    if (attrs.typicalClothing) {
      styleNotes.push(`Clothing: ${attrs.typicalClothing}`);
    }

    if (attrs.accessories) {
      attrs.accessories.forEach((a) => styleNotes.push(`Accessory: ${a}`));
    }
  }

  // Add character context
  if (context.bio) {
    contextualInfo.push(`Bio: ${context.bio.slice(0, 200)}${context.bio.length > 200 ? '...' : ''}`);
  }

  if (context.arc) {
    contextualInfo.push(`Arc: ${context.arc.slice(0, 150)}${context.arc.length > 150 ? '...' : ''}`);
  }

  if (context.voiceTraits) {
    contextualInfo.push(`Personality traits: ${context.voiceTraits}`);
  }

  if (additionalContext) {
    contextualInfo.push(additionalContext);
  }

  return {
    name: context.name,
    description,
    detailedAttributes,
    styleNotes,
    contextualInfo,
  };
}

/**
 * Format image prompt data as a single string suitable for image generation APIs
 */
export function formatImagePromptString(promptData: ImagePromptData): string {
  const parts: string[] = [];

  parts.push(`Character: ${promptData.name}`);
  parts.push(`Description: ${promptData.description}`);

  if (promptData.detailedAttributes.length > 0) {
    parts.push(`Details: ${promptData.detailedAttributes.join(', ')}`);
  }

  if (promptData.styleNotes.length > 0) {
    parts.push(`Style: ${promptData.styleNotes.join(', ')}`);
  }

  if (promptData.contextualInfo.length > 0) {
    parts.push(`Context: ${promptData.contextualInfo.join(' | ')}`);
  }

  return parts.join('\n');
}

/**
 * Extract visual attributes from manuscript index attributes
 */
export function extractVisualAttributesFromIndex(
  characterIndex: CharacterIndex
): CharacterProfile['visualAttributes'] {
  const attrs: Record<string, EntityAttribute[]> = characterIndex.attributes;
  const visual: CharacterProfile['visualAttributes'] = {};

  // Map common attribute names to visual attributes
  const attributeMap: Record<string, keyof NonNullable<CharacterProfile['visualAttributes']>> = {
    'age': 'age',
    'gender': 'gender',
    'height': 'height',
    'build': 'build',
    'hair color': 'hairColor',
    'hair_color': 'hairColor',
    'hair style': 'hairStyle',
    'hair_style': 'hairStyle',
    'eye color': 'eyeColor',
    'eye_color': 'eyeColor',
    'skin tone': 'skinTone',
    'skin_tone': 'skinTone',
    'clothing': 'typicalClothing',
  };

  for (const [attrName, values] of Object.entries(attrs)) {
    const normalizedName = attrName.toLowerCase();
    const mappedKey = attributeMap[normalizedName];

    if (mappedKey && values.length > 0) {
      const latestValue = values[values.length - 1].value;

      // Handle array vs string attributes
      if (mappedKey === 'facialFeatures' || mappedKey === 'distinguishingMarks' || mappedKey === 'accessories') {
        visual[mappedKey] = [latestValue];
      } else {
        (visual as any)[mappedKey] = latestValue;
      }
    }
  }

  return Object.keys(visual).length > 0 ? visual : undefined;
}

/**
 * Get character context at a specific story stage (for appearance evolution)
 */
export function getCharacterAtStage(
  context: ComprehensiveCharacterContext,
  stage: string
): ComprehensiveCharacterContext {
  if (!context.appearanceEvolution || context.appearanceEvolution.length === 0) {
    return context;
  }

  const stageAppearance = context.appearanceEvolution.find(
    (evo) => evo.stage.toLowerCase() === stage.toLowerCase()
  );

  if (!stageAppearance) {
    return context;
  }

  // Create a modified context with stage-specific appearance
  return {
    ...context,
    physicalAppearance: stageAppearance.description,
  };
}
