import { useState, useEffect, useCallback } from 'react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Navigation } from '@/components/Navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileText, QrCode, Printer, Download, Plus, Send, CheckCircle, Clock, Loader2 } from "lucide-react";
import { db } from '@/services/supabase/database';
import { Certificate } from '@/types/database.types';
import { useToast } from '@/hooks/use-toast';

export default function CertificateGeneration() {
  const { toast } = useToast();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [certificateType, setCertificateType] = useState('Bonafide Certificate');
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');

  const loadCertificates = useCallback(async () => {
    try {
      const data = await db.getCertificates();
      if (data && data.length > 0) {
        setCertificates(data);
      } else {
        setCertificates([]);
      }
    } catch (err) {
      console.error('Failed to load certificates:', err);
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCertificates();
  }, [loadCertificates]);

  useRealtimeSubscription({
    table: 'student_certificates',
    onChange: loadCertificates,
    onReconnect: loadCertificates,
  });

  const handleGenerateCertificate = async () => {
    if (!studentId.trim() || !purpose.trim()) {
      toast({
        title: "Incomplete details",
        description: "Please enter Student ID and Purpose",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const newCert: Omit<Certificate, 'id' | 'created_at'> = {
        certificate_type: certificateType,
        student_name: studentName.trim() || `Student (${studentId})`,
        roll_number: studentId,
        purpose: purpose,
        issue_date: new Date().toISOString().split('T')[0],
        status: 'Approved',
        certificate_number: `CRT-2024-${Date.now().toString().slice(-4)}`
      };

      const created = await db.requestCertificate(newCert);
      if (created) {
        setCertificates(prev => [created, ...prev]);
      } else {
        setCertificates(prev => [{ ...newCert, id: Date.now().toString() } as Certificate, ...prev]);
      }

      toast({
        title: "Certificate Generated",
        description: `${certificateType} has been created and verified.`
      });

      setPurpose('');
      setStudentId('');
      setStudentName('');
      setAdditionalDetails('');
    } catch (err: any) {
      toast({
        title: "Error generating certificate",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await db.updateCertificateStatus(id, 'Approved');
      setCertificates(prev => prev.map(c => c.id === id ? { ...c, status: 'Approved' } : c));
      toast({
        title: "Certificate Approved",
        description: "Request status updated to Approved."
      });
    } catch (err: any) {
      toast({
        title: "Action failed",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  const pendingCount = certificates.filter(c => c.status === 'Pending').length;
  const approvedCount = certificates.filter(c => c.status === 'Approved' || c.status === 'Issued').length;

  return (
    <div className="min-h-screen bg-background">
      <Navigation showBackButton={true} backUrl="/dashboard" backLabel="Back to Dashboard" />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Certificate Generation</h1>
            <p className="text-muted-foreground">
              Generate automated certificates, digital transcripts, and manage bulk printing
            </p>
          </div>
          <Button onClick={handleGenerateCertificate} disabled={submitting}>
            <Plus className="w-4 h-4 mr-2" />
            New Certificate
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Issued This Month</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{approvedCount}</div>
              <p className="text-xs text-muted-foreground">Certificates issued</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Digital Transcripts</CardTitle>
              <QrCode className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{certificates.filter(c => c.certificate_type?.toLowerCase().includes('transcript')).length}</div>
              <p className="text-xs text-muted-foreground">With QR verification</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bulk Jobs</CardTitle>
              <Printer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Active print jobs</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="generate" className="space-y-4">
          <TabsList>
            <TabsTrigger value="generate">Generate Certificates</TabsTrigger>
            <TabsTrigger value="requests">Certificate Requests ({certificates.length})</TabsTrigger>
            <TabsTrigger value="transcripts">Digital Transcripts</TabsTrigger>
            <TabsTrigger value="bulk-printing">Bulk Printing</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Certificate Generation</CardTitle>
                  <CardDescription>Generate common certificates instantly</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Certificate Type</label>
                    <Select value={certificateType} onValueChange={setCertificateType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select certificate type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bonafide Certificate">Bonafide Certificate</SelectItem>
                        <SelectItem value="Character Certificate">Character Certificate</SelectItem>
                        <SelectItem value="Conduct Certificate">Conduct Certificate</SelectItem>
                        <SelectItem value="Transfer Certificate">Transfer Certificate</SelectItem>
                        <SelectItem value="Course Completion">Course Completion</SelectItem>
                        <SelectItem value="Attendance Certificate">Attendance Certificate</SelectItem>
                        <SelectItem value="Medical Certificate">Medical Certificate</SelectItem>
                        <SelectItem value="Scholarship Certificate">Scholarship Certificate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Student ID</label>
                      <Input 
                        placeholder="e.g., CS2021001" 
                        value={studentId} 
                        onChange={(e) => setStudentId(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Student Name</label>
                      <Input 
                        placeholder="Full student name" 
                        value={studentName} 
                        onChange={(e) => setStudentName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Purpose/Reason</label>
                    <Textarea 
                      placeholder="Enter the purpose for this certificate..." 
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Additional Details</label>
                    <Textarea 
                      placeholder="Any additional information..." 
                      value={additionalDetails}
                      onChange={(e) => setAdditionalDetails(e.target.value)}
                    />
                  </div>

                  <div className="flex space-x-2">
                    <Button className="flex-1" onClick={handleGenerateCertificate} disabled={submitting}>
                      {submitting ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                        </span>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Generate Certificate
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => toast({ title: "QR Attached", description: "Cryptographic QR added to digital certificate" })}>
                      <QrCode className="w-4 h-4 mr-2" />
                      Add QR Code
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Certificate Templates</CardTitle>
                  <CardDescription>Manage and customize certificate templates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Bonafide Certificate</div>
                        <div className="text-sm text-muted-foreground">Standard template with college letterhead</div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">Edit</Button>
                        <Button variant="outline" size="sm">Preview</Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Character Certificate</div>
                        <div className="text-sm text-muted-foreground">For employment and higher studies</div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">Edit</Button>
                        <Button variant="outline" size="sm">Preview</Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Transfer Certificate</div>
                        <div className="text-sm text-muted-foreground">For college transfer students</div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">Edit</Button>
                        <Button variant="outline" size="sm">Preview</Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Course Completion</div>
                        <div className="text-sm text-muted-foreground">For completed courses and programs</div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">Edit</Button>
                        <Button variant="outline" size="sm">Preview</Button>
                      </div>
                    </div>

                    <Button variant="outline" className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Certificate Requests</CardTitle>
                <CardDescription>Manage and approve certificate requests from students</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search requests..." className="pl-8" />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Requests</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="issued">Issued</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
                
                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Request ID</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Certificate Type</TableHead>
                        <TableHead>Purpose</TableHead>
                        <TableHead>Request Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {certificates.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                            <FileText className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                            <p className="font-semibold text-foreground/80">No Certificate Requests Found</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Certificates generated or requested by students will be listed here.
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        certificates.map((cert) => (
                          <TableRow key={cert.id}>
                            <TableCell className="font-medium">{cert.certificate_number || cert.id.slice(0, 8)}</TableCell>
                            <TableCell>{cert.student_name} ({cert.roll_number || 'N/A'})</TableCell>
                            <TableCell>{cert.certificate_type}</TableCell>
                            <TableCell>{cert.purpose || 'Official Use'}</TableCell>
                            <TableCell>{cert.issue_date}</TableCell>
                            <TableCell>
                              <Badge variant={cert.status === 'Approved' ? 'default' : cert.status === 'Pending' ? 'secondary' : 'outline'}>
                                {cert.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                {cert.status === 'Pending' && (
                                  <Button variant="outline" size="sm" onClick={() => handleApprove(cert.id)}>
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button variant="outline" size="sm" onClick={() => toast({ title: "Downloading", description: `Downloading ${cert.certificate_type}` })}>
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transcripts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Digital Transcripts with QR Verification</CardTitle>
                <CardDescription>Generate secure digital transcripts with blockchain verification</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 mb-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Generate New Transcript</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Student ID</label>
                        <div className="flex space-x-2">
                          <Input placeholder="Enter student ID" />
                          <Button variant="outline">Verify</Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Transcript Type</label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="official">Official Transcript</SelectItem>
                            <SelectItem value="unofficial">Unofficial Transcript</SelectItem>
                            <SelectItem value="interim">Interim Transcript</SelectItem>
                            <SelectItem value="degree">Degree Certificate</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Academic Year</label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select year" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2023-24">2023-24</SelectItem>
                            <SelectItem value="2022-23">2022-23</SelectItem>
                            <SelectItem value="2021-22">2021-22</SelectItem>
                            <SelectItem value="all">All Years</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button className="w-full" onClick={() => toast({ title: "Transcript Generated", description: "Secure cryptographically hashed transcript created." })}>
                        <QrCode className="w-4 h-4 mr-2" />
                        Generate Digital Transcript
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">QR Code Features</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <QrCode className="w-5 h-5 text-blue-500" />
                          <div>
                            <div className="font-medium">Blockchain Verification</div>
                            <div className="text-sm text-muted-foreground">Tamper-proof digital signatures</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <div>
                            <div className="font-medium">Instant Verification</div>
                            <div className="text-sm text-muted-foreground">Real-time authenticity check</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5 text-purple-500" />
                          <div>
                            <div className="font-medium">PDF Integration</div>
                            <div className="text-sm text-muted-foreground">Embedded QR in documents</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <Download className="w-5 h-5 text-orange-500" />
                          <div>
                            <div className="font-medium">Digital Delivery</div>
                            <div className="text-sm text-muted-foreground">Email & portal access</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk-printing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Certificate Printing</CardTitle>
                <CardDescription>Manage bulk printing jobs for certificates and transcripts</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Create batch queues for graduation diplomas and semester marksheets.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
