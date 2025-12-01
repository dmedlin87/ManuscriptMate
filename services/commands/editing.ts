import type { UpdateManuscriptParams } from '@/services/appBrain';
import type { AppBrainCommand, EditingDependencies } from './types';

export class UpdateManuscriptCommand
  implements AppBrainCommand<UpdateManuscriptParams, string, EditingDependencies>
{
  async execute(
    params: UpdateManuscriptParams,
    deps: EditingDependencies,
  ): Promise<string> {
    const { searchText, replacementText, description } = params;

    return deps.runExclusiveEdit(async () => {
      if (!deps.currentText.includes(searchText)) {
        return `Error: Could not find "${searchText.slice(0, 50)}..." in the document.`;
      }

      const newText = deps.currentText.replace(searchText, replacementText);
      deps.commitEdit(newText, description, 'Agent');

      return `Successfully updated: ${description}`;
    });
  }
}

export interface AppendTextParams {
  text: string;
  description: string;
}

export class AppendTextCommand
  implements AppBrainCommand<AppendTextParams, string, EditingDependencies>
{
  async execute(
    params: AppendTextParams,
    deps: EditingDependencies,
  ): Promise<string> {
    const { text, description } = params;

    return deps.runExclusiveEdit(async () => {
      const newText = deps.currentText + '\n\n' + text;
      deps.commitEdit(newText, description, 'Agent');
      return `Appended text: ${description}`;
    });
  }
}
