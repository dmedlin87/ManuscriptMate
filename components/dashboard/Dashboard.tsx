import React from 'react';
import { AnalysisResult } from '../../types';
import { AnalysisPanel } from '../AnalysisPanel';
import { useManuscript } from '../../contexts/ManuscriptContext';

interface DashboardProps {
    isLoading: boolean;
    analysis: AnalysisResult | null;
    currentText: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ isLoading, analysis, currentText }) => {
    const { handleNavigateToIssue } = useManuscript();

    return (
        <AnalysisPanel 
            analysis={analysis} 
            isLoading={isLoading} 
            currentText={currentText}
            onNavigate={handleNavigateToIssue} 
        />
    );
};
