import type { AppBrainCommand, AnalysisDependencies } from './types';

export class GetCritiqueCommand
  implements AppBrainCommand<string | undefined, string, AnalysisDependencies>
{
  async execute(
    focus: string | undefined,
    deps: AnalysisDependencies,
  ): Promise<string> {
    const selection = deps.selection;
    if (!selection) {
      return 'No text selected. Please select text to critique.';
    }

    return `Critique for: "${selection.text.slice(0, 50)}..." [Focus: ${focus || 'all'}]
      
To get detailed feedback, the selection would be sent to the analysis service.`;
  }
}

export class RunAnalysisCommand
  implements AppBrainCommand<string | undefined, string, AnalysisDependencies>
{
  async execute(
    section: string | undefined,
    deps: AnalysisDependencies,
  ): Promise<string> {
    const text = deps.currentText;
    const setting = deps.setting;

    if (section === 'pacing') {
      await deps.analyzePacing(text, setting);
      return 'Pacing analysis complete';
    }

    if (section === 'characters') {
      await deps.analyzeCharacters(text);
      return 'Character analysis complete';
    }

    if (section === 'plot') {
      await deps.analyzePlot(text);
      return 'Plot analysis complete';
    }

    if (section === 'setting' && setting) {
      await deps.analyzeSetting(text, setting);
      return 'Setting analysis complete';
    }

    await deps.runFullAnalysis(text, setting);
    return 'Full analysis complete';
  }
}
