import React from 'react';
import { AnalysisResult } from '@/types';
import { AnalysisPanel } from './AnalysisPanel';
import { useEditorActions } from '@/features/core/context/EditorContext';

interface DashboardProps {
    isLoading: boolean;
    analysis: AnalysisResult | null;
    currentText: string;
    onFixRequest?: (issueContext: string, suggestion: string) => void;
    warning?: string | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ isLoading, analysis, currentText, onFixRequest, warning }) => {
    const { handleNavigateToIssue } = useEditorActions();

    return (
        <AnalysisPanel 
            analysis={analysis} 
            isLoading={isLoading} 
            currentText={currentText}
            onNavigate={handleNavigateToIssue}
            onFixRequest={onFixRequest}
            warning={warning}
        />
    );
};
