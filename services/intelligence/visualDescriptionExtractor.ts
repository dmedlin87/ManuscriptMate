/**
 * Visual Description Extractor
 *
 * Uses AI to extract detailed visual descriptions of characters from manuscript text.
 * Populates the visual fields in CharacterProfile automatically.
 */

import { Type } from "@google/genai";
import { ai } from "../gemini/client";
import { CharacterProfile } from "../../types";
import { ModelConfig, ThinkingBudgets } from "../../config/models";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ExtractedVisualDescription {
  characterName: string;
  physicalAppearance: string;
  visualAttributes: {
    age?: string;
    gender?: string;
    height?: string;
    build?: string;
    hairColor?: string;
    hairStyle?: string;
    eyeColor?: string;
    skinTone?: string;
    facialFeatures?: string[];
    distinguishingMarks?: string[];
    typicalClothing?: string;
    accessories?: string[];
  };
  confidence: number; // 0-1 score for extraction confidence
  textExcerpts: string[]; // Relevant quotes from the text
}

export interface VisualExtractionResult {
  characters: ExtractedVisualDescription[];
  extractedAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPTS
// ─────────────────────────────────────────────────────────────────────────────

const VISUAL_EXTRACTION_PROMPT = `You are an expert at extracting detailed physical descriptions of characters from narrative text.

Your task is to analyze the provided text and extract comprehensive visual descriptions for each character mentioned.

Focus on:
- Physical attributes: age, gender, height, build, body type
- Hair: color, style, texture, length
- Eyes: color, shape, distinctive features
- Skin: tone, texture, complexion
- Facial features: nose, jaw, cheekbones, lips, etc.
- Distinguishing marks: scars, tattoos, birthmarks, etc.
- Typical clothing style and fashion choices
- Accessories: jewelry, glasses, weapons, carried items, etc.

Important guidelines:
1. Only extract information explicitly stated or strongly implied in the text
2. Do not make assumptions or add details not present in the source
3. Provide confidence scores based on how explicitly described the character is
4. Include relevant text excerpts that support your extraction
5. If a character is barely described, note that with a lower confidence score
6. Consolidate descriptions if the same character is described multiple times
7. Pay attention to how descriptions might change throughout the narrative

TEXT TO ANALYZE:
{{TEXT}}

Extract detailed visual descriptions for ALL characters found in this text.`;

// ─────────────────────────────────────────────────────────────────────────────
// EXTRACTION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract visual descriptions of all characters from text using AI
 */
export async function extractVisualDescriptions(
  text: string,
  signal?: AbortSignal
): Promise<VisualExtractionResult> {
  const model = ModelConfig.analysis;

  const prompt = VISUAL_EXTRACTION_PROMPT.replace('{{TEXT}}', text);

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: ThinkingBudgets.default },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            characters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  characterName: {
                    type: Type.STRING,
                    description: "Name of the character",
                  },
                  physicalAppearance: {
                    type: Type.STRING,
                    description: "Consolidated narrative description of the character's appearance",
                  },
                  visualAttributes: {
                    type: Type.OBJECT,
                    properties: {
                      age: { type: Type.STRING },
                      gender: { type: Type.STRING },
                      height: { type: Type.STRING },
                      build: { type: Type.STRING },
                      hairColor: { type: Type.STRING },
                      hairStyle: { type: Type.STRING },
                      eyeColor: { type: Type.STRING },
                      skinTone: { type: Type.STRING },
                      facialFeatures: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      distinguishingMarks: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      typicalClothing: { type: Type.STRING },
                      accessories: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                    },
                  },
                  confidence: {
                    type: Type.NUMBER,
                    description: "Confidence score 0-1 based on how explicitly the character is described",
                  },
                  textExcerpts: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Relevant quotes from the text supporting this description",
                  },
                },
                required: ["characterName", "physicalAppearance", "visualAttributes", "confidence"],
              },
            },
          },
          required: ["characters"],
        },
      },
    }, signal);

    const data = await response.json();

    return {
      characters: data.characters || [],
      extractedAt: Date.now(),
    };
  } catch (error) {
    console.error('Visual description extraction failed:', error);
    return {
      characters: [],
      extractedAt: Date.now(),
    };
  }
}

/**
 * Extract visual description for a specific character from text
 */
export async function extractCharacterVisualDescription(
  text: string,
  characterName: string,
  signal?: AbortSignal
): Promise<ExtractedVisualDescription | null> {
  const result = await extractVisualDescriptions(text, signal);

  const character = result.characters.find(
    (c) => c.characterName.toLowerCase() === characterName.toLowerCase()
  );

  return character || null;
}

/**
 * Enhance an existing CharacterProfile with extracted visual data
 */
export function enhanceCharacterProfileWithVisuals(
  profile: CharacterProfile,
  extracted: ExtractedVisualDescription
): CharacterProfile {
  return {
    ...profile,
    physicalAppearance: extracted.physicalAppearance || profile.physicalAppearance,
    visualAttributes: {
      ...extracted.visualAttributes,
      ...profile.visualAttributes, // Keep existing manual entries
    },
  };
}

/**
 * Extract visual descriptions and merge with existing lore characters
 */
export async function extractAndMergeVisualDescriptions(
  text: string,
  existingCharacters: CharacterProfile[],
  signal?: AbortSignal
): Promise<CharacterProfile[]> {
  const extracted = await extractVisualDescriptions(text, signal);

  const enhancedCharacters = existingCharacters.map((profile) => {
    const extractedData = extracted.characters.find(
      (c) => c.characterName.toLowerCase() === profile.name.toLowerCase()
    );

    if (extractedData) {
      return enhanceCharacterProfileWithVisuals(profile, extractedData);
    }

    return profile;
  });

  return enhancedCharacters;
}

/**
 * Extract appearance evolution across multiple text segments (chapters/scenes)
 */
export async function extractAppearanceEvolution(
  textSegments: Array<{ stage: string; text: string }>,
  characterName: string,
  signal?: AbortSignal
): Promise<CharacterProfile['appearanceEvolution']> {
  const evolution: NonNullable<CharacterProfile['appearanceEvolution']> = [];

  for (const segment of textSegments) {
    const description = await extractCharacterVisualDescription(
      segment.text,
      characterName,
      signal
    );

    if (description && description.confidence > 0.3) {
      evolution.push({
        stage: segment.stage,
        description: description.physicalAppearance,
        changes: extractChanges(description),
      });
    }
  }

  return evolution.length > 0 ? evolution : undefined;
}

/**
 * Extract notable changes from visual description
 */
function extractChanges(description: ExtractedVisualDescription): string[] {
  const changes: string[] = [];

  const attrs = description.visualAttributes;

  // Check for notable attributes that might indicate changes
  if (attrs.hairColor) changes.push(`Hair: ${attrs.hairColor}`);
  if (attrs.hairStyle) changes.push(`Hair style: ${attrs.hairStyle}`);
  if (attrs.build) changes.push(`Build: ${attrs.build}`);
  if (attrs.distinguishingMarks && attrs.distinguishingMarks.length > 0) {
    changes.push(...attrs.distinguishingMarks);
  }
  if (attrs.typicalClothing) changes.push(`Clothing: ${attrs.typicalClothing}`);

  return changes;
}

/**
 * Batch extract visual descriptions from multiple chapters
 */
export async function batchExtractVisualDescriptions(
  chapters: Array<{ id: string; title: string; content: string }>,
  signal?: AbortSignal
): Promise<Map<string, ExtractedVisualDescription[]>> {
  const resultMap = new Map<string, ExtractedVisualDescription[]>();

  for (const chapter of chapters) {
    if (signal?.aborted) break;

    const result = await extractVisualDescriptions(chapter.content, signal);
    resultMap.set(chapter.id, result.characters);
  }

  return resultMap;
}

/**
 * Consolidate visual descriptions from multiple extractions of the same character
 */
export function consolidateVisualDescriptions(
  descriptions: ExtractedVisualDescription[]
): ExtractedVisualDescription {
  if (descriptions.length === 0) {
    throw new Error('No descriptions to consolidate');
  }

  if (descriptions.length === 1) {
    return descriptions[0];
  }

  // Use the description with highest confidence as base
  const sortedByConfidence = [...descriptions].sort((a, b) => b.confidence - a.confidence);
  const base = sortedByConfidence[0];

  // Merge attributes from other descriptions
  const consolidated: ExtractedVisualDescription = {
    ...base,
    visualAttributes: { ...base.visualAttributes },
    textExcerpts: [...(base.textExcerpts || [])],
  };

  for (let i = 1; i < sortedByConfidence.length; i++) {
    const desc = sortedByConfidence[i];

    // Merge visual attributes (prefer non-empty values)
    for (const [key, value] of Object.entries(desc.visualAttributes)) {
      if (value && !consolidated.visualAttributes[key as keyof typeof consolidated.visualAttributes]) {
        (consolidated.visualAttributes as any)[key] = value;
      }
    }

    // Merge text excerpts
    if (desc.textExcerpts) {
      consolidated.textExcerpts.push(...desc.textExcerpts);
    }
  }

  // Update confidence (average of all)
  consolidated.confidence = descriptions.reduce((sum, d) => sum + d.confidence, 0) / descriptions.length;

  return consolidated;
}
