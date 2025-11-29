import React, { useState } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { Chapter } from '@/types/schema';

interface SceneCardProps {
  chapter: Chapter;
  index: number;
  isActive: boolean;
  isDragging: boolean;
  onSelect: () => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
}

const SceneCard: React.FC<SceneCardProps> = ({
  chapter,
  index,
  isActive,
  isDragging,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const summary = chapter.lastAnalysis?.summary || 'No analysis yet. Run analysis to see summary.';
  const pacingScore = chapter.lastAnalysis?.pacing?.score;
  const wordCount = chapter.content.split(/\s+/).filter(Boolean).length;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
      onClick={onSelect}
      className={`
        group relative bg-[var(--parchment-50)] rounded-xl border-2 transition-all duration-200 cursor-pointer
        ${isActive ? 'border-[var(--magic-400)] shadow-lg ring-2 ring-[var(--magic-200)]' : 'border-[var(--ink-100)] hover:border-[var(--magic-300)] hover:shadow-md'}
        ${isDragging ? 'opacity-50 scale-95' : 'opacity-100'}
      `}
    >
      {/* Card Header */}
      <div className="p-4 border-b border-[var(--ink-100)]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`
              w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold
              ${isActive ? 'bg-[var(--magic-500)] text-white' : 'bg-[var(--parchment-200)] text-[var(--ink-500)]'}
            `}>
              {index + 1}
            </span>
            <h3 className="font-serif font-semibold text-[var(--ink-800)] line-clamp-1">
              {chapter.title}
            </h3>
          </div>
          {pacingScore !== undefined && (
            <div className={`
              px-2 py-0.5 rounded-full text-xs font-bold
              ${pacingScore >= 7 ? 'bg-[var(--success-100)] text-[var(--success-600)]' : 
                pacingScore >= 4 ? 'bg-[var(--warning-100)] text-[var(--warning-600)]' :
                'bg-[var(--error-100)] text-[var(--error-600)]'}
            `}>
              {pacingScore}/10
            </div>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4">
        <p className="text-sm text-[var(--ink-500)] line-clamp-4 font-serif leading-relaxed">
          {summary}
        </p>
      </div>

      {/* Card Footer */}
      <div className="px-4 pb-4 flex items-center justify-between">
        <span className="text-xs text-[var(--ink-400)]">
          {wordCount.toLocaleString()} words
        </span>
        <div className="flex items-center gap-1">
          {chapter.lastAnalysis?.characters?.slice(0, 3).map((char, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-full bg-[var(--magic-200)] text-[var(--magic-600)] flex items-center justify-center text-xs font-bold border-2 border-[var(--parchment-50)] -ml-2 first:ml-0"
              title={char.name}
            >
              {char.name.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      {/* Drag Handle Indicator */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--ink-300)]">
          <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
          <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
        </svg>
      </div>
    </div>
  );
};

interface StoryBoardProps {
  onSwitchToEditor: () => void;
}

export const StoryBoard: React.FC<StoryBoardProps> = ({ onSwitchToEditor }) => {
  const { 
    chapters, 
    activeChapterId, 
    selectChapter, 
    createChapter, 
    reorderChapters,
    currentProject 
  } = useProjectStore();

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newChapters = [...chapters];
    const [draggedItem] = newChapters.splice(draggedIndex, 1);
    newChapters.splice(dropIndex, 0, draggedItem);

    reorderChapters(newChapters);
    setDraggedIndex(null);
  };

  const handleQuickCreate = async () => {
    if (isCreating && newChapterTitle.trim()) {
      await createChapter(newChapterTitle.trim());
      setNewChapterTitle('');
      setIsCreating(false);
    } else {
      setIsCreating(true);
    }
  };

  const handleSelectAndEdit = (chapterId: string) => {
    selectChapter(chapterId);
    onSwitchToEditor();
  };

  const totalWords = chapters.reduce((sum, ch) => sum + ch.content.split(/\s+/).filter(Boolean).length, 0);
  const analyzedCount = chapters.filter(ch => ch.lastAnalysis).length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--parchment-200)] overflow-hidden">
      {/* Header */}
      <header className="bg-[var(--parchment-50)] border-b border-[var(--ink-100)] px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold text-[var(--ink-800)]">
              Story Board
            </h1>
            <p className="text-sm text-[var(--ink-500)] mt-1">
              {currentProject?.title} &mdash; {chapters.length} chapters, {totalWords.toLocaleString()} words
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-[var(--ink-400)]">
              {analyzedCount}/{chapters.length} analyzed
            </div>
            <button
              onClick={onSwitchToEditor}
              className="px-4 py-2 bg-[var(--parchment-100)] border border-[var(--ink-200)] rounded-lg text-sm font-medium text-[var(--ink-600)] hover:bg-[var(--parchment-200)] transition-colors flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Editor View
            </button>
          </div>
        </div>
      </header>

      {/* Board Grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 auto-rows-min">
          {chapters.map((chapter, index) => (
            <SceneCard
              key={chapter.id}
              chapter={chapter}
              index={index}
              isActive={chapter.id === activeChapterId}
              isDragging={draggedIndex === index}
              onSelect={() => handleSelectAndEdit(chapter.id)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ))}

          {/* Quick Create Card */}
          <div
            className={`
              bg-[var(--parchment-100)] rounded-xl border-2 border-dashed transition-all duration-200
              ${isCreating ? 'border-[var(--magic-400)]' : 'border-[var(--ink-200)] hover:border-[var(--magic-300)]'}
            `}
          >
            {isCreating ? (
              <div className="p-4 space-y-3">
                <input
                  type="text"
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  placeholder="Chapter title..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleQuickCreate();
                    if (e.key === 'Escape') setIsCreating(false);
                  }}
                  className="w-full px-3 py-2 bg-[var(--parchment-50)] border border-[var(--ink-200)] rounded-lg text-sm font-serif focus:outline-none focus:ring-2 focus:ring-[var(--magic-400)] focus:border-transparent"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleQuickCreate}
                    className="flex-1 py-2 bg-[var(--magic-500)] text-white rounded-lg text-sm font-medium hover:bg-[var(--magic-600)] transition-colors"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setNewChapterTitle('');
                    }}
                    className="px-4 py-2 bg-[var(--parchment-50)] border border-[var(--ink-200)] rounded-lg text-sm text-[var(--ink-500)] hover:bg-[var(--parchment-200)] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full h-full min-h-[180px] flex flex-col items-center justify-center gap-2 text-[var(--ink-400)] hover:text-[var(--magic-500)] transition-colors p-4"
              >
                <div className="w-12 h-12 rounded-full bg-[var(--parchment-200)] flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </div>
                <span className="font-medium text-sm">Add Chapter</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
