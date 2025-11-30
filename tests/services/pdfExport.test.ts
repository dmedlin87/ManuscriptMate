import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('jspdf', () => ({
  jsPDF: vi.fn(() => ({
    internal: { pageSize: { getHeight: vi.fn(() => 297), getWidth: vi.fn(() => 210) } },
    text: vi.fn(),
    addPage: vi.fn(),
    splitTextToSize: vi.fn((text: string) => [text]),
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    save: vi.fn(),
  })),
}));

import { jsPDF } from 'jspdf';
import { PDFExportService } from '@/services/pdfExport';
import { ExportSection, ExportConfig, ExportData } from '@/types/export';

const baseConfig: ExportConfig = {
  sections: [ExportSection.Manuscript],
  manuscriptOptions: {
    includeChapterTitles: true,
    fontScale: 1,
    lineHeight: 1.5,
  },
  analysisOptions: {
    includeCharts: false,
    detailedBreakdown: false,
  },
};

const exportData: ExportData = {
  title: 'Test Book',
  author: 'Author Name',
  content: 'Chapter 1 text...',
  lore: { characters: [], worldRules: [] },
  analysis: null,
};

describe('PDFExportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const currentInstance = () => {
    const mock = vi.mocked(jsPDF);
    const lastResult = mock.mock.results[mock.mock.results.length - 1];
    if (!lastResult) {
      throw new Error('jsPDF was not instantiated');
    }
    return lastResult.value;
  };

  it('renders title page and saves to filename', async () => {
    const service = new PDFExportService();
    await service.generatePdf(exportData, { ...baseConfig, filename: 'custom.pdf' });

    const instance = currentInstance();
    expect(instance.text).toHaveBeenCalledWith('Test Book', expect.any(Number), expect.any(Number), expect.objectContaining({ align: 'center' }));
    expect(instance.text).toHaveBeenCalledWith('By Author Name', expect.any(Number), expect.any(Number), expect.objectContaining({ align: 'center' }));
    expect(instance.save).toHaveBeenCalledWith('custom.pdf');
  });

  it('renders manuscript header and body', async () => {
    const service = new PDFExportService();
    await service.generatePdf(exportData, baseConfig);

    const instance = currentInstance();
    expect(instance.text).toHaveBeenCalledWith('Manuscript', 20, 20);
    expect(instance.text).toHaveBeenCalledWith('Chapter 1 text...', 20, expect.any(Number));
  });

  it('adds a page per configured section', async () => {
    const service = new PDFExportService();
    await service.generatePdf(exportData, {
      ...baseConfig,
      sections: [ExportSection.Manuscript, ExportSection.WorldRules, ExportSection.AnalysisReport],
    });

    const instance = currentInstance();
    expect(instance.addPage).toHaveBeenCalledTimes(3);
  });

  it('falls back when character list is empty', async () => {
    const service = new PDFExportService();
    await service.generatePdf(exportData, { ...baseConfig, sections: [ExportSection.Characters] });

    const instance = currentInstance();
    expect(instance.text).toHaveBeenCalledWith('Character Profiles', 20, 20);
    expect(instance.text).toHaveBeenCalledWith('No characters defined.', 20, expect.any(Number));
  });
});
