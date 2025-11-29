import Dexie, { Table } from 'dexie';
import { Project, Chapter } from '../types/schema';

export class QuillAIDB extends Dexie {
  projects!: Table<Project>;
  chapters!: Table<Chapter>;

  constructor() {
    super('QuillAIDB');

    (this as any).version(1).stores({
      projects: 'id, updatedAt',
      chapters: 'id, projectId, order, updatedAt' 
    });
  }
}

export const db = new QuillAIDB();