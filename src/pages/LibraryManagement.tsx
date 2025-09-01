import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DigitalCatalog } from '@/components/library/DigitalCatalog';
import { BookTracking } from '@/components/library/BookTracking';
import { LibraryAnalytics } from '@/components/library/LibraryAnalytics';
import { DigitalLibrary } from '@/components/library/DigitalLibrary';
import { BookOpen, QrCode, BarChart3, Upload } from 'lucide-react';

const LibraryManagement = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation showBackButton={true} backUrl="/dashboard" backLabel="Back to Dashboard" />
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Library Management System</h1>
          <p className="text-muted-foreground">Digital catalog, book tracking, and comprehensive library analytics</p>
        </div>

        <Tabs defaultValue="catalog" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="catalog" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Digital Catalog</span>
            </TabsTrigger>
            <TabsTrigger value="tracking" className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              <span className="hidden sm:inline">Book Tracking</span>
            </TabsTrigger>
            <TabsTrigger value="digital" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Digital Library</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="catalog" className="mt-6">
            <DigitalCatalog />
          </TabsContent>

          <TabsContent value="tracking" className="mt-6">
            <BookTracking />
          </TabsContent>

          <TabsContent value="digital" className="mt-6">
            <DigitalLibrary />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <LibraryAnalytics />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default LibraryManagement;