import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useNAAC } from '@/context/NAACContext';
import { 
  Settings as SettingsIcon, 
  Save, 
  University,
  User,
  Bell,
  Shield,
  FileText,
  Calendar
} from 'lucide-react';

export default function Settings() {
  const { naacData } = useNAAC();
  const [institutionSettings, setInstitionSettings] = useState({
    name: 'Sample University',
    address: '123 Education Street, Knowledge City',
    website: 'https://sampleuniversity.edu',
    email: 'naac@sampleuniversity.edu',
    phone: '+91-9876543210',
    establishedYear: '1985',
    accreditationCycle: '4th',
    vicechancellor: 'Dr. Rajesh Kumar',
    naacCoordinator: 'Dr. Priya Sharma'
  });

  const [systemSettings, setSystemSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    reminderFrequency: 'weekly',
    autoBackup: true,
    documentRetention: '7',
    multiLanguage: false,
    theme: 'light'
  });

  const [accessControl, setAccessControl] = useState({
    adminUsers: ['admin@university.edu', 'vc@university.edu'],
    coordinators: ['naac.coord@university.edu', 'quality@university.edu'],
    facultyAccess: true,
    studentAccess: false,
    publicAccess: false
  });

  const handleSaveInstitution = () => {
    // In real implementation, this would save to backend
    console.log('Saving institution settings:', institutionSettings);
  };

  const handleSaveSystem = () => {
    // In real implementation, this would save to backend
    console.log('Saving system settings:', systemSettings);
  };

  const handleSaveAccess = () => {
    // In real implementation, this would save to backend
    console.log('Saving access control:', accessControl);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
          <SettingsIcon className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Settings</h1>
          <p className="text-muted-foreground">Configure NAAC ERP system preferences</p>
        </div>
      </div>

      {/* Institution Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <University className="w-5 h-5" />
            <CardTitle>Institution Information</CardTitle>
          </div>
          <CardDescription>Basic details about your educational institution</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="inst-name">Institution Name</Label>
              <Input
                id="inst-name"
                value={institutionSettings.name}
                onChange={(e) => setInstitionSettings(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="established">Established Year</Label>
              <Input
                id="established"
                type="number"
                value={institutionSettings.establishedYear}
                onChange={(e) => setInstitionSettings(prev => ({ ...prev, establishedYear: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="website">Website URL</Label>
              <Input
                id="website"
                type="url"
                value={institutionSettings.website}
                onChange={(e) => setInstitionSettings(prev => ({ ...prev, website: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="email">Official Email</Label>
              <Input
                id="email"
                type="email"
                value={institutionSettings.email}
                onChange={(e) => setInstitionSettings(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={institutionSettings.phone}
                onChange={(e) => setInstitionSettings(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="cycle">Accreditation Cycle</Label>
              <Select 
                value={institutionSettings.accreditationCycle}
                onValueChange={(value) => setInstitionSettings(prev => ({ ...prev, accreditationCycle: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1st">1st Cycle</SelectItem>
                  <SelectItem value="2nd">2nd Cycle</SelectItem>
                  <SelectItem value="3rd">3rd Cycle</SelectItem>
                  <SelectItem value="4th">4th Cycle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="vc">Vice Chancellor</Label>
              <Input
                id="vc"
                value={institutionSettings.vicechancellor}
                onChange={(e) => setInstitionSettings(prev => ({ ...prev, vicechancellor: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="coordinator">NAAC Coordinator</Label>
              <Input
                id="coordinator"
                value={institutionSettings.naacCoordinator}
                onChange={(e) => setInstitionSettings(prev => ({ ...prev, naacCoordinator: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={institutionSettings.address}
              onChange={(e) => setInstitionSettings(prev => ({ ...prev, address: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveInstitution}>
              <Save className="w-4 h-4 mr-2" />
              Save Institution Details
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <CardTitle>System Preferences</CardTitle>
          </div>
          <CardDescription>Configure system behavior and notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Notifications</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-notif">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive email alerts for important updates</p>
                </div>
                <Switch
                  id="email-notif"
                  checked={systemSettings.emailNotifications}
                  onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, emailNotifications: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sms-notif">SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive SMS alerts for critical updates</p>
                </div>
                <Switch
                  id="sms-notif"
                  checked={systemSettings.smsNotifications}
                  onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, smsNotifications: checked }))}
                />
              </div>

              <div>
                <Label htmlFor="reminder-freq">Reminder Frequency</Label>
                <Select 
                  value={systemSettings.reminderFrequency}
                  onValueChange={(value) => setSystemSettings(prev => ({ ...prev, reminderFrequency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Data Management</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-backup">Automatic Backup</Label>
                  <p className="text-sm text-muted-foreground">Enable daily automatic backups</p>
                </div>
                <Switch
                  id="auto-backup"
                  checked={systemSettings.autoBackup}
                  onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, autoBackup: checked }))}
                />
              </div>

              <div>
                <Label htmlFor="retention">Document Retention (Years)</Label>
                <Select 
                  value={systemSettings.documentRetention}
                  onValueChange={(value) => setSystemSettings(prev => ({ ...prev, documentRetention: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 Years</SelectItem>
                    <SelectItem value="7">7 Years</SelectItem>
                    <SelectItem value="10">10 Years</SelectItem>
                    <SelectItem value="permanent">Permanent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="multi-lang">Multi-language Support</Label>
                  <p className="text-sm text-muted-foreground">Enable multiple language interface</p>
                </div>
                <Switch
                  id="multi-lang"
                  checked={systemSettings.multiLanguage}
                  onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, multiLanguage: checked }))}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveSystem}>
              <Save className="w-4 h-4 mr-2" />
              Save System Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Access Control */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <CardTitle>Access Control</CardTitle>
          </div>
          <CardDescription>Manage user permissions and access levels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold">User Access Levels</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="faculty-access">Faculty Access</Label>
                  <p className="text-sm text-muted-foreground">Allow faculty to view and edit relevant sections</p>
                </div>
                <Switch
                  id="faculty-access"
                  checked={accessControl.facultyAccess}
                  onCheckedChange={(checked) => setAccessControl(prev => ({ ...prev, facultyAccess: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="student-access">Student Access</Label>
                  <p className="text-sm text-muted-foreground">Allow students to view basic information</p>
                </div>
                <Switch
                  id="student-access"
                  checked={accessControl.studentAccess}
                  onCheckedChange={(checked) => setAccessControl(prev => ({ ...prev, studentAccess: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="public-access">Public Access</Label>
                  <p className="text-sm text-muted-foreground">Allow public viewing of certain reports</p>
                </div>
                <Switch
                  id="public-access"
                  checked={accessControl.publicAccess}
                  onCheckedChange={(checked) => setAccessControl(prev => ({ ...prev, publicAccess: checked }))}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Role Management</h3>
              
              <div>
                <Label>System Administrators</Label>
                <div className="mt-2 space-y-2">
                  {accessControl.adminUsers.map((email, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">{email}</span>
                      <Button variant="ghost" size="sm">Remove</Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm">Add Administrator</Button>
                </div>
              </div>

              <div>
                <Label>NAAC Coordinators</Label>
                <div className="mt-2 space-y-2">
                  {accessControl.coordinators.map((email, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">{email}</span>
                      <Button variant="ghost" size="sm">Remove</Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm">Add Coordinator</Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveAccess}>
              <Save className="w-4 h-4 mr-2" />
              Save Access Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <CardTitle>System Information</CardTitle>
          </div>
          <CardDescription>Current system status and information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">{naacData.documents.length}</div>
              <div className="text-sm text-muted-foreground">Total Documents</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {naacData.criterionProgress.reduce((acc, p) => acc + p.completedMetrics, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Completed Metrics</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {Math.round(naacData.criterionProgress.reduce((acc, p) => acc + p.completionPercentage, 0) / 7)}%
              </div>
              <div className="text-sm text-muted-foreground">Overall Progress</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}