import React, { useState } from 'react';
import { 
  WidgetPlacement, 
  PageSectionConfig, 
  NavItemConfig 
} from '@/types/superAdmin.types';
import { DynamicWidgetRenderer } from '@/components/widgets/DynamicWidgetRenderer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Plus, 
  Sliders, 
  Trash2, 
  Move, 
  ArrowLeft, 
  ArrowRight, 
  Settings2, 
  Sparkles, 
  Grid,
  CheckCircle2,
  Lock,
  Layers
} from 'lucide-react';

// Actual 13 Role Dashboards
import { StudentDashboard } from '@/components/dashboards/StudentDashboard';
import { TeacherDashboard } from '@/components/dashboards/TeacherDashboard';
import { ParentDashboard } from '@/components/dashboards/ParentDashboard';
import { AdminDashboard } from '@/components/dashboards/AdminDashboard';
import PrincipalDashboard from '@/components/dashboards/PrincipalDashboard';
import FinanceManagerDashboard from '@/components/dashboards/FinanceManagerDashboard';
import ReceptionistDashboard from '@/components/dashboards/ReceptionistDashboard';
import StoreManagerDashboard from '@/components/dashboards/StoreManagerDashboard';
import TransportDriverDashboard from '@/components/dashboards/TransportDriverDashboard';
import HRManagerDashboard from '@/components/dashboards/HRManagerDashboard';
import LibrarianDashboard from '@/components/dashboards/LibrarianDashboard';
import HostelWardenDashboard from '@/components/dashboards/HostelWardenDashboard';
import PlacementOfficerDashboard from '@/components/dashboards/PlacementOfficerDashboard';

interface LivePortalHostProps {
  roleKey: string;
  isLiveEditMode: boolean;
  widgets: WidgetPlacement[];
  sections: PageSectionConfig[];
  navItems: NavItemConfig[];
  onOpenWidgetSelector: () => void;
  onOpenSectionsModal: () => void;
  onOpenNavDrawer: () => void;
  onOpenInspector: (widget: WidgetPlacement) => void;
  onUpdateWidgets: (newWidgets: WidgetPlacement[]) => void;
  onRemoveWidget: (instanceId: string) => void;
  onResizeWidget: (instanceId: string, colSpan: 1 | 2 | 3 | 4) => void;
  onMoveWidget: (index: number, direction: 'left' | 'right') => void;
}

export function LivePortalHost({
  roleKey,
  isLiveEditMode,
  widgets,
  sections,
  navItems,
  onOpenWidgetSelector,
  onOpenSectionsModal,
  onOpenNavDrawer,
  onOpenInspector,
  onUpdateWidgets,
  onRemoveWidget,
  onResizeWidget,
  onMoveWidget
}: LivePortalHostProps) {

  // Render the actual role dashboard component
  const renderActualDashboard = () => {
    switch (roleKey) {
      case 'student':
        return <StudentDashboard />;
      case 'teacher':
      case 'hod':
        return <TeacherDashboard />;
      case 'principal':
        return <PrincipalDashboard />;
      case 'parent':
        return <ParentDashboard />;
      case 'admin':
        return <AdminDashboard />;
      case 'finance_manager':
      case 'financier':
      case 'accountant':
        return <FinanceManagerDashboard />;
      case 'receptionist':
        return <ReceptionistDashboard />;
      case 'store_manager':
      case 'storekeeper':
        return <StoreManagerDashboard />;
      case 'transport_driver':
      case 'driver':
        return <TransportDriverDashboard />;
      case 'hr_manager':
      case 'hr':
        return <HRManagerDashboard />;
      case 'librarian':
        return <LibrarianDashboard />;
      case 'hostel_warden':
      case 'warden':
        return <HostelWardenDashboard />;
      case 'placement_officer':
        return <PlacementOfficerDashboard />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50/70 pb-20">
      
      {/* 1. Live Visual Customization Banner (Visible when Live Edit Mode is ON) */}
      {isLiveEditMode && (
        <div className="bg-indigo-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-xs sticky top-[49px] z-40 border-b border-indigo-700 animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              LIVE IN-CONTEXT CUSTOMIZER: Viewing & Editing <strong className="uppercase underline underline-offset-2">{roleKey} Portal</strong>
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-indigo-100 hidden sm:inline">
              Hover over or click elements to customize, resize, or rearrange
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenWidgetSelector}
              className="h-6 text-[11px] bg-white text-indigo-900 hover:bg-indigo-50 border-white font-bold"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Widget Here
            </Button>
          </div>
        </div>
      )}

      {/* 2. Top Interactive Customizable Widgets Grid */}
      <div className="container mx-auto px-4 pt-4">
        {widgets && widgets.length > 0 && (
          <div className="mb-6 space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <Grid className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Live Executive Dashboard Widgets ({widgets.length})
                </h3>
              </div>
              {isLiveEditMode && (
                <div className="flex items-center space-x-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onOpenWidgetSelector}
                    className="h-7 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Widget
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onOpenSectionsModal}
                    className="h-7 text-xs text-slate-600 hover:bg-slate-100"
                  >
                    <Sliders className="w-3.5 h-3.5 mr-1" />
                    Sections
                  </Button>
                </div>
              )}
            </div>

            {/* Grid Container */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {widgets.map((w, index) => {
                const colSpanClass = 
                  w.colSpan === 4 ? 'col-span-1 md:col-span-4' :
                  w.colSpan === 3 ? 'col-span-1 md:col-span-3' :
                  w.colSpan === 2 ? 'col-span-1 md:col-span-2' :
                  'col-span-1';

                return (
                  <div
                    key={w.instanceId}
                    className={`${colSpanClass} relative group transition-all`}
                  >
                    {/* Live Customizer Overlay Frame when Edit Mode is ON */}
                    {isLiveEditMode && (
                      <div className="absolute inset-0 z-20 border-2 border-dashed border-indigo-400 rounded-xl bg-indigo-500/5 pointer-events-none group-hover:border-indigo-600 transition-colors" />
                    )}

                    {/* Floating Controls Bar on top of widget */}
                    {isLiveEditMode && (
                      <div className="absolute top-2 right-2 z-30 flex items-center space-x-1 bg-white/95 backdrop-blur-xs p-1 rounded-lg border border-slate-200 shadow-md opacity-90 group-hover:opacity-100 transition-opacity">
                        {/* ColSpan Picker */}
                        <div className="flex rounded border border-slate-200 overflow-hidden text-[10px]">
                          {([1, 2, 3, 4] as const).map(span => (
                            <button
                              key={span}
                              type="button"
                              onClick={() => onResizeWidget(w.instanceId, span)}
                              className={`px-1.5 py-0.5 font-bold transition-colors ${
                                w.colSpan === span
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-white hover:bg-slate-100 text-slate-700'
                              }`}
                              title={`Set width to ${span} columns`}
                            >
                              {span}c
                            </button>
                          ))}
                        </div>

                        {/* Move Left */}
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => onMoveWidget(index, 'left')}
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-30"
                          title="Move Left"
                        >
                          <ArrowLeft className="w-3 h-3" />
                        </button>

                        {/* Move Right */}
                        <button
                          type="button"
                          disabled={index === widgets.length - 1}
                          onClick={() => onMoveWidget(index, 'right')}
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-30"
                          title="Move Right"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>

                        {/* Inspect / Settings */}
                        <button
                          type="button"
                          onClick={() => onOpenInspector(w)}
                          className="p-1 text-indigo-600 hover:bg-indigo-50 rounded font-semibold"
                          title="Inspect Widget Properties"
                        >
                          <Settings2 className="w-3 h-3" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => onRemoveWidget(w.instanceId)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                          title="Delete Widget"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* The Live Rendered Widget */}
                    <DynamicWidgetRenderer
                      placement={w}
                      userRole={roleKey}
                      isCustomizing={false}
                    />
                  </div>
                );
              })}

              {/* + Add Widget Dropzone Card */}
              {isLiveEditMode && (
                <div 
                  onClick={onOpenWidgetSelector}
                  className="col-span-1 min-h-[140px] border-2 border-dashed border-indigo-300 hover:border-indigo-600 bg-indigo-50/20 hover:bg-indigo-50/60 rounded-xl flex flex-col items-center justify-center p-4 cursor-pointer transition-all text-center group"
                >
                  <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Add Custom Widget</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">Choose from 22 KPI & analytics cards</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. The ACTUAL Live Role Portal Workspace */}
      <div className="relative">
        {renderActualDashboard()}
      </div>

    </div>
  );
}
