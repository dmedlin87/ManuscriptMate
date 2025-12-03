/**
 * Image Prompt Builder
 *
 * Utilities for building image generation prompts from character context,
 * optimized for different image generation APIs and use cases.
 */

import { ComprehensiveCharacterContext } from './characterContextExtractor';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type ImageStyle =
  | 'photorealistic'
  | 'digital-art'
  | 'oil-painting'
  | 'watercolor'
  | 'sketch'
  | 'anime'
  | 'comic-book'
  | 'fantasy-art'
  | 'noir'
  | 'cinematic';

export type ImageFraming =
  | 'portrait'
  | 'full-body'
  | 'headshot'
  | 'action-shot'
  | 'environmental';

export interface ImagePromptOptions {
  style?: ImageStyle;
  framing?: ImageFraming;
  setting?: string;
  mood?: string;
  lighting?: string;
  additionalDetails?: string[];
  negativePrompt?: string[];
  emphasize?: string[]; // Elements to emphasize in the prompt
}

export interface FormattedImagePrompt {
  mainPrompt: string;
  negativePrompt?: string;
  metadata: {
    characterName: string;
    style?: ImageStyle;
    framing?: ImageFraming;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLE TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

const STYLE_MODIFIERS: Record<ImageStyle, string> = {
  'photorealistic': 'photorealistic, highly detailed, 8k resolution, professional photography',
  'digital-art': 'digital art, highly detailed, concept art, trending on artstation',
  'oil-painting': 'oil painting, classical style, painterly, masterful brushwork',
  'watercolor': 'watercolor painting, soft colors, flowing, artistic',
  'sketch': 'pencil sketch, hand-drawn, detailed linework, artistic',
  'anime': 'anime style, manga art, cel shaded, Japanese animation',
  'comic-book': 'comic book art, graphic novel style, bold lines, vibrant colors',
  'fantasy-art': 'fantasy art, epic, detailed, magical atmosphere, dramatic',
  'noir': 'film noir style, high contrast, dramatic shadows, black and white',
  'cinematic': 'cinematic lighting, movie still, dramatic composition, professional',
};

const FRAMING_MODIFIERS: Record<ImageFraming, string> = {
  'portrait': 'portrait shot, head and shoulders, focused on face',
  'full-body': 'full body shot, entire figure visible, standing pose',
  'headshot': 'close-up headshot, facial details, intimate framing',
  'action-shot': 'dynamic action pose, movement, energetic',
  'environmental': 'environmental portrait, character in setting, contextual',
};

const DEFAULT_NEGATIVE_PROMPT = [
  'blurry',
  'low quality',
  'distorted',
  'deformed',
  'duplicate',
  'watermark',
  'signature',
];

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT BUILDING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a complete image generation prompt from character context
 */
export function buildCharacterImagePrompt(
  context: ComprehensiveCharacterContext,
  options: ImagePromptOptions = {}
): FormattedImagePrompt {
  const parts: string[] = [];

  // Start with framing
  if (options.framing) {
    parts.push(FRAMING_MODIFIERS[options.framing]);
  }

  // Add character description
  parts.push(`Character named ${context.name}`);

  // Physical appearance
  if (context.physicalAppearance) {
    parts.push(context.physicalAppearance);
  }

  // Add structured visual attributes
  if (context.visualAttributes) {
    const attrs = context.visualAttributes;
    const attrParts: string[] = [];

    if (attrs.age) attrParts.push(`${attrs.age} years old`);
    if (attrs.gender) attrParts.push(attrs.gender);
    if (attrs.height) attrParts.push(`${attrs.height} height`);
    if (attrs.build) attrParts.push(`${attrs.build} build`);

    if (attrs.hairColor && attrs.hairStyle) {
      attrParts.push(`${attrs.hairColor} ${attrs.hairStyle} hair`);
    } else if (attrs.hairColor) {
      attrParts.push(`${attrs.hairColor} hair`);
    } else if (attrs.hairStyle) {
      attrParts.push(`${attrs.hairStyle} hair`);
    }

    if (attrs.eyeColor) attrParts.push(`${attrs.eyeColor} eyes`);
    if (attrs.skinTone) attrParts.push(`${attrs.skinTone} skin`);

    if (attrs.facialFeatures && attrs.facialFeatures.length > 0) {
      attrParts.push(...attrs.facialFeatures);
    }

    if (attrs.distinguishingMarks && attrs.distinguishingMarks.length > 0) {
      attrParts.push(...attrs.distinguishingMarks);
    }

    if (attrs.typicalClothing) {
      attrParts.push(`wearing ${attrs.typicalClothing}`);
    }

    if (attrs.accessories && attrs.accessories.length > 0) {
      attrParts.push(`with ${attrs.accessories.join(', ')}`);
    }

    if (attrParts.length > 0) {
      parts.push(attrParts.join(', '));
    }
  }

  // Add setting if provided
  if (options.setting) {
    parts.push(`in ${options.setting}`);
  }

  // Add mood
  if (options.mood) {
    parts.push(`${options.mood} mood`);
  }

  // Add lighting
  if (options.lighting) {
    parts.push(`${options.lighting} lighting`);
  }

  // Add emphasized elements
  if (options.emphasize && options.emphasize.length > 0) {
    options.emphasize.forEach((element) => {
      parts.push(`emphasis on ${element}`);
    });
  }

  // Add additional details
  if (options.additionalDetails && options.additionalDetails.length > 0) {
    parts.push(...options.additionalDetails);
  }

  // Add style modifiers at the end
  if (options.style) {
    parts.push(STYLE_MODIFIERS[options.style]);
  }

  // Build negative prompt
  const negativePromptParts = [...DEFAULT_NEGATIVE_PROMPT];
  if (options.negativePrompt && options.negativePrompt.length > 0) {
    negativePromptParts.push(...options.negativePrompt);
  }

  return {
    mainPrompt: parts.join(', '),
    negativePrompt: negativePromptParts.join(', '),
    metadata: {
      characterName: context.name,
      style: options.style,
      framing: options.framing,
    },
  };
}

/**
 * Build a prompt for character comparison (e.g., before/after, different stages)
 */
export function buildCharacterComparisonPrompt(
  character1: ComprehensiveCharacterContext,
  character2: ComprehensiveCharacterContext,
  options: ImagePromptOptions = {}
): FormattedImagePrompt {
  const parts: string[] = [];

  parts.push('side by side comparison');

  // Character 1
  parts.push(`Left: ${character1.name}`);
  if (character1.physicalAppearance) {
    parts.push(character1.physicalAppearance);
  }

  // Character 2
  parts.push(`Right: ${character2.name}`);
  if (character2.physicalAppearance) {
    parts.push(character2.physicalAppearance);
  }

  // Add style
  if (options.style) {
    parts.push(STYLE_MODIFIERS[options.style]);
  }

  return {
    mainPrompt: parts.join(', '),
    negativePrompt: DEFAULT_NEGATIVE_PROMPT.join(', '),
    metadata: {
      characterName: `${character1.name} vs ${character2.name}`,
      style: options.style,
    },
  };
}

/**
 * Build a scene prompt with multiple characters
 */
export function buildScenePrompt(
  characters: ComprehensiveCharacterContext[],
  sceneDescription: string,
  options: ImagePromptOptions = {}
): FormattedImagePrompt {
  const parts: string[] = [];

  // Scene description first
  parts.push(sceneDescription);

  // Add each character
  characters.forEach((character, idx) => {
    parts.push(`Character ${idx + 1}: ${character.name}`);

    if (character.physicalAppearance) {
      parts.push(character.physicalAppearance);
    } else if (character.visualAttributes) {
      const attrs = character.visualAttributes;
      const charParts: string[] = [];

      if (attrs.hairColor) charParts.push(`${attrs.hairColor} hair`);
      if (attrs.eyeColor) charParts.push(`${attrs.eyeColor} eyes`);
      if (attrs.build) charParts.push(`${attrs.build} build`);
      if (attrs.typicalClothing) charParts.push(`wearing ${attrs.typicalClothing}`);

      if (charParts.length > 0) {
        parts.push(charParts.join(', '));
      }
    }
  });

  // Add options
  if (options.mood) parts.push(`${options.mood} mood`);
  if (options.lighting) parts.push(`${options.lighting} lighting`);
  if (options.style) parts.push(STYLE_MODIFIERS[options.style]);

  return {
    mainPrompt: parts.join(', '),
    negativePrompt: DEFAULT_NEGATIVE_PROMPT.join(', '),
    metadata: {
      characterName: characters.map((c) => c.name).join(', '),
      style: options.style,
    },
  };
}

/**
 * Build a prompt optimized for DALL-E 3
 */
export function buildDALLE3Prompt(
  context: ComprehensiveCharacterContext,
  options: ImagePromptOptions = {}
): string {
  // DALL-E 3 prefers natural language descriptions
  const parts: string[] = [];

  // Start with framing and style
  if (options.framing) {
    parts.push(`A ${options.framing.replace('-', ' ')}`);
  } else {
    parts.push('An image');
  }

  if (options.style) {
    parts.push(`in ${options.style.replace('-', ' ')} style`);
  }

  // Character description
  parts.push(`of ${context.name}`);

  if (context.physicalAppearance) {
    parts.push(`. ${context.physicalAppearance}.`);
  }

  // Visual attributes
  if (context.visualAttributes) {
    const attrs = context.visualAttributes;
    const attrDesc: string[] = [];

    if (attrs.age) attrDesc.push(`They are ${attrs.age} years old`);
    if (attrs.hairColor && attrs.hairStyle) {
      attrDesc.push(`with ${attrs.hairColor} ${attrs.hairStyle} hair`);
    }
    if (attrs.eyeColor) attrDesc.push(`and ${attrs.eyeColor} eyes`);
    if (attrs.typicalClothing) attrDesc.push(`. They wear ${attrs.typicalClothing}`);

    if (attrDesc.length > 0) {
      parts.push(attrDesc.join(' '));
    }
  }

  // Setting and mood
  if (options.setting) {
    parts.push(`. The setting is ${options.setting}`);
  }

  if (options.mood) {
    parts.push(`. The mood is ${options.mood}`);
  }

  if (options.lighting) {
    parts.push(` with ${options.lighting} lighting`);
  }

  return parts.join('') + '.';
}

/**
 * Build a prompt optimized for Stable Diffusion
 */
export function buildStableDiffusionPrompt(
  context: ComprehensiveCharacterContext,
  options: ImagePromptOptions = {}
): { prompt: string; negativePrompt: string } {
  // Stable Diffusion works best with comma-separated tags
  const formatted = buildCharacterImagePrompt(context, options);

  // Add quality tags
  const qualityTags = [
    'masterpiece',
    'best quality',
    'highly detailed',
    'sharp focus',
  ];

  const prompt = `${qualityTags.join(', ')}, ${formatted.mainPrompt}`;

  // Enhanced negative prompt for Stable Diffusion
  const negativePrompt = [
    ...DEFAULT_NEGATIVE_PROMPT,
    'worst quality',
    'low quality',
    'normal quality',
    'lowres',
    'bad anatomy',
    'bad hands',
    'text',
    'error',
    'missing fingers',
    'extra digit',
    'fewer digits',
    'cropped',
    ...(options.negativePrompt || []),
  ].join(', ');

  return { prompt, negativePrompt };
}

/**
 * Extract key visual elements from character context for tagging
 */
export function extractVisualTags(
  context: ComprehensiveCharacterContext
): string[] {
  const tags: string[] = [];

  tags.push(context.name);

  if (context.visualAttributes) {
    const attrs = context.visualAttributes;

    if (attrs.gender) tags.push(attrs.gender);
    if (attrs.age) tags.push(`${attrs.age} years old`);
    if (attrs.hairColor) tags.push(`${attrs.hairColor} hair`);
    if (attrs.eyeColor) tags.push(`${attrs.eyeColor} eyes`);
    if (attrs.build) tags.push(`${attrs.build} build`);
    if (attrs.skinTone) tags.push(attrs.skinTone);

    if (attrs.facialFeatures) {
      tags.push(...attrs.facialFeatures);
    }

    if (attrs.distinguishingMarks) {
      tags.push(...attrs.distinguishingMarks);
    }

    if (attrs.accessories) {
      tags.push(...attrs.accessories);
    }
  }

  return tags;
}

/**
 * Calculate prompt token estimate (rough approximation)
 */
export function estimatePromptTokens(prompt: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(prompt.length / 4);
}
