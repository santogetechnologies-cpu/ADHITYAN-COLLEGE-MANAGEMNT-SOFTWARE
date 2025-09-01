import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useNAAC } from '@/context/NAACContext';
import { 
  Award, 
  FileText, 
  TrendingUp, 
  Calendar,
  CheckCircle2,
  AlertCircle,
  Upload,
  BarChart3
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NAACDashboard() {
  const { naacData } = useNAAC();

  const overallProgress = Math.round(
    naacData.criterionProgress.reduce((acc, p) => acc + p.completionPercentage, 0) / 7
  );

  const completedCriteria = naacData.criterionProgress.filter(p => p.completionPercentage >= 90).length;
  const inProgressCriteria = naacData.criterionProgress.filter(p => p.completionPercentage >= 50 && p.completionPercentage < 90).length;
  const pendingCriteria = naacData.criterionProgress.filter(p => p.completionPercentage < 50).length;

  const recentDocuments = naacData.documents
    .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">NAAC Dashboard</h1>
          <p className="text-muted-foreground">Monitor your institution's NAAC accreditation progress</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/naac/repository">
              <Upload className="w-4 h-4 mr-2" />
              Upload Documents
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/naac/reports">
              <BarChart3 className="w-4 h-4 mr-2" />
              Generate Reports
            </Link>
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
            <Award className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallProgress}%</div>
            <Progress value={overallProgress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Criteria</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCriteria}/7</div>
            <p className="text-xs text-muted-foreground mt-1">
              ≥90% completion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <TrendingUp className="w-4 h-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressCriteria}</div>
            <p className="text-xs text-muted-foreground mt-1">
              50-89% completion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCriteria}</div>
            <p className="text-xs text-muted-foreground mt-1">
              &lt;50% completion
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Criteria Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Criteria Progress</CardTitle>
            <CardDescription>Progress status for all 7 NAAC criteria</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {naacData.criterionProgress.map((criterion) => (
              <div key={criterion.criterionNumber} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Criterion {criterion.criterionNumber}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {criterion.completionPercentage}% ({criterion.completedMetrics}/{criterion.totalMetrics})
                  </span>
                </div>
                <Progress value={criterion.completionPercentage} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Documents */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Documents</CardTitle>
            <CardDescription>Recently uploaded evidence documents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center space-x-3 p-2 rounded-lg border">
                  <FileText className="w-8 h-8 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Criterion {doc.criterionNumber} • {doc.metricCode} • {doc.uploadDate}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {doc.fileSize}
                  </div>
                </div>
              ))}
              {recentDocuments.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No documents uploaded yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto p-4" asChild>
              <Link to="/naac/criterion-1">
                <div className="text-center">
                  <Award className="w-8 h-8 mx-auto mb-2" />
                  <div className="font-medium">Start Criterion 1</div>
                  <div className="text-xs text-muted-foreground">Curricular Aspects</div>
                </div>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-auto p-4" asChild>
              <Link to="/naac/repository">
                <div className="text-center">
                  <Upload className="w-8 h-8 mx-auto mb-2" />
                  <div className="font-medium">Upload Evidence</div>
                  <div className="text-xs text-muted-foreground">Add supporting documents</div>
                </div>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-auto p-4" asChild>
              <Link to="/naac/reports">
                <div className="text-center">
                  <FileText className="w-8 h-8 mx-auto mb-2" />
                  <div className="font-medium">Generate SSR</div>
                  <div className="text-xs text-muted-foreground">Self Study Report</div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}