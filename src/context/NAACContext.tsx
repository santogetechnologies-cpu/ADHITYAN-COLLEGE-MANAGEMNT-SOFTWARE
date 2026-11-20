import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db } from '@/services/supabase/database';
import { useAuth } from '@/context/AuthContext';

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

const initialProgress: CriterionProgress[] = [
  { criterionNumber: 1, completionPercentage: 0, totalMetrics: 10, completedMetrics: 0, lastUpdated: new Date().toISOString().split('T')[0] },
  { criterionNumber: 2, completionPercentage: 0, totalMetrics: 10, completedMetrics: 0, lastUpdated: new Date().toISOString().split('T')[0] },
  { criterionNumber: 3, completionPercentage: 0, totalMetrics: 10, completedMetrics: 0, lastUpdated: new Date().toISOString().split('T')[0] },
  { criterionNumber: 4, completionPercentage: 0, totalMetrics: 10, completedMetrics: 0, lastUpdated: new Date().toISOString().split('T')[0] },
  { criterionNumber: 5, completionPercentage: 0, totalMetrics: 10, completedMetrics: 0, lastUpdated: new Date().toISOString().split('T')[0] },
  { criterionNumber: 6, completionPercentage: 0, totalMetrics: 10, completedMetrics: 0, lastUpdated: new Date().toISOString().split('T')[0] },
  { criterionNumber: 7, completionPercentage: 0, totalMetrics: 10, completedMetrics: 0, lastUpdated: new Date().toISOString().split('T')[0] }
];

const initialDocuments: NAACDocument[] = [];

export function NAACProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [naacData, setNAACData] = useState<NAACData>({
    documents: initialDocuments,
    criterionProgress: initialProgress,
    currentUser: {
      role: (user?.role === 'admin' ? 'admin' : user?.role === 'teacher' ? 'faculty' : 'naac_coordinator'),
      name: user?.name || user?.email || 'Institutional Staff',
      permissions: ['view_all', 'edit_all', 'upload_documents', 'generate_reports']
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadNAACData() {
      setIsLoading(true);
      try {
        const [progressRes, docsRes] = await Promise.all([
          db.getNAACCriterionProgress(),
          db.getNAACDocuments()
        ]);

        if (progressRes && progressRes.length > 0) {
          setNAACData(prev => ({
            ...prev,
            criterionProgress: progressRes.map(p => ({
              criterionNumber: p.criterion_number,
              completionPercentage: p.completion_percentage,
              totalMetrics: p.total_metrics,
              completedMetrics: p.completed_metrics,
              lastUpdated: p.last_updated ? p.last_updated.split('T')[0] : new Date().toISOString().split('T')[0]
            }))
          }));
        } else {
          setNAACData(prev => ({
            ...prev,
            criterionProgress: initialProgress
          }));
        }

        if (docsRes && docsRes.length > 0) {
          setNAACData(prev => ({
            ...prev,
            documents: docsRes.map(d => ({
              id: d.id,
              title: d.title,
              filename: d.filename,
              criterionNumber: d.criterion_number,
              metricCode: d.metric_code,
              evidenceType: d.evidence_type,
              uploadDate: d.created_at ? d.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
              fileType: d.file_type,
              fileSize: d.file_size || '1.0 MB',
              tags: d.tags || []
            }))
          }));
        } else {
          setNAACData(prev => ({
            ...prev,
            documents: []
          }));
        }
      } catch (err) {
        console.warn('Error loading NAAC data from Supabase:', err);
        setNAACData(prev => ({
          ...prev,
          documents: [],
          criterionProgress: initialProgress
        }));
      } finally {
        setIsLoading(false);
      }
    }
    loadNAACData();
  }, []);

  const updateDocument = (updatedDocument: NAACDocument) => {
    setNAACData(prev => ({
      ...prev,
      documents: prev.documents.map(doc => 
        doc.id === updatedDocument.id ? updatedDocument : doc
      )
    }));
  };

  const updateProgress = async (criterionNumber: number, progressUpdate: Partial<CriterionProgress>) => {
    setNAACData(prev => ({
      ...prev,
      criterionProgress: prev.criterionProgress.map(progress =>
        progress.criterionNumber === criterionNumber
          ? { ...progress, ...progressUpdate, lastUpdated: new Date().toISOString().split('T')[0] }
          : progress
      )
    }));

    await db.updateNAACProgress(criterionNumber, {
      completion_percentage: progressUpdate.completionPercentage,
      completed_metrics: progressUpdate.completedMetrics,
      total_metrics: progressUpdate.totalMetrics
    });
  };

  const addDocument = async (documentData: Omit<NAACDocument, 'id' | 'uploadDate'>) => {
    const tempId = Date.now().toString();
    const newDocument: NAACDocument = {
      ...documentData,
      id: tempId,
      uploadDate: new Date().toISOString().split('T')[0]
    };
    
    setNAACData(prev => ({
      ...prev,
      documents: [...prev.documents, newDocument]
    }));

    const inserted = await db.addNAACDocument({
      title: documentData.title,
      filename: documentData.filename,
      criterion_number: documentData.criterionNumber,
      metric_code: documentData.metricCode,
      evidence_type: documentData.evidenceType,
      file_type: documentData.fileType,
      file_size: documentData.fileSize,
      tags: documentData.tags,
      uploaded_by: user?.id
    });

    if (inserted) {
      setNAACData(prev => ({
        ...prev,
        documents: prev.documents.map(d => d.id === tempId ? { ...d, id: inserted.id } : d)
      }));
    }
  };

  const removeDocument = async (documentId: string) => {
    setNAACData(prev => ({
      ...prev,
      documents: prev.documents.filter(doc => doc.id !== documentId)
    }));
    await db.deleteNAACDocument(documentId);
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
