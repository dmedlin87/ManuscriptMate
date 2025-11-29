import React, { createContext, useContext, useState } from 'react';
import { AnalysisResult, PlotSuggestion } from '../types';

interface AnalysisContextValue {
  analysis: AnalysisResult | null;
  setAnalysis: (result: AnalysisResult | null) => void;
  plotSuggestions: PlotSuggestion[];
  setPlotSuggestions: (suggestions: PlotSuggestion[]) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (analyzing: boolean) => void;
}

const AnalysisContext = createContext<AnalysisContextValue | undefined>(undefined);

export const AnalysisProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [plotSuggestions, setPlotSuggestions] = useState<PlotSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const value = {
    analysis,
    setAnalysis,
    plotSuggestions,
    setPlotSuggestions,
    isAnalyzing,
    setIsAnalyzing
  };

  return (
    <AnalysisContext.Provider value={value}>
      {children}
    </AnalysisContext.Provider>
  );
};

export const useAnalysis = () => {
  const context = useContext(AnalysisContext);
  if (!context) throw new Error("useAnalysis must be used within AnalysisProvider");
  return context;
};
