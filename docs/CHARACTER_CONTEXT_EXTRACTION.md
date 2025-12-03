# Character Context Extraction & Image Generation

This module provides comprehensive tools for extracting, managing, and utilizing detailed character context from your manuscript, with a focus on visual descriptions optimized for AI image generation.

## Features

### 1. Enhanced Character Profile Type

The `CharacterProfile` interface now includes visual description fields:

```typescript
interface CharacterProfile {
  // ... existing fields ...

  // Visual description fields for image generation
  physicalAppearance?: string; // Consolidated narrative description
  visualAttributes?: {
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
  appearanceEvolution?: Array<{
    stage: string; // Links to arc stage
    description: string;
    changes: string[];
  }>;
}
```

### 2. Character Context Extractor

**Location:** `services/intelligence/characterContextExtractor.ts`

Aggregates character information from multiple sources (lore, manuscript index, entity graph) into a comprehensive context object.

#### Key Functions:

```typescript
// Extract context for a single character
extractCharacterContext(
  characterName: string,
  loreCharacters: CharacterProfile[],
  manuscriptIndex: Record<string, CharacterIndex> | undefined,
  entityGraph: EntityGraph | null
): ComprehensiveCharacterContext | null

// Extract context for multiple characters
extractMultipleCharacterContexts(
  characterNames: string[],
  loreCharacters: CharacterProfile[],
  manuscriptIndex: Record<string, CharacterIndex> | undefined,
  entityGraph: EntityGraph | null
): Record<string, ComprehensiveCharacterContext>

// Get all available characters
getAllCharacterNames(
  loreCharacters: CharacterProfile[],
  manuscriptIndex: Record<string, CharacterIndex> | undefined,
  entityGraph: EntityGraph | null
): string[]

// Build consolidated visual description
buildVisualDescription(context: ComprehensiveCharacterContext): string

// Get character appearance at specific story stage
getCharacterAtStage(
  context: ComprehensiveCharacterContext,
  stage: string
): ComprehensiveCharacterContext
```

#### Example Usage:

```typescript
import { extractCharacterContext, buildVisualDescription } from '@/services/intelligence';

const context = extractCharacterContext(
  'Sarah',
  project.lore.characters,
  project.manuscriptIndex,
  entityGraph
);

if (context) {
  const visualDesc = buildVisualDescription(context);
  console.log(visualDesc);
  // Output: "25 years old, athletic build, long auburn hair, green eyes,
  // fair skin. Facial features: sharp jawline, high cheekbones.
  // Distinguishing marks: scar above left eyebrow.
  // Typically wears: leather jacket and combat boots."
}
```

### 3. Image Prompt Builder

**Location:** `services/intelligence/imagePromptBuilder.ts`

Formats character context into optimized prompts for AI image generation tools.

#### Supported Styles:
- `photorealistic` - Photorealistic, highly detailed, 8k resolution
- `digital-art` - Digital art, concept art style
- `oil-painting` - Classical oil painting style
- `watercolor` - Watercolor painting
- `sketch` - Pencil sketch, hand-drawn
- `anime` - Anime/manga art style
- `comic-book` - Comic book/graphic novel style
- `fantasy-art` - Epic fantasy art
- `noir` - Film noir, high contrast
- `cinematic` - Cinematic lighting, movie still

#### Framing Options:
- `portrait` - Head and shoulders
- `full-body` - Entire figure visible
- `headshot` - Close-up facial details
- `action-shot` - Dynamic action pose
- `environmental` - Character in setting

#### Key Functions:

```typescript
// Build character image prompt
buildCharacterImagePrompt(
  context: ComprehensiveCharacterContext,
  options: ImagePromptOptions
): FormattedImagePrompt

// Build prompt for DALL-E 3 (natural language)
buildDALLE3Prompt(
  context: ComprehensiveCharacterContext,
  options: ImagePromptOptions
): string

// Build prompt for Stable Diffusion (tags)
buildStableDiffusionPrompt(
  context: ComprehensiveCharacterContext,
  options: ImagePromptOptions
): { prompt: string; negativePrompt: string }

// Build scene with multiple characters
buildScenePrompt(
  characters: ComprehensiveCharacterContext[],
  sceneDescription: string,
  options: ImagePromptOptions
): FormattedImagePrompt
```

#### Example Usage:

```typescript
import {
  extractCharacterContext,
  buildCharacterImagePrompt,
  buildDALLE3Prompt
} from '@/services/intelligence';

const context = extractCharacterContext('Sarah', /* ... */);

// Generic prompt
const prompt = buildCharacterImagePrompt(context, {
  style: 'fantasy-art',
  framing: 'portrait',
  setting: 'ancient forest',
  mood: 'mysterious',
  lighting: 'dappled sunlight'
});

console.log(prompt.mainPrompt);
// Output: "portrait shot, head and shoulders, focused on face, Character named Sarah,
// 25 years old, athletic build, long auburn hair, green eyes, fair skin,
// sharp jawline, high cheekbones, scar above left eyebrow, wearing leather jacket,
// in ancient forest, mysterious mood, dappled sunlight lighting,
// fantasy art, epic, detailed, magical atmosphere, dramatic"

// DALL-E 3 optimized
const dalle3Prompt = buildDALLE3Prompt(context, {
  style: 'photorealistic',
  framing: 'portrait'
});

console.log(dalle3Prompt);
// Output: "A portrait in photorealistic style of Sarah. 25 years old woman
// with long auburn hair and green eyes. She wears a leather jacket."
```

### 4. Visual Description Extractor (AI-Powered)

**Location:** `services/intelligence/visualDescriptionExtractor.ts`

Uses Gemini AI to automatically extract detailed visual descriptions from manuscript text.

#### Key Functions:

```typescript
// Extract visual descriptions from text
extractVisualDescriptions(
  text: string,
  signal?: AbortSignal
): Promise<VisualExtractionResult>

// Extract for specific character
extractCharacterVisualDescription(
  text: string,
  characterName: string,
  signal?: AbortSignal
): Promise<ExtractedVisualDescription | null>

// Enhance existing profile with extracted data
enhanceCharacterProfileWithVisuals(
  profile: CharacterProfile,
  extracted: ExtractedVisualDescription
): CharacterProfile

// Extract appearance evolution across story
extractAppearanceEvolution(
  textSegments: Array<{ stage: string; text: string }>,
  characterName: string,
  signal?: AbortSignal
): Promise<CharacterProfile['appearanceEvolution']>

// Batch extract from multiple chapters
batchExtractVisualDescriptions(
  chapters: Array<{ id: string; title: string; content: string }>,
  signal?: AbortSignal
): Promise<Map<string, ExtractedVisualDescription[]>>
```

#### Example Usage:

```typescript
import {
  extractVisualDescriptions,
  enhanceCharacterProfileWithVisuals
} from '@/services/intelligence';

// Extract from chapter text
const result = await extractVisualDescriptions(chapter.content);

console.log(result.characters);
// Output: [
//   {
//     characterName: "Sarah",
//     physicalAppearance: "Sarah stood tall at nearly six feet, her athletic...",
//     visualAttributes: {
//       age: "mid-twenties",
//       height: "nearly six feet",
//       build: "athletic",
//       hairColor: "auburn",
//       eyeColor: "green",
//       // ...
//     },
//     confidence: 0.85,
//     textExcerpts: ["Sarah stood tall at nearly six feet..."]
//   }
// ]

// Enhance existing character profile
const enhanced = enhanceCharacterProfileWithVisuals(
  existingProfile,
  result.characters[0]
);
```

### 5. Agent Tools

The following tools are now available to the AI agent:

#### `get_character_visual_description`
Get comprehensive visual description of a character for image generation or reference.

```typescript
{
  character_name: string;
  stage?: string; // Optional story stage
}
```

#### `generate_image_prompt`
Generate a detailed image generation prompt for a character.

```typescript
{
  character_name: string;
  style?: ImageStyle;
  framing?: ImageFraming;
  setting?: string;
  mood?: string;
}
```

#### `extract_character_visuals_from_text`
Extract detailed visual descriptions from manuscript text using AI.

```typescript
{
  character_name?: string; // Optional: specific character
  chapter_id?: string; // Optional: specific chapter
}
```

#### `get_all_character_contexts`
Get comprehensive context for all characters in the story.

```typescript
{
  include_visuals?: boolean; // Default: true
}
```

## Use Cases

### 1. Generate Character Art

```typescript
// Extract character context
const context = extractCharacterContext('Sarah', lore, index, graph);

// Generate prompt for Stable Diffusion
const { prompt, negativePrompt } = buildStableDiffusionPrompt(context, {
  style: 'fantasy-art',
  framing: 'full-body',
  setting: 'medieval castle courtyard',
  mood: 'heroic'
});

// Send to image generation API
const image = await generateImage(prompt, negativePrompt);
```

### 2. Maintain Visual Consistency

```typescript
// Extract appearance at different story stages
const earlyContext = getCharacterAtStage(context, 'Chapter 1');
const lateContext = getCharacterAtStage(context, 'Chapter 20');

// Generate comparison
const comparison = buildCharacterComparisonPrompt(
  earlyContext,
  lateContext,
  { style: 'digital-art' }
);
```

### 3. Auto-Populate Visual Descriptions

```typescript
// Extract from all chapters
const allDescriptions = await batchExtractVisualDescriptions(chapters);

// Consolidate per character
const characterMap = new Map();
for (const [chapterId, descriptions] of allDescriptions) {
  for (const desc of descriptions) {
    if (!characterMap.has(desc.characterName)) {
      characterMap.set(desc.characterName, []);
    }
    characterMap.get(desc.characterName).push(desc);
  }
}

// Update lore with consolidated descriptions
for (const [name, descriptions] of characterMap) {
  const consolidated = consolidateVisualDescriptions(descriptions);
  // Update character profile in lore
}
```

### 4. Scene Illustration

```typescript
// Get context for all characters in a scene
const characters = ['Sarah', 'Marcus', 'Elena'].map(name =>
  extractCharacterContext(name, lore, index, graph)
).filter(c => c !== null);

// Generate scene prompt
const scenePrompt = buildScenePrompt(
  characters,
  'A tense confrontation in a dimly lit tavern',
  {
    style: 'cinematic',
    mood: 'tense',
    lighting: 'dramatic shadows'
  }
);

const sceneImage = await generateImage(scenePrompt.mainPrompt);
```

## Integration with Existing Systems

### Manuscript Indexer
The visual description extractor uses the same Gemini AI client as the manuscript indexer, ensuring consistency in attribute extraction.

### Entity Graph
Character context extraction integrates with the entity graph to include relationship data and mention tracking.

### Lore Bible
Visual attributes seamlessly extend the existing `CharacterProfile` type in the lore system.

### Agent Tools
All functionality is exposed through agent tools, allowing the AI assistant to help users generate character descriptions and image prompts through natural language conversation.

## Future Enhancements

- **Image Generation Integration**: Direct integration with DALL-E, Stable Diffusion, or Midjourney APIs
- **Visual Consistency Checker**: Detect contradictions in character appearance descriptions
- **Character Sheet Generator**: Auto-generate character reference sheets with multiple poses/expressions
- **Scene Detection**: Automatically identify key scenes for illustration
- **Style Transfer**: Apply consistent art style across multiple character images
