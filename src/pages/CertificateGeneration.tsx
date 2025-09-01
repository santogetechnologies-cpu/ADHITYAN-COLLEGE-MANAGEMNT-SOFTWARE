import { Navigation } from '@/components/Navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileText, QrCode, Printer, Download, Plus, Send, CheckCircle, Clock } from "lucide-react";

export default function CertificateGeneration() {
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
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Certificate
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">456</div>
            <p className="text-xs text-muted-foreground">Certificates issued</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Digital Transcripts</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <p className="text-xs text-muted-foreground">With QR verification</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bulk Jobs</CardTitle>
            <Printer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">Active print jobs</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="generate" className="space-y-4">
        <TabsList>
          <TabsTrigger value="generate">Generate Certificates</TabsTrigger>
          <TabsTrigger value="requests">Certificate Requests</TabsTrigger>
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
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select certificate type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bonafide">Bonafide Certificate</SelectItem>
                      <SelectItem value="character">Character Certificate</SelectItem>
                      <SelectItem value="conduct">Conduct Certificate</SelectItem>
                      <SelectItem value="transfer">Transfer Certificate</SelectItem>
                      <SelectItem value="course-completion">Course Completion</SelectItem>
                      <SelectItem value="attendance">Attendance Certificate</SelectItem>
                      <SelectItem value="medical">Medical Certificate</SelectItem>
                      <SelectItem value="scholarship">Scholarship Certificate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Student Details</label>
                  <div className="flex space-x-2">
                    <Input placeholder="Student ID" className="flex-1" />
                    <Button variant="outline">Search</Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Purpose/Reason</label>
                  <Textarea placeholder="Enter the purpose for this certificate..." />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Additional Details</label>
                  <Textarea placeholder="Any additional information..." />
                </div>

                <div className="flex space-x-2">
                  <Button className="flex-1">
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Certificate
                  </Button>
                  <Button variant="outline">
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
                <Select>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Requests</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
              
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
                  <TableRow>
                    <TableCell className="font-medium">CRT-2024-001</TableCell>
                    <TableCell>Amit Kumar Singh (CS2021001)</TableCell>
                    <TableCell>Bonafide Certificate</TableCell>
                    <TableCell>Bank Loan Application</TableCell>
                    <TableCell>Nov 15, 2024</TableCell>
                    <TableCell><Badge variant="secondary">Pending</Badge></TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">CRT-2024-002</TableCell>
                    <TableCell>Priya Sharma (EC2020045)</TableCell>
                    <TableCell>Character Certificate</TableCell>
                    <TableCell>Job Application</TableCell>
                    <TableCell>Nov 14, 2024</TableCell>
                    <TableCell><Badge>Approved</Badge></TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">CRT-2024-003</TableCell>
                    <TableCell>Rahul Verma (ME2022034)</TableCell>
                    <TableCell>Transfer Certificate</TableCell>
                    <TableCell>College Transfer</TableCell>
                    <TableCell>Nov 13, 2024</TableCell>
                    <TableCell><Badge variant="outline">Completed</Badge></TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" disabled>
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
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

                    <Button className="w-full">
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

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transcript ID</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Generated Date</TableHead>
                    <TableHead>QR Status</TableHead>
                    <TableHead>Downloads</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">TRN-2024-089</TableCell>
                    <TableCell>Amit Kumar Singh</TableCell>
                    <TableCell>Official Transcript</TableCell>
                    <TableCell>Nov 15, 2024</TableCell>
                    <TableCell><Badge>Active</Badge></TableCell>
                    <TableCell>3</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <QrCode className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">TRN-2024-088</TableCell>
                    <TableCell>Priya Sharma</TableCell>
                    <TableCell>Degree Certificate</TableCell>
                    <TableCell>Nov 14, 2024</TableCell>
                    <TableCell><Badge>Active</Badge></TableCell>
                    <TableCell>1</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <QrCode className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
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
              <div className="grid gap-4 md:grid-cols-2 mb-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Create Bulk Print Job</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Job Type</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select print job type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="degree-batch">Degree Certificates (Batch)</SelectItem>
                          <SelectItem value="diploma-batch">Diploma Certificates (Batch)</SelectItem>
                          <SelectItem value="character-bulk">Character Certificates (Bulk)</SelectItem>
                          <SelectItem value="bonafide-bulk">Bonafide Certificates (Bulk)</SelectItem>
                          <SelectItem value="transcripts-bulk">Transcripts (Bulk)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Batch/Department</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select batch or department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cs-2024">Computer Science 2024</SelectItem>
                          <SelectItem value="ec-2024">Electronics 2024</SelectItem>
                          <SelectItem value="me-2024">Mechanical 2024</SelectItem>
                          <SelectItem value="custom">Custom Selection</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Print Quality</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select quality" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High Quality (600 DPI)</SelectItem>
                          <SelectItem value="standard">Standard (300 DPI)</SelectItem>
                          <SelectItem value="draft">Draft (150 DPI)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Paper Type</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select paper" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="certificate-paper">Certificate Paper</SelectItem>
                          <SelectItem value="bond-paper">Bond Paper</SelectItem>
                          <SelectItem value="letterhead">College Letterhead</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button className="w-full">
                      <Printer className="w-4 h-4 mr-2" />
                      Create Print Job
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Print Job Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Active Jobs</span>
                        <Badge>7</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Completed Today</span>
                        <Badge variant="outline">23</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Total This Month</span>
                        <Badge variant="outline">456</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Paper Used</span>
                        <Badge variant="outline">1,234 sheets</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Printer Status</span>
                        <Badge>Online</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Batch/Department</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">PRT-2024-015</TableCell>
                    <TableCell>Degree Certificates</TableCell>
                    <TableCell>Computer Science 2024</TableCell>
                    <TableCell>67</TableCell>
                    <TableCell><Badge variant="secondary">Printing</Badge></TableCell>
                    <TableCell>45/67 (67%)</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        <Clock className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">PRT-2024-014</TableCell>
                    <TableCell>Character Certificates</TableCell>
                    <TableCell>Electronics 2024</TableCell>
                    <TableCell>45</TableCell>
                    <TableCell><Badge>Completed</Badge></TableCell>
                    <TableCell>45/45 (100%)</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">PRT-2024-013</TableCell>
                    <TableCell>Bonafide Certificates</TableCell>
                    <TableCell>Mechanical 2024</TableCell>
                    <TableCell>38</TableCell>
                    <TableCell><Badge variant="outline">Queued</Badge></TableCell>
                    <TableCell>0/38 (0%)</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        <Printer className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </main>
    </div>
  );
}