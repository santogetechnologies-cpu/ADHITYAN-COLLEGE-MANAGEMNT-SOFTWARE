import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface NAACDocument {
  id: string;
  title: string;
  filename: string;
  criterionNumber: number;
  metricCode: string;
  evidenceType: string;
  uploadDate: string;
  fileType: string;
  fileSize: string;
  tags: string[];
}

export interface CriterionProgress {
  criterionNumber: number;
  completionPercentage: number;
  totalMetrics: number;
  completedMetrics: number;
  lastUpdated: string;
}

export interface NAACData {
  documents: NAACDocument[];
  criterionProgress: CriterionProgress[];
  currentUser: {
    role: 'admin' | 'faculty' | 'student' | 'naac_coordinator';
    name: string;
    permissions: string[];
  };
}

interface NAACContextType {
  naacData: NAACData;
  updateDocument: (document: NAACDocument) => void;
  updateProgress: (criterionNumber: number, progress: Partial<CriterionProgress>) => void;
  addDocument: (document: Omit<NAACDocument, 'id' | 'uploadDate'>) => void;
  removeDocument: (documentId: string) => void;
  isLoading: boolean;
}

const NAACContext = createContext<NAACContextType | undefined>(undefined);

// Mock data for development
const mockNAACData: NAACData = {
  documents: [
    {
      id: '1',
      title: 'Course Curriculum Document',
      filename: 'curriculum-2023-24.pdf',
      criterionNumber: 1,
      metricCode: '1.1.1',
      evidenceType: 'Policy Document',
      uploadDate: '2024-01-15',
      fileType: 'PDF',
      fileSize: '2.5 MB',
      tags: ['curriculum', 'academic', 'policy']
    },
    {
      id: '2',
      title: 'Research Publication List',
      filename: 'research-publications-2023.xlsx',
      criterionNumber: 3,
      metricCode: '3.3.1',
      evidenceType: 'Data Sheet',
      uploadDate: '2024-02-10',
      fileType: 'Excel',
      fileSize: '1.8 MB',
      tags: ['research', 'publications', 'faculty']
    }
  ],
  criterionProgress: [
    { criterionNumber: 1, completionPercentage: 75, totalMetrics: 12, completedMetrics: 9, lastUpdated: '2024-02-20' },
    { criterionNumber: 2, completionPercentage: 60, totalMetrics: 15, completedMetrics: 9, lastUpdated: '2024-02-18' },
    { criterionNumber: 3, completionPercentage: 85, totalMetrics: 10, completedMetrics: 8, lastUpdated: '2024-02-22' },
    { criterionNumber: 4, completionPercentage: 40, totalMetrics: 8, completedMetrics: 3, lastUpdated: '2024-02-15' },
    { criterionNumber: 5, completionPercentage: 55, totalMetrics: 11, completedMetrics: 6, lastUpdated: '2024-02-19' },
    { criterionNumber: 6, completionPercentage: 70, totalMetrics: 9, completedMetrics: 6, lastUpdated: '2024-02-21' },
    { criterionNumber: 7, completionPercentage: 65, totalMetrics: 7, completedMetrics: 4, lastUpdated: '2024-02-17' }
  ],
  currentUser: {
    role: 'naac_coordinator',
    name: 'Dr. Priya Sharma',
    permissions: ['view_all', 'edit_all', 'upload_documents', 'generate_reports']
  }
};

export function NAACProvider({ children }: { children: ReactNode }) {
  const [naacData, setNAACData] = useState<NAACData>(mockNAACData);
  const [isLoading, setIsLoading] = useState(false);

  const updateDocument = (updatedDocument: NAACDocument) => {
    setNAACData(prev => ({
      ...prev,
      documents: prev.documents.map(doc => 
        doc.id === updatedDocument.id ? updatedDocument : doc
      )
    }));
  };

  const updateProgress = (criterionNumber: number, progressUpdate: Partial<CriterionProgress>) => {
    setNAACData(prev => ({
      ...prev,
      criterionProgress: prev.criterionProgress.map(progress =>
        progress.criterionNumber === criterionNumber
          ? { ...progress, ...progressUpdate, lastUpdated: new Date().toISOString().split('T')[0] }
          : progress
      )
    }));
  };

  const addDocument = (documentData: Omit<NAACDocument, 'id' | 'uploadDate'>) => {
    const newDocument: NAACDocument = {
      ...documentData,
      id: Date.now().toString(),
      uploadDate: new Date().toISOString().split('T')[0]
    };
    
    setNAACData(prev => ({
      ...prev,
      documents: [...prev.documents, newDocument]
    }));
  };

  const removeDocument = (documentId: string) => {
    setNAACData(prev => ({
      ...prev,
      documents: prev.documents.filter(doc => doc.id !== documentId)
    }));
  };

  return (
    <NAACContext.Provider value={{
      naacData,
      updateDocument,
      updateProgress,
      addDocument,
      removeDocument,
      isLoading
    }}>
      {children}
    </NAACContext.Provider>
  );
}

export function useNAAC() {
  const context = useContext(NAACContext);
  if (context === undefined) {
    throw new Error('useNAAC must be used within a NAACProvider');
  }
  return context;
}