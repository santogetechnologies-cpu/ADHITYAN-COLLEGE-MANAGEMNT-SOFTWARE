import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Upload, Image, Type, Layout, Palette, Download, Save, Eye } from 'lucide-react';

interface TemplateCustomizationDialogProps {
  children: React.ReactNode;
  templateName?: string;
  isEdit?: boolean;
}

export const TemplateCustomizationDialog = ({ 
  children, 
  templateName = "New Template",
  isEdit = false 
}: TemplateCustomizationDialogProps) => {
  const [open, setOpen] = useState(false);
  const [template, setTemplate] = useState({
    name: templateName,
    type: 'bonafide',
    layout: 'standard',
    headerText: 'CERTIFICATE',
    schoolName: 'XYZ College of Engineering',
    address: '123 Education Street, Academic City',
    logoPosition: 'top-center',
    signatureFields: 2,
    includeQR: true,
    watermark: true,
    borderStyle: 'classic',
    fontFamily: 'Times New Roman',
    primaryColor: '#1e40af',
    secondaryColor: '#64748b'
  });

  const certificateTypes = [
    { value: 'bonafide', label: 'Bonafide Certificate' },
    { value: 'character', label: 'Character Certificate' },
    { value: 'conduct', label: 'Conduct Certificate' },
    { value: 'transfer', label: 'Transfer Certificate' },
    { value: 'course-completion', label: 'Course Completion' },
    { value: 'attendance', label: 'Attendance Certificate' },
    { value: 'medical', label: 'Medical Certificate' },
    { value: 'scholarship', label: 'Scholarship Certificate' }
  ];

  const layoutOptions = [
    { value: 'standard', label: 'Standard Layout' },
    { value: 'modern', label: 'Modern Layout' },
    { value: 'classic', label: 'Classic Layout' },
    { value: 'minimal', label: 'Minimal Layout' }
  ];

  const fontOptions = [
    { value: 'Times New Roman', label: 'Times New Roman' },
    { value: 'Arial', label: 'Arial' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Helvetica', label: 'Helvetica' }
  ];

  const borderStyles = [
    { value: 'none', label: 'No Border' },
    { value: 'simple', label: 'Simple Border' },
    { value: 'classic', label: 'Classic Border' },
    { value: 'decorative', label: 'Decorative Border' }
  ];

  const handleSave = () => {
    // Handle save logic here
    console.log('Saving template:', template);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Edit Template: ${templateName}` : 'Create New Certificate Template'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Configuration */}
          <div className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="design">Design</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layout className="h-4 w-4" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="templateName">Template Name</Label>
                      <Input
                        id="templateName"
                        value={template.name}
                        onChange={(e) => setTemplate({...template, name: e.target.value})}
                        placeholder="Enter template name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="certificateType">Certificate Type</Label>
                      <Select value={template.type} onValueChange={(value) => setTemplate({...template, type: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select certificate type" />
                        </SelectTrigger>
                        <SelectContent>
                          {certificateTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="layout">Layout Style</Label>
                      <Select value={template.layout} onValueChange={(value) => setTemplate({...template, layout: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select layout" />
                        </SelectTrigger>
                        <SelectContent>
                          {layoutOptions.map((layout) => (
                            <SelectItem key={layout.value} value={layout.value}>
                              {layout.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="design" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Visual Design
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="primaryColor">Primary Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="primaryColor"
                            type="color"
                            value={template.primaryColor}
                            onChange={(e) => setTemplate({...template, primaryColor: e.target.value})}
                            className="w-16"
                          />
                          <Input
                            value={template.primaryColor}
                            onChange={(e) => setTemplate({...template, primaryColor: e.target.value})}
                            placeholder="#1e40af"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="secondaryColor">Secondary Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="secondaryColor"
                            type="color"
                            value={template.secondaryColor}
                            onChange={(e) => setTemplate({...template, secondaryColor: e.target.value})}
                            className="w-16"
                          />
                          <Input
                            value={template.secondaryColor}
                            onChange={(e) => setTemplate({...template, secondaryColor: e.target.value})}
                            placeholder="#64748b"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fontFamily">Font Family</Label>
                      <Select value={template.fontFamily} onValueChange={(value) => setTemplate({...template, fontFamily: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select font" />
                        </SelectTrigger>
                        <SelectContent>
                          {fontOptions.map((font) => (
                            <SelectItem key={font.value} value={font.value}>
                              {font.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="borderStyle">Border Style</Label>
                      <Select value={template.borderStyle} onValueChange={(value) => setTemplate({...template, borderStyle: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select border style" />
                        </SelectTrigger>
                        <SelectContent>
                          {borderStyles.map((border) => (
                            <SelectItem key={border.value} value={border.value}>
                              {border.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="watermark">Include Watermark</Label>
                        <Switch
                          id="watermark"
                          checked={template.watermark}
                          onCheckedChange={(checked) => setTemplate({...template, watermark: checked})}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="includeQR">Include QR Code</Label>
                        <Switch
                          id="includeQR"
                          checked={template.includeQR}
                          onCheckedChange={(checked) => setTemplate({...template, includeQR: checked})}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="content" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Type className="h-4 w-4" />
                      Content Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="headerText">Header Text</Label>
                      <Input
                        id="headerText"
                        value={template.headerText}
                        onChange={(e) => setTemplate({...template, headerText: e.target.value})}
                        placeholder="CERTIFICATE"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="schoolName">Institution Name</Label>
                      <Input
                        id="schoolName"
                        value={template.schoolName}
                        onChange={(e) => setTemplate({...template, schoolName: e.target.value})}
                        placeholder="XYZ College of Engineering"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Institution Address</Label>
                      <Textarea
                        id="address"
                        value={template.address}
                        onChange={(e) => setTemplate({...template, address: e.target.value})}
                        placeholder="123 Education Street, Academic City"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="logoPosition">Logo Position</Label>
                      <Select value={template.logoPosition} onValueChange={(value) => setTemplate({...template, logoPosition: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select logo position" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top-left">Top Left</SelectItem>
                          <SelectItem value="top-center">Top Center</SelectItem>
                          <SelectItem value="top-right">Top Right</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Advanced Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signatureFields">Number of Signature Fields</Label>
                      <Select 
                        value={template.signatureFields.toString()} 
                        onValueChange={(value) => setTemplate({...template, signatureFields: parseInt(value)})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select number of signatures" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Signature</SelectItem>
                          <SelectItem value="2">2 Signatures</SelectItem>
                          <SelectItem value="3">3 Signatures</SelectItem>
                          <SelectItem value="4">4 Signatures</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Upload Institution Logo</Label>
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Drag and drop your logo here, or click to browse
                        </p>
                        <Button variant="outline" size="sm" className="mt-2">
                          Browse Files
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Upload Background Image (Optional)</Label>
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                        <Image className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Upload background image or pattern
                        </p>
                        <Button variant="outline" size="sm" className="mt-2">
                          Browse Files
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Panel - Preview */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Live Preview
                </CardTitle>
                <CardDescription>Preview how your certificate will look</CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className="border rounded-lg p-6 bg-white min-h-[600px] relative"
                  style={{ 
                    fontFamily: template.fontFamily,
                    borderColor: template.primaryColor,
                    borderWidth: template.borderStyle !== 'none' ? '2px' : '0'
                  }}
                >
                  {/* Certificate Preview */}
                  <div className="text-center space-y-4">
                    <div className="flex justify-center mb-4">
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                        <Image className="h-8 w-8 text-gray-400" />
                      </div>
                    </div>
                    
                    <h1 
                      className="text-3xl font-bold"
                      style={{ color: template.primaryColor }}
                    >
                      {template.headerText}
                    </h1>
                    
                    <h2 className="text-xl font-semibold">
                      {template.schoolName}
                    </h2>
                    
                    <p className="text-sm text-gray-600">
                      {template.address}
                    </p>
                    
                    <Separator className="my-6" />
                    
                    <div className="text-lg">
                      This is to certify that
                    </div>
                    
                    <div 
                      className="text-2xl font-bold border-b-2 inline-block px-8 py-2"
                      style={{ borderColor: template.primaryColor }}
                    >
                      [Student Name]
                    </div>
                    
                    <div className="space-y-2 text-base">
                      <p>has successfully completed</p>
                      <p className="font-semibold">[Course/Program Name]</p>
                      <p>during the academic year [Year]</p>
                    </div>
                    
                    <div className="mt-8 flex justify-between items-end">
                      {Array.from({ length: template.signatureFields }).map((_, index) => (
                        <div key={index} className="text-center">
                          <div className="border-t border-gray-400 w-32 mb-1"></div>
                          <p className="text-sm">Signature {index + 1}</p>
                        </div>
                      ))}
                    </div>
                    
                    {template.includeQR && (
                      <div className="absolute bottom-4 right-4">
                        <div className="w-16 h-16 bg-gray-200 flex items-center justify-center">
                          <span className="text-xs">QR</span>
                        </div>
                      </div>
                    )}
                    
                    {template.watermark && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div 
                          className="text-6xl opacity-5 transform rotate-45"
                          style={{ color: template.secondaryColor }}
                        >
                          ORIGINAL
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator />

        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Badge variant="outline">Template: {template.name}</Badge>
            <Badge variant="outline">Type: {certificateTypes.find(t => t.value === template.type)?.label}</Badge>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Template
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              {isEdit ? 'Update Template' : 'Save Template'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};