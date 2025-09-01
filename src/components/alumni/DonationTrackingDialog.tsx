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
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { 
  DollarSign,
  Calendar as CalendarIcon,
  User,
  FileText,
  Receipt,
  Target,
  TrendingUp,
  Gift,
  Heart,
  Building,
  Save,
  Send,
  Download,
  Plus,
  Edit,
  CreditCard
} from 'lucide-react';

interface DonationTrackingDialogProps {
  children: React.ReactNode;
  isEdit?: boolean;
  donationId?: string;
  mode?: 'new' | 'track' | 'campaign';
}

export const DonationTrackingDialog = ({ 
  children, 
  isEdit = false,
  donationId,
  mode = 'new'
}: DonationTrackingDialogProps) => {
  const [open, setOpen] = useState(false);
  const [donationDate, setDonationDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState(mode === 'campaign' ? 'campaign' : 'donation');

  const [donationData, setDonationData] = useState({
    // Donor Information
    donorId: '',
    donorName: '',
    donorType: 'alumni', // alumni, corporate, individual, organization
    batch: '',
    department: '',
    email: '',
    phone: '',
    address: '',
    
    // Donation Details
    amount: '',
    currency: 'INR',
    donationType: 'monetary', // monetary, in-kind, pledge
    purpose: '', // scholarship, infrastructure, research, general
    specificFund: '',
    isRecurring: false,
    frequency: '', // monthly, quarterly, annually
    
    // Payment Information
    paymentMethod: '', // cash, cheque, online, bank_transfer
    transactionId: '',
    chequeNumber: '',
    bankDetails: '',
    paymentStatus: 'received', // received, pending, failed
    
    // Tax & Receipt
    taxExemptionClaimed: false,
    receiptRequired: true,
    receiptNumber: '',
    panNumber: '',
    
    // Recognition
    isAnonymous: false,
    publicRecognition: true,
    donorWall: true,
    newsletterMention: true,
    
    // Allocation
    fundAllocation: [] as any[],
    utilizationPlan: '',
    
    // Follow-up
    acknowledgmentSent: false,
    thankYouNote: '',
    followUpRequired: false,
    nextContactDate: '',
    
    // Campaign Association
    campaignId: '',
    campaignName: '',
    
    // Additional Information
    notes: '',
    attachments: [] as string[],
    processedBy: 'Alumni Relations Office'
  });

  const [campaignData, setCampaignData] = useState({
    name: '',
    description: '',
    targetAmount: '',
    currentAmount: '0',
    startDate: '',
    endDate: '',
    category: '', // scholarship, infrastructure, research, emergency
    status: 'active', // active, completed, paused
    beneficiaries: '',
    milestones: [] as any[],
    updates: [] as any[],
    donors: [] as any[]
  });

  const donorTypes = [
    { value: 'alumni', label: 'Alumni' },
    { value: 'corporate', label: 'Corporate Partner' },
    { value: 'individual', label: 'Individual Donor' },
    { value: 'organization', label: 'Organization' },
    { value: 'foundation', label: 'Foundation/Trust' }
  ];

  const donationPurposes = [
    { value: 'scholarship', label: 'Student Scholarships' },
    { value: 'infrastructure', label: 'Infrastructure Development' },
    { value: 'research', label: 'Research & Development' },
    { value: 'library', label: 'Library Enhancement' },
    { value: 'sports', label: 'Sports Facilities' },
    { value: 'technology', label: 'Technology Upgrades' },
    { value: 'emergency', label: 'Emergency Fund' },
    { value: 'general', label: 'General Fund' }
  ];

  const paymentMethods = [
    { value: 'online', label: 'Online Payment' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'cash', label: 'Cash' },
    { value: 'upi', label: 'UPI' },
    { value: 'card', label: 'Credit/Debit Card' }
  ];

  const addFundAllocation = () => {
    const newAllocation = {
      purpose: '',
      amount: '',
      percentage: '',
      description: ''
    };
    setDonationData({
      ...donationData,
      fundAllocation: [...donationData.fundAllocation, newAllocation]
    });
  };

  const updateFundAllocation = (index: number, field: string, value: string) => {
    const updatedAllocations = [...donationData.fundAllocation];
    updatedAllocations[index] = {
      ...updatedAllocations[index],
      [field]: value
    };
    setDonationData({
      ...donationData,
      fundAllocation: updatedAllocations
    });
  };

  const addCampaignMilestone = () => {
    const newMilestone = {
      amount: '',
      description: '',
      achieved: false,
      date: ''
    };
    setCampaignData({
      ...campaignData,
      milestones: [...campaignData.milestones, newMilestone]
    });
  };

  const handleSave = () => {
    if (activeTab === 'campaign') {
      // console.log('Saving campaign:', campaignData);
    } else {
      // console.log('Saving donation:', donationData);
    }
    setOpen(false);
  };

  const generateReceipt = () => {
    // console.log('Generating receipt for donation:', donationData);
  };

  const sendAcknowledgment = () => {
    // console.log('Sending acknowledgment to donor:', donationData.donorName);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {mode === 'campaign' ? 'Donation Campaign Management' : 
             isEdit ? `Edit Donation - ${donationId}` : 'New Donation Record'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="donation">Donation</TabsTrigger>
            <TabsTrigger value="payment">Payment</TabsTrigger>
            <TabsTrigger value="recognition">Recognition</TabsTrigger>
            <TabsTrigger value="campaign">Campaigns</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="donation" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Donor Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="donorType">Donor Type</Label>
                    <Select value={donationData.donorType} onValueChange={(value) => setDonationData({...donationData, donorType: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select donor type" />
                      </SelectTrigger>
                      <SelectContent>
                        {donorTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="donorId">Donor ID</Label>
                      <Input
                        id="donorId"
                        value={donationData.donorId}
                        onChange={(e) => setDonationData({...donationData, donorId: e.target.value})}
                        placeholder="Alumni ID or donor code"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="donorName">Full Name</Label>
                      <Input
                        id="donorName"
                        value={donationData.donorName}
                        onChange={(e) => setDonationData({...donationData, donorName: e.target.value})}
                        placeholder="Donor's full name"
                      />
                    </div>
                  </div>

                  {donationData.donorType === 'alumni' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="batch">Batch Year</Label>
                        <Input
                          id="batch"
                          value={donationData.batch}
                          onChange={(e) => setDonationData({...donationData, batch: e.target.value})}
                          placeholder="Graduation year"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Input
                          id="department"
                          value={donationData.department}
                          onChange={(e) => setDonationData({...donationData, department: e.target.value})}
                          placeholder="Department/Branch"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={donationData.email}
                        onChange={(e) => setDonationData({...donationData, email: e.target.value})}
                        placeholder="Contact email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={donationData.phone}
                        onChange={(e) => setDonationData({...donationData, phone: e.target.value})}
                        placeholder="Contact number"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={donationData.address}
                      onChange={(e) => setDonationData({...donationData, address: e.target.value})}
                      placeholder="Complete address"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    Donation Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Donation Amount</Label>
                      <div className="flex gap-2">
                        <Select value={donationData.currency} onValueChange={(value) => setDonationData({...donationData, currency: value})}>
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INR">₹</SelectItem>
                            <SelectItem value="USD">$</SelectItem>
                            <SelectItem value="EUR">€</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          id="amount"
                          type="number"
                          value={donationData.amount}
                          onChange={(e) => setDonationData({...donationData, amount: e.target.value})}
                          placeholder="0.00"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Donation Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !donationDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {donationDate ? format(donationDate, "PPP") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={donationDate}
                            onSelect={setDonationDate}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="purpose">Donation Purpose</Label>
                    <Select value={donationData.purpose} onValueChange={(value) => setDonationData({...donationData, purpose: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select purpose" />
                      </SelectTrigger>
                      <SelectContent>
                        {donationPurposes.map((purpose) => (
                          <SelectItem key={purpose.value} value={purpose.value}>
                            {purpose.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specificFund">Specific Fund/Project</Label>
                    <Input
                      id="specificFund"
                      value={donationData.specificFund}
                      onChange={(e) => setDonationData({...donationData, specificFund: e.target.value})}
                      placeholder="e.g., Computer Lab Enhancement"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="isRecurring">Recurring Donation</Label>
                      <Switch
                        id="isRecurring"
                        checked={donationData.isRecurring}
                        onCheckedChange={(checked) => setDonationData({...donationData, isRecurring: checked})}
                      />
                    </div>

                    {donationData.isRecurring && (
                      <div className="space-y-2">
                        <Label htmlFor="frequency">Frequency</Label>
                        <Select value={donationData.frequency} onValueChange={(value) => setDonationData({...donationData, frequency: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="annually">Annually</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      value={donationData.notes}
                      onChange={(e) => setDonationData({...donationData, notes: e.target.value})}
                      placeholder="Any special instructions or notes"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Fund Allocation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Fund Allocation
                  </div>
                  <Button onClick={addFundAllocation} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Allocation
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {donationData.fundAllocation.length > 0 ? (
                  <div className="space-y-4">
                    {donationData.fundAllocation.map((allocation, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                        <div className="space-y-2">
                          <Label>Purpose</Label>
                          <Select 
                            value={allocation.purpose} 
                            onValueChange={(value) => updateFundAllocation(index, 'purpose', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select purpose" />
                            </SelectTrigger>
                            <SelectContent>
                              {donationPurposes.map((purpose) => (
                                <SelectItem key={purpose.value} value={purpose.value}>
                                  {purpose.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Amount (₹)</Label>
                          <Input
                            type="number"
                            value={allocation.amount}
                            onChange={(e) => updateFundAllocation(index, 'amount', e.target.value)}
                            placeholder="Amount"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Percentage (%)</Label>
                          <Input
                            type="number"
                            value={allocation.percentage}
                            onChange={(e) => updateFundAllocation(index, 'percentage', e.target.value)}
                            placeholder="Percentage"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Input
                            value={allocation.description}
                            onChange={(e) => updateFundAllocation(index, 'description', e.target.value)}
                            placeholder="Brief description"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No fund allocations specified. Click "Add Allocation" to distribute funds to specific purposes.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select value={donationData.paymentMethod} onValueChange={(value) => setDonationData({...donationData, paymentMethod: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentStatus">Payment Status</Label>
                    <Select value={donationData.paymentStatus} onValueChange={(value) => setDonationData({...donationData, paymentStatus: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="received">Received</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="transactionId">Transaction ID</Label>
                    <Input
                      id="transactionId"
                      value={donationData.transactionId}
                      onChange={(e) => setDonationData({...donationData, transactionId: e.target.value})}
                      placeholder="Transaction reference number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chequeNumber">Cheque Number (if applicable)</Label>
                    <Input
                      id="chequeNumber"
                      value={donationData.chequeNumber}
                      onChange={(e) => setDonationData({...donationData, chequeNumber: e.target.value})}
                      placeholder="Cheque number"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankDetails">Bank Details</Label>
                  <Textarea
                    id="bankDetails"
                    value={donationData.bankDetails}
                    onChange={(e) => setDonationData({...donationData, bankDetails: e.target.value})}
                    placeholder="Bank name, account details, etc."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Tax & Receipt Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="receiptRequired">Receipt Required</Label>
                  <Switch
                    id="receiptRequired"
                    checked={donationData.receiptRequired}
                    onCheckedChange={(checked) => setDonationData({...donationData, receiptRequired: checked})}
                  />
                </div>

                {donationData.receiptRequired && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="receiptNumber">Receipt Number</Label>
                      <Input
                        id="receiptNumber"
                        value={donationData.receiptNumber}
                        onChange={(e) => setDonationData({...donationData, receiptNumber: e.target.value})}
                        placeholder="Auto-generated or manual"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="panNumber">PAN Number</Label>
                      <Input
                        id="panNumber"
                        value={donationData.panNumber}
                        onChange={(e) => setDonationData({...donationData, panNumber: e.target.value})}
                        placeholder="Donor's PAN number"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label htmlFor="taxExemptionClaimed">Tax Exemption Claimed (80G)</Label>
                  <Switch
                    id="taxExemptionClaimed"
                    checked={donationData.taxExemptionClaimed}
                    onCheckedChange={(checked) => setDonationData({...donationData, taxExemptionClaimed: checked})}
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={generateReceipt}>
                    <Receipt className="h-4 w-4 mr-2" />
                    Generate Receipt
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download Tax Certificate
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recognition" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Donor Recognition & Privacy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isAnonymous">Anonymous Donation</Label>
                    <Switch
                      id="isAnonymous"
                      checked={donationData.isAnonymous}
                      onCheckedChange={(checked) => setDonationData({...donationData, isAnonymous: checked})}
                    />
                  </div>

                  {!donationData.isAnonymous && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="publicRecognition">Public Recognition</Label>
                        <Switch
                          id="publicRecognition"
                          checked={donationData.publicRecognition}
                          onCheckedChange={(checked) => setDonationData({...donationData, publicRecognition: checked})}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="donorWall">Include on Donor Wall</Label>
                        <Switch
                          id="donorWall"
                          checked={donationData.donorWall}
                          onCheckedChange={(checked) => setDonationData({...donationData, donorWall: checked})}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="newsletterMention">Newsletter Mention</Label>
                        <Switch
                          id="newsletterMention"
                          checked={donationData.newsletterMention}
                          onCheckedChange={(checked) => setDonationData({...donationData, newsletterMention: checked})}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="acknowledgmentSent">Acknowledgment Sent</Label>
                    <Switch
                      id="acknowledgmentSent"
                      checked={donationData.acknowledgmentSent}
                      onCheckedChange={(checked) => setDonationData({...donationData, acknowledgmentSent: checked})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="thankYouNote">Thank You Note</Label>
                    <Textarea
                      id="thankYouNote"
                      value={donationData.thankYouNote}
                      onChange={(e) => setDonationData({...donationData, thankYouNote: e.target.value})}
                      placeholder="Personalized thank you message"
                      rows={4}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={sendAcknowledgment}>
                      <Send className="h-4 w-4 mr-2" />
                      Send Acknowledgment
                    </Button>
                    <Button variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Thank You Letter
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="followUpRequired">Follow-up Required</Label>
                    <Switch
                      id="followUpRequired"
                      checked={donationData.followUpRequired}
                      onCheckedChange={(checked) => setDonationData({...donationData, followUpRequired: checked})}
                    />
                  </div>

                  {donationData.followUpRequired && (
                    <div className="space-y-2">
                      <Label htmlFor="nextContactDate">Next Contact Date</Label>
                      <Input
                        id="nextContactDate"
                        type="date"
                        value={donationData.nextContactDate}
                        onChange={(e) => setDonationData({...donationData, nextContactDate: e.target.value})}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campaign" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Donation Campaign Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="campaignName">Campaign Name</Label>
                    <Input
                      id="campaignName"
                      value={campaignData.name}
                      onChange={(e) => setCampaignData({...campaignData, name: e.target.value})}
                      placeholder="Campaign title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={campaignData.category} onValueChange={(value) => setCampaignData({...campaignData, category: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {donationPurposes.map((purpose) => (
                          <SelectItem key={purpose.value} value={purpose.value}>
                            {purpose.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campaignDescription">Campaign Description</Label>
                  <Textarea
                    id="campaignDescription"
                    value={campaignData.description}
                    onChange={(e) => setCampaignData({...campaignData, description: e.target.value})}
                    placeholder="Detailed description of the campaign"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="targetAmount">Target Amount (₹)</Label>
                    <Input
                      id="targetAmount"
                      type="number"
                      value={campaignData.targetAmount}
                      onChange={(e) => setCampaignData({...campaignData, targetAmount: e.target.value})}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentAmount">Current Amount (₹)</Label>
                    <Input
                      id="currentAmount"
                      type="number"
                      value={campaignData.currentAmount}
                      onChange={(e) => setCampaignData({...campaignData, currentAmount: e.target.value})}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Progress</Label>
                    <div className="space-y-2">
                      <Progress 
                        value={
                          campaignData.targetAmount && campaignData.currentAmount
                            ? (parseInt(campaignData.currentAmount) / parseInt(campaignData.targetAmount)) * 100
                            : 0
                        } 
                        className="h-3"
                      />
                      <p className="text-sm text-muted-foreground">
                        {campaignData.targetAmount && campaignData.currentAmount
                          ? `₹${campaignData.currentAmount} of ₹${campaignData.targetAmount} (${Math.round((parseInt(campaignData.currentAmount) / parseInt(campaignData.targetAmount)) * 100)}%)`
                          : 'No target set'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={campaignData.startDate}
                      onChange={(e) => setCampaignData({...campaignData, startDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={campaignData.endDate}
                      onChange={(e) => setCampaignData({...campaignData, endDate: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="beneficiaries">Beneficiaries</Label>
                  <Textarea
                    id="beneficiaries"
                    value={campaignData.beneficiaries}
                    onChange={(e) => setCampaignData({...campaignData, beneficiaries: e.target.value})}
                    placeholder="Who will benefit from this campaign?"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Campaign Milestones */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Campaign Milestones
                  </div>
                  <Button onClick={addCampaignMilestone} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Milestone
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {campaignData.milestones.length > 0 ? (
                  <div className="space-y-4">
                    {campaignData.milestones.map((milestone, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                        <div className="space-y-2">
                          <Label>Amount (₹)</Label>
                          <Input
                            type="number"
                            value={milestone.amount}
                            onChange={(e) => {
                              const updated = [...campaignData.milestones];
                              updated[index] = {...updated[index], amount: e.target.value};
                              setCampaignData({...campaignData, milestones: updated});
                            }}
                            placeholder="Target amount"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Input
                            value={milestone.description}
                            onChange={(e) => {
                              const updated = [...campaignData.milestones];
                              updated[index] = {...updated[index], description: e.target.value};
                              setCampaignData({...campaignData, milestones: updated});
                            }}
                            placeholder="Milestone description"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Target Date</Label>
                          <Input
                            type="date"
                            value={milestone.date}
                            onChange={(e) => {
                              const updated = [...campaignData.milestones];
                              updated[index] = {...updated[index], date: e.target.value};
                              setCampaignData({...campaignData, milestones: updated});
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={milestone.achieved}
                              onCheckedChange={(checked) => {
                                const updated = [...campaignData.milestones];
                                updated[index] = {...updated[index], achieved: checked};
                                setCampaignData({...campaignData, milestones: updated});
                              }}
                            />
                            <span className="text-sm">
                              {milestone.achieved ? 'Achieved' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No milestones set. Click "Add Milestone" to track campaign progress.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Donation Reports & Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">This Month</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹2,45,000</div>
                      <p className="text-xs text-muted-foreground">23 donations</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">This Year</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹12,50,000</div>
                      <p className="text-xs text-muted-foreground">184 donations</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Average Donation</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹6,793</div>
                      <p className="text-xs text-muted-foreground">Per donation</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Donation Report
                  </Button>
                  <Button variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Tax Summary Report
                  </Button>
                  <Button variant="outline">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Campaign Analytics
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Donations</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Donors</TableHead>
                      <TableHead>Average</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>November 2024</TableCell>
                      <TableCell>23</TableCell>
                      <TableCell>₹2,45,000</TableCell>
                      <TableCell>20</TableCell>
                      <TableCell>₹10,652</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>October 2024</TableCell>
                      <TableCell>31</TableCell>
                      <TableCell>₹3,12,000</TableCell>
                      <TableCell>28</TableCell>
                      <TableCell>₹10,065</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>September 2024</TableCell>
                      <TableCell>18</TableCell>
                      <TableCell>₹1,89,000</TableCell>
                      <TableCell>16</TableCell>
                      <TableCell>₹10,500</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="flex justify-between">
          <div className="flex gap-2">
            {donationData.donorType && (
              <Badge variant="outline">
                {donorTypes.find(t => t.value === donationData.donorType)?.label}
              </Badge>
            )}
            {donationData.isRecurring && <Badge variant="outline">Recurring</Badge>}
            {donationData.isAnonymous && <Badge variant="outline">Anonymous</Badge>}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Record
            </Button>
            <Button onClick={handleSave}>
              <Send className="h-4 w-4 mr-2" />
              Save & Process
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};