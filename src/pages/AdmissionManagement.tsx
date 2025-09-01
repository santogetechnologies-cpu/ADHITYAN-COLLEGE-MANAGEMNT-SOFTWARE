import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApplicationPortal } from '@/components/admission/ApplicationPortal';
import { DocumentVerification } from '@/components/admission/DocumentVerification';
import { EntranceTest } from '@/components/admission/EntranceTest';
import { MeritList } from '@/components/admission/MeritList';
import { AdmissionFees } from '@/components/admission/AdmissionFees';
import { FileText, CheckCircle, PenTool, Trophy, CreditCard } from 'lucide-react';

const AdmissionManagement = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation showBackButton={true} backUrl="/dashboard" backLabel="Back to Dashboard" />
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Admission Management</h1>
          <p className="text-muted-foreground">Complete admission workflow from application to fee payment</p>
        </div>

        <Tabs defaultValue="applications" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="applications" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Applications</span>
            </TabsTrigger>
            <TabsTrigger value="verification" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Verification</span>
            </TabsTrigger>
            <TabsTrigger value="entrance" className="flex items-center gap-2">
              <PenTool className="h-4 w-4" />
              <span className="hidden sm:inline">Entrance Test</span>
            </TabsTrigger>
            <TabsTrigger value="merit" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Merit List</span>
            </TabsTrigger>
            <TabsTrigger value="fees" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Fees</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="applications" className="mt-6">
            <ApplicationPortal />
          </TabsContent>

          <TabsContent value="verification" className="mt-6">
            <DocumentVerification />
          </TabsContent>

          <TabsContent value="entrance" className="mt-6">
            <EntranceTest />
          </TabsContent>

          <TabsContent value="merit" className="mt-6">
            <MeritList />
          </TabsContent>

          <TabsContent value="fees" className="mt-6">
            <AdmissionFees />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdmissionManagement;