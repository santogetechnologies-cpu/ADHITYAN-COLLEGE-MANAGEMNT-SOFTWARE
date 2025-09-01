import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExamScheduling } from '@/components/exam/ExamScheduling';
import { HallTicketGeneration } from '@/components/exam/HallTicketGeneration';
import { ExamWorkflows } from '@/components/exam/ExamWorkflows';
import { GradingInterface } from '@/components/exam/GradingInterface';
import { ResultPublishing } from '@/components/exam/ResultPublishing';
import { ExamAnalytics } from '@/components/exam/ExamAnalytics';
import { Calendar, FileText, CheckSquare, GraduationCap, BarChart3, Settings } from 'lucide-react';

const ExamManagement = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation showBackButton={true} backUrl="/dashboard" backLabel="Back to Dashboard" />
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Examination Management</h1>
          <p className="text-muted-foreground">Comprehensive exam scheduling, grading, and result management system</p>
        </div>

        <Tabs defaultValue="scheduling" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="scheduling" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Scheduling</span>
            </TabsTrigger>
            <TabsTrigger value="hall-tickets" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Hall Tickets</span>
            </TabsTrigger>
            <TabsTrigger value="workflows" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Workflows</span>
            </TabsTrigger>
            <TabsTrigger value="grading" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Grading</span>
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Results</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scheduling" className="mt-6">
            <ExamScheduling />
          </TabsContent>

          <TabsContent value="hall-tickets" className="mt-6">
            <HallTicketGeneration />
          </TabsContent>

          <TabsContent value="workflows" className="mt-6">
            <ExamWorkflows />
          </TabsContent>

          <TabsContent value="grading" className="mt-6">
            <GradingInterface />
          </TabsContent>

          <TabsContent value="results" className="mt-6">
            <ResultPublishing />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <ExamAnalytics />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ExamManagement;