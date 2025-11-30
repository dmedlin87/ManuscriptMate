import React from 'react';
import { motion } from 'framer-motion';
import { AnalysisResult } from '@/types';
import { findQuoteRange } from '@/features/shared';
import { ScoreCard } from './ScoreCard';
import { IssueCard } from './IssueCard';

interface AnalysisPanelProps {
  analysis: AnalysisResult | null;
  isLoading: boolean;
  currentText: string;
  onNavigate: (start: number, end: number) => void;
  onFixRequest?: (issueContext: string, suggestion: string) => void;
  warning?: string | null;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ analysis, isLoading, currentText, onNavigate, onFixRequest, warning }) => {
  
  const handleQuoteClick = (quote?: string) => {
    if (!quote) return;
    const range = findQuoteRange(currentText, quote);
    if (range) onNavigate(range.start, range.end);
  };

  const handleFixClick = (e: React.MouseEvent, issue: { issue: string; suggestion: string; quote?: string; location?: string }) => {
    e.stopPropagation();
    if (onFixRequest) {
      const context = issue.quote 
        ? `"${issue.quote}"${issue.location ? ` (${issue.location})` : ''}` 
        : issue.location || 'Unknown location';
      onFixRequest(context, issue.suggestion);
    }
  };

  if (isLoading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center h-full p-8 text-center gap-4"
      >
         <motion.div 
           className="w-8 h-8 border-2 border-[var(--interactive-accent)] border-t-transparent rounded-full"
           animate={{ rotate: 360 }}
           transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
         />
         <motion.p 
           className="font-serif text-[var(--text-secondary)]"
           animate={{ opacity: [0.5, 1, 0.5] }}
           transition={{ duration: 2, repeat: Infinity }}
         >
           Consulting the muse...
         </motion.p>
      </motion.div>
    );
  }

  if (!analysis) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-full p-8 text-center"
      >
        <p className="text-[var(--text-tertiary)] font-serif italic">Run an analysis to reveal insights.</p>
      </motion.div>
    );
  }

  // Combine all issues into a single list
  const allIssues = [
    ...analysis.plotIssues.map(issue => ({ ...issue, type: 'plot' as const })),
    ...(analysis.settingAnalysis?.issues || []).map(issue => ({ ...issue, type: 'setting' as const })),
  ];

  return (
    <div className="h-full overflow-y-auto p-5 space-y-6 animate-fade-in">
      {/* Warning Banner */}
      {warning && (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-[var(--warning-300)] bg-[var(--warning-50)] text-[var(--warning-800)] animate-slide-up">
          <div className="mt-0.5 text-[var(--warning-600)] font-bold">!</div>
          <div>
            <p className="text-[var(--text-sm)] font-semibold text-[var(--warning-800)]">Analysis Warning</p>
            <p className="text-[var(--text-xs)] leading-relaxed">{warning}</p>
          </div>
        </div>
      )}
      
      {/* Score Card - Now a dumb component */}
      <ScoreCard label="Pacing Score" score={analysis.pacing.score} />

      {/* Executive Summary */}
      <section className="animate-fade-in">
        <h4 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] mb-3">
          Executive Summary
        </h4>
        <p className="text-[var(--text-sm)] text-[var(--text-secondary)] leading-relaxed font-serif">
          {analysis.summary}
        </p>
      </section>

      {/* Issues List - CSS transitions, no AnimatePresence */}
      <section>
        <h4 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] mb-3">
          Detected Issues
        </h4>
        {allIssues.length === 0 ? (
          <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] italic">
            No issues detected. Great work!
          </p>
        ) : (
          <div className="space-y-3 stagger-list">
            {allIssues.map((issue, i) => (
              <div key={`${issue.type}-${i}`} className="list-item-enter">
                <IssueCard
                  title={issue.issue}
                  suggestion={issue.suggestion}
                  severity={issue.type === 'plot' ? 'error' : 'warning'}
                  onClick={() => handleQuoteClick(issue.quote)}
                  onFixClick={onFixRequest ? (e) => handleFixClick(e, issue) : undefined}
                  showFixButton={!!onFixRequest}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
