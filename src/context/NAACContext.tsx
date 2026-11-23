import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { db } from '@/services/supabase/database';
import { useAuth } from '@/context/AuthContext';
import { naacService, type NaacMetric } from '@/services/naacService';

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
  fileUrl?: string | null;
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
  metrics: NaacMetric[];
  criterionProgress: CriterionProgress[];
  currentUser: {
    role: 'admin' | 'faculty' | 'student' | 'naac_coordinator';
    name: string;
    permissions: string[];
  };
}

interface NAACContextType {
  naacData: NAACData;
  reload: () => Promise<void>;
  isLoading: boolean;
  loadError: string | null;
  canEdit: boolean;
}

const NAACContext = createContext<NAACContextType | undefined>(undefined);

const initialProgress: CriterionProgress[] = [
  { criterionNumber: 1, completionPercentage: 0, totalMetrics: 10, completedMetrics: 0, lastUpdated: '' },
  { criterionNumber: 2, completionPercentage: 0, totalMetrics: 10, completedMetrics: 0, lastUpdated: '' },
  { criterionNumber: 3, completionPercentage: 0, totalMetrics: 10, completedMetrics: 0, lastUpdated: '' },
  { criterionNumber: 4, completionPercentage: 0, totalMetrics: 10, completedMetrics: 0, lastUpdated: '' },
  { criterionNumber: 5, completionPercentage: 0, totalMetrics: 10, completedMetrics: 0, lastUpdated: '' },
  { criterionNumber: 6, completionPercentage: 0, totalMetrics: 10, completedMetrics: 0, lastUpdated: '' },
  { criterionNumber: 7, completionPercentage: 0, totalMetrics: 10, completedMetrics: 0, lastUpdated: '' }
];

const initialDocuments: NAACDocument[] = [];

export function NAACProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [naacData, setNAACData] = useState<NAACData>({
    documents: initialDocuments,
    metrics: [],
    criterionProgress: initialProgress,
    currentUser: {
      role: (user?.role === 'admin' ? 'admin' : user?.role === 'teacher' ? 'faculty' : 'naac_coordinator'),
      name: user?.name || user?.email || 'Institutional Staff',
      permissions: []
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const canEdit = ['admin', 'principal', 'naac_coordinator'].includes(user?.role ?? '');

  const reload = useCallback(async () => {
    try {
      const [progressRes, docsRes, metrics] = await Promise.all([
        db.getNAACCriterionProgress(), db.getNAACDocuments(), naacService.metrics()
      ]);
      setNAACData(prev => ({
        ...prev,
        metrics,
        criterionProgress: progressRes.length ? progressRes.map(p => ({
          criterionNumber: p.criterion_number,
          completionPercentage: p.completion_percentage,
          totalMetrics: p.total_metrics,
          completedMetrics: p.completed_metrics,
          lastUpdated: p.last_updated ? p.last_updated.split('T')[0] : ''
        })) : initialProgress,
        documents: docsRes.map(d => ({
          id: d.id, title: d.title, filename: d.filename, criterionNumber: d.criterion_number, metricCode: d.metric_code,
          evidenceType: d.evidence_type, uploadDate: d.created_at ? d.created_at.split('T')[0] : '', fileType: d.file_type,
          fileSize: d.file_size || '', tags: d.tags || [], fileUrl: d.file_url ?? null
        }))
      }));
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message || 'Could not load accreditation data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  return (
    <NAACContext.Provider value={{ naacData, reload, isLoading, loadError, canEdit }}>
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
