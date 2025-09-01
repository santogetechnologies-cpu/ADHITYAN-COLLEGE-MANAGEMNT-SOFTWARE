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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { 
  Users,
  GraduationCap,
  Briefcase,
  Star,
  Heart,
  MessageCircle,
  Calendar,
  Target,
  TrendingUp,
  Award,
  Search,
  Filter,
  Save,
  Send,
  UserCheck,
  Plus,
  Edit,
  Eye
} from 'lucide-react';

interface MentorshipMatchingDialogProps {
  children: React.ReactNode;
  mode?: 'mentor' | 'mentee' | 'match' | 'program';
  profileId?: string;
}

export const MentorshipMatchingDialog = ({ 
  children, 
  mode = 'match',
  profileId 
}: MentorshipMatchingDialogProps) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'mentor' | 'mentee' | 'match' | 'program'>(mode);
  const [selectedMentor, setSelectedMentor] = useState<string | null>(null);
  const [selectedMentee, setSelectedMentee] = useState<string | null>(null);

  const [mentorProfile, setMentorProfile] = useState({
    id: '',
    name: '',
    batch: '',
    department: '',
    currentPosition: '',
    company: '',
    experience: '',
    location: '',
    email: '',
    phone: '',
    linkedin: '',
    
    // Mentoring Preferences
    mentorshipAreas: [] as string[],
    industries: [] as string[],
    availableHours: '',
    preferredCommunication: [] as string[],
    maxMentees: '3',
    
    // Background
    expertise: [] as string[],
    achievements: '',
    careerPath: '',
    mentoringSince: '',
    previousMentees: '0',
    
    // Availability
    isActive: true,
    timeZone: 'IST',
    preferredSchedule: [] as string[],
    
    // Matching Criteria
    preferredMenteeLevel: [] as string[],
    preferredDepartments: [] as string[],
    matchingPreferences: '',
    
    // Profile
    bio: '',
    motivation: '',
    successStories: '',
    profilePicture: ''
  });

  const [menteeProfile, setMenteeProfile] = useState({
    id: '',
    name: '',
    currentYear: '',
    department: '',
    cgpa: '',
    email: '',
    phone: '',
    
    // Goals & Interests
    careerGoals: '',
    interestedIndustries: [] as string[],
    skillsToLearn: [] as string[],
    currentChallenges: '',
    
    // Background
    currentSkills: [] as string[],
    projects: [] as string[],
    internshipExperience: '',
    extracurricularActivities: '',
    
    // Mentorship Preferences
    mentorshipAreas: [] as string[],
    preferredCommunication: [] as string[],
    expectedCommitment: '',
    
    // Matching
    preferredMentorExperience: '',
    preferredIndustries: [] as string[],
    specificRequests: '',
    
    // Profile
    bio: '',
    motivation: '',
    profilePicture: ''
  });

  const [matchingData, setMatchingData] = useState({
    mentorId: '',
    menteeId: '',
    matchScore: 0,
    matchingFactors: [] as string[],
    status: 'pending', // pending, active, completed, paused
    startDate: '',
    expectedDuration: '6', // months
    goals: [] as any[],
    meetingSchedule: '',
    communicationPlan: '',
    progressTracking: [] as any[],
    
    // Program Details
    programType: 'career', // career, academic, industry-specific
    sessionFrequency: 'bi-weekly',
    sessionDuration: '60', // minutes
    totalSessions: '',
    completedSessions: '0',
    
    // Notes
    coordinatorNotes: '',
    mentorFeedback: '',
    menteeFeedback: '',
    matchingReason: ''
  });

  const mentorshipAreas = [
    'Career Guidance', 'Technical Skills', 'Industry Insights', 'Leadership Development',
    'Entrepreneurship', 'Academic Guidance', 'Interview Preparation', 'Resume Building',
    'Networking', 'Work-Life Balance', 'Personal Development', 'Research & Publications'
  ];

  const industries = [
    'Technology', 'Finance', 'Healthcare', 'Education', 'Manufacturing', 'Consulting',
    'Marketing', 'Government', 'Non-profit', 'Startups', 'Research', 'Media'
  ];

  const communicationMethods = [
    'Video Calls', 'Phone Calls', 'Email', 'Chat/Messaging', 'In-Person Meetings',
    'Group Sessions', 'Workshops', 'Project Collaboration'
  ];

  const departments = [
    'Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Electrical',
    'Chemical', 'Aerospace', 'Biotechnology', 'Information Technology'
  ];

  const menteeYears = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Final Year'];
  const experienceLevels = ['Entry Level', 'Mid-Level', 'Senior Level', 'Executive Level'];

  // Mock data for demonstration
  const availableMentors = [
    {
      id: 'M001',
      name: 'Rajesh Kumar',
      batch: '2015',
      department: 'Computer Science',
      position: 'Senior Software Engineer',
      company: 'Google',
      experience: '8 years',
      location: 'Bangalore',
      expertise: ['Full Stack Development', 'System Design', 'Career Growth'],
      matchScore: 95,
      rating: 4.8,
      mentees: 5,
      avatar: ''
    },
    {
      id: 'M002',
      name: 'Priya Sharma',
      batch: '2012',
      department: 'Electronics',
      position: 'Product Manager',
      company: 'Microsoft',
      experience: '11 years',
      location: 'Hyderabad',
      expertise: ['Product Management', 'Leadership', 'Tech Strategy'],
      matchScore: 88,
      rating: 4.9,
      mentees: 8,
      avatar: ''
    }
  ];

  const availableMentees = [
    {
      id: 'S001',
      name: 'Arjun Singh',
      year: '3rd Year',
      department: 'Computer Science',
      cgpa: '8.5',
      interests: ['Software Development', 'Machine Learning'],
      goals: 'Software Engineer at top tech company',
      avatar: ''
    },
    {
      id: 'S002',
      name: 'Sneha Reddy',
      year: '4th Year',
      department: 'Electronics',
      cgpa: '9.1',
      interests: ['Product Management', 'IoT'],
      goals: 'Product Manager in tech industry',
      avatar: ''
    }
  ];

  const handleCreateMatch = () => {
    if (selectedMentor && selectedMentee) {
      const mentor = availableMentors.find(m => m.id === selectedMentor);
      const mentee = availableMentees.find(m => m.id === selectedMentee);
      
      setMatchingData({
        ...matchingData,
        mentorId: selectedMentor,
        menteeId: selectedMentee,
        matchScore: mentor?.matchScore || 0,
        status: 'pending'
      });
    }
  };

  const handleSave = () => {
    console.log('Saving mentorship data:', { mentorProfile, menteeProfile, matchingData });
    setOpen(false);
  };

  const addGoal = () => {
    const newGoal = {
      description: '',
      targetDate: '',
      status: 'not-started',
      priority: 'medium'
    };
    setMatchingData({
      ...matchingData,
      goals: [...matchingData.goals, newGoal]
    });
  };

  const updateGoal = (index: number, field: string, value: string) => {
    const updatedGoals = [...matchingData.goals];
    updatedGoals[index] = {
      ...updatedGoals[index],
      [field]: value
    };
    setMatchingData({
      ...matchingData,
      goals: updatedGoals
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Mentorship Program Management
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'mentor' | 'mentee' | 'match' | 'program')} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="mentor">Mentor Profile</TabsTrigger>
            <TabsTrigger value="mentee">Mentee Profile</TabsTrigger>
            <TabsTrigger value="match">Smart Matching</TabsTrigger>
            <TabsTrigger value="program">Program Management</TabsTrigger>
          </TabsList>

          <TabsContent value="mentor" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Mentor Profile Setup
                </CardTitle>
                <CardDescription>
                  Create or update mentor profile for the mentorship program
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mentorName">Full Name</Label>
                    <Input
                      id="mentorName"
                      value={mentorProfile.name}
                      onChange={(e) => setMentorProfile({...mentorProfile, name: e.target.value})}
                      placeholder="Mentor's full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mentorBatch">Batch Year</Label>
                    <Input
                      id="mentorBatch"
                      value={mentorProfile.batch}
                      onChange={(e) => setMentorProfile({...mentorProfile, batch: e.target.value})}
                      placeholder="Graduation year"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mentorDepartment">Department</Label>
                    <Select value={mentorProfile.department} onValueChange={(value) => setMentorProfile({...mentorProfile, department: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mentorExperience">Years of Experience</Label>
                    <Input
                      id="mentorExperience"
                      value={mentorProfile.experience}
                      onChange={(e) => setMentorProfile({...mentorProfile, experience: e.target.value})}
                      placeholder="e.g., 8 years"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mentorPosition">Current Position</Label>
                    <Input
                      id="mentorPosition"
                      value={mentorProfile.currentPosition}
                      onChange={(e) => setMentorProfile({...mentorProfile, currentPosition: e.target.value})}
                      placeholder="Job title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mentorCompany">Company</Label>
                    <Input
                      id="mentorCompany"
                      value={mentorProfile.company}
                      onChange={(e) => setMentorProfile({...mentorProfile, company: e.target.value})}
                      placeholder="Company name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mentorBio">Professional Bio</Label>
                  <Textarea
                    id="mentorBio"
                    value={mentorProfile.bio}
                    onChange={(e) => setMentorProfile({...mentorProfile, bio: e.target.value})}
                    placeholder="Brief professional background and achievements"
                    rows={4}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Areas of Mentorship</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {mentorshipAreas.map((area) => (
                      <div key={area} className="flex items-center space-x-2">
                        <Checkbox
                          id={`mentor-area-${area}`}
                          checked={mentorProfile.mentorshipAreas.includes(area)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setMentorProfile({
                                ...mentorProfile,
                                mentorshipAreas: [...mentorProfile.mentorshipAreas, area]
                              });
                            } else {
                              setMentorProfile({
                                ...mentorProfile,
                                mentorshipAreas: mentorProfile.mentorshipAreas.filter(a => a !== area)
                              });
                            }
                          }}
                        />
                        <Label htmlFor={`mentor-area-${area}`} className="text-sm">{area}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Industry Experience</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {industries.map((industry) => (
                      <div key={industry} className="flex items-center space-x-2">
                        <Checkbox
                          id={`mentor-industry-${industry}`}
                          checked={mentorProfile.industries.includes(industry)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setMentorProfile({
                                ...mentorProfile,
                                industries: [...mentorProfile.industries, industry]
                              });
                            } else {
                              setMentorProfile({
                                ...mentorProfile,
                                industries: mentorProfile.industries.filter(i => i !== industry)
                              });
                            }
                          }}
                        />
                        <Label htmlFor={`mentor-industry-${industry}`} className="text-sm">{industry}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxMentees">Maximum Mentees</Label>
                    <Select value={mentorProfile.maxMentees} onValueChange={(value) => setMentorProfile({...mentorProfile, maxMentees: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select number" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Mentee</SelectItem>
                        <SelectItem value="2">2 Mentees</SelectItem>
                        <SelectItem value="3">3 Mentees</SelectItem>
                        <SelectItem value="4">4 Mentees</SelectItem>
                        <SelectItem value="5">5+ Mentees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="availableHours">Available Hours per Week</Label>
                    <Input
                      id="availableHours"
                      value={mentorProfile.availableHours}
                      onChange={(e) => setMentorProfile({...mentorProfile, availableHours: e.target.value})}
                      placeholder="e.g., 3-5 hours"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mentorMotivation">Mentoring Motivation</Label>
                  <Textarea
                    id="mentorMotivation"
                    value={mentorProfile.motivation}
                    onChange={(e) => setMentorProfile({...mentorProfile, motivation: e.target.value})}
                    placeholder="Why do you want to mentor students?"
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="mentorActive">Active Mentor</Label>
                  <Switch
                    id="mentorActive"
                    checked={mentorProfile.isActive}
                    onCheckedChange={(checked) => setMentorProfile({...mentorProfile, isActive: checked})}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mentee" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Mentee Profile Setup
                </CardTitle>
                <CardDescription>
                  Create or update student profile for mentorship program
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="menteeName">Full Name</Label>
                    <Input
                      id="menteeName"
                      value={menteeProfile.name}
                      onChange={(e) => setMenteeProfile({...menteeProfile, name: e.target.value})}
                      placeholder="Student's full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="menteeYear">Current Year</Label>
                    <Select value={menteeProfile.currentYear} onValueChange={(value) => setMenteeProfile({...menteeProfile, currentYear: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {menteeYears.map((year) => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="menteeDepartment">Department</Label>
                    <Select value={menteeProfile.department} onValueChange={(value) => setMenteeProfile({...menteeProfile, department: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="menteeCGPA">CGPA</Label>
                    <Input
                      id="menteeCGPA"
                      value={menteeProfile.cgpa}
                      onChange={(e) => setMenteeProfile({...menteeProfile, cgpa: e.target.value})}
                      placeholder="Current CGPA"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="careerGoals">Career Goals</Label>
                  <Textarea
                    id="careerGoals"
                    value={menteeProfile.careerGoals}
                    onChange={(e) => setMenteeProfile({...menteeProfile, careerGoals: e.target.value})}
                    placeholder="What are your career aspirations?"
                    rows={4}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Interested Industries</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {industries.map((industry) => (
                      <div key={industry} className="flex items-center space-x-2">
                        <Checkbox
                          id={`mentee-industry-${industry}`}
                          checked={menteeProfile.interestedIndustries.includes(industry)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setMenteeProfile({
                                ...menteeProfile,
                                interestedIndustries: [...menteeProfile.interestedIndustries, industry]
                              });
                            } else {
                              setMenteeProfile({
                                ...menteeProfile,
                                interestedIndustries: menteeProfile.interestedIndustries.filter(i => i !== industry)
                              });
                            }
                          }}
                        />
                        <Label htmlFor={`mentee-industry-${industry}`} className="text-sm">{industry}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Skills to Learn/Improve</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {mentorshipAreas.map((area) => (
                      <div key={area} className="flex items-center space-x-2">
                        <Checkbox
                          id={`mentee-skill-${area}`}
                          checked={menteeProfile.skillsToLearn.includes(area)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setMenteeProfile({
                                ...menteeProfile,
                                skillsToLearn: [...menteeProfile.skillsToLearn, area]
                              });
                            } else {
                              setMenteeProfile({
                                ...menteeProfile,
                                skillsToLearn: menteeProfile.skillsToLearn.filter(s => s !== area)
                              });
                            }
                          }}
                        />
                        <Label htmlFor={`mentee-skill-${area}`} className="text-sm">{area}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currentChallenges">Current Challenges</Label>
                  <Textarea
                    id="currentChallenges"
                    value={menteeProfile.currentChallenges}
                    onChange={(e) => setMenteeProfile({...menteeProfile, currentChallenges: e.target.value})}
                    placeholder="What challenges are you facing in your academic/career journey?"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="internshipExperience">Internship Experience</Label>
                  <Textarea
                    id="internshipExperience"
                    value={menteeProfile.internshipExperience}
                    onChange={(e) => setMenteeProfile({...menteeProfile, internshipExperience: e.target.value})}
                    placeholder="Previous internship or work experience"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="menteeMotivation">Why do you want a mentor?</Label>
                  <Textarea
                    id="menteeMotivation"
                    value={menteeProfile.motivation}
                    onChange={(e) => setMenteeProfile({...menteeProfile, motivation: e.target.value})}
                    placeholder="What do you hope to gain from this mentorship?"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="match" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Smart Mentor-Mentee Matching
                </CardTitle>
                <CardDescription>
                  AI-powered matching based on profiles, goals, and compatibility
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Available Mentors */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Available Mentors</h3>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Filter className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {availableMentors.map((mentor) => (
                        <Card 
                          key={mentor.id} 
                          className={cn(
                            "cursor-pointer transition-colors",
                            selectedMentor === mentor.id ? "ring-2 ring-primary" : ""
                          )}
                          onClick={() => setSelectedMentor(mentor.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Avatar>
                                <AvatarImage src={mentor.avatar} />
                                <AvatarFallback>{mentor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-semibold">{mentor.name}</h4>
                                  <Badge variant="secondary">{mentor.matchScore}% match</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {mentor.position} at {mentor.company}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                  <span>{mentor.batch} • {mentor.department}</span>
                                  <span>{mentor.experience}</span>
                                  <div className="flex items-center gap-1">
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    <span>{mentor.rating}</span>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {mentor.expertise.slice(0, 3).map((skill) => (
                                    <Badge key={skill} variant="outline" className="text-xs">
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Available Mentees */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Students Seeking Mentors</h3>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Filter className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {availableMentees.map((mentee) => (
                        <Card 
                          key={mentee.id}
                          className={cn(
                            "cursor-pointer transition-colors",
                            selectedMentee === mentee.id ? "ring-2 ring-primary" : ""
                          )}
                          onClick={() => setSelectedMentee(mentee.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Avatar>
                                <AvatarImage src={mentee.avatar} />
                                <AvatarFallback>{mentee.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold">{mentee.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {mentee.year} • {mentee.department}
                                </p>
                                <div className="text-xs text-muted-foreground mt-1">
                                  CGPA: {mentee.cgpa}
                                </div>
                                <p className="text-sm mt-2">{mentee.goals}</p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {mentee.interests.map((interest) => (
                                    <Badge key={interest} variant="outline" className="text-xs">
                                      {interest}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Matching Interface */}
                {selectedMentor && selectedMentee && (
                  <Card className="border-primary">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-red-500" />
                        Proposed Match
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <div className="font-semibold">Mentor</div>
                          <div className="text-sm text-muted-foreground">
                            {availableMentors.find(m => m.id === selectedMentor)?.name}
                          </div>
                        </div>
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <div className="font-semibold">Mentee</div>
                          <div className="text-sm text-muted-foreground">
                            {availableMentees.find(m => m.id === selectedMentee)?.name}
                          </div>
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {availableMentors.find(m => m.id === selectedMentor)?.matchScore}% Compatibility
                        </div>
                        <Progress 
                          value={availableMentors.find(m => m.id === selectedMentor)?.matchScore || 0} 
                          className="h-2 mt-2"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Matching Factors</Label>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">Same Department</Badge>
                          <Badge variant="secondary">Industry Alignment</Badge>
                          <Badge variant="secondary">Skill Overlap</Badge>
                          <Badge variant="secondary">Communication Preference</Badge>
                        </div>
                      </div>

                      <Button onClick={handleCreateMatch} className="w-full">
                        <UserCheck className="h-4 w-4 mr-2" />
                        Create Mentorship Match
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="program" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Mentorship Program Management
                </CardTitle>
                <CardDescription>
                  Track progress, set goals, and manage ongoing mentorship relationships
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="programType">Program Type</Label>
                    <Select value={matchingData.programType} onValueChange={(value) => setMatchingData({...matchingData, programType: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="career">Career Development</SelectItem>
                        <SelectItem value="academic">Academic Support</SelectItem>
                        <SelectItem value="industry">Industry-Specific</SelectItem>
                        <SelectItem value="leadership">Leadership Development</SelectItem>
                        <SelectItem value="entrepreneurship">Entrepreneurship</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sessionFrequency">Session Frequency</Label>
                    <Select value={matchingData.sessionFrequency} onValueChange={(value) => setMatchingData({...matchingData, sessionFrequency: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="as-needed">As Needed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expectedDuration">Duration (months)</Label>
                    <Input
                      id="expectedDuration"
                      type="number"
                      value={matchingData.expectedDuration}
                      onChange={(e) => setMatchingData({...matchingData, expectedDuration: e.target.value})}
                      placeholder="6"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="communicationPlan">Communication Plan</Label>
                  <Textarea
                    id="communicationPlan"
                    value={matchingData.communicationPlan}
                    onChange={(e) => setMatchingData({...matchingData, communicationPlan: e.target.value})}
                    placeholder="How will mentor and mentee communicate? (Video calls, emails, etc.)"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Goals & Milestones */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Goals & Milestones
                  </div>
                  <Button onClick={addGoal} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Goal
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {matchingData.goals.length > 0 ? (
                  <div className="space-y-4">
                    {matchingData.goals.map((goal, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                        <div className="space-y-2">
                          <Label>Goal Description</Label>
                          <Input
                            value={goal.description}
                            onChange={(e) => updateGoal(index, 'description', e.target.value)}
                            placeholder="What needs to be achieved?"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Target Date</Label>
                          <Input
                            type="date"
                            value={goal.targetDate}
                            onChange={(e) => updateGoal(index, 'targetDate', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Priority</Label>
                          <Select 
                            value={goal.priority} 
                            onValueChange={(value) => updateGoal(index, 'priority', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select 
                            value={goal.status} 
                            onValueChange={(value) => updateGoal(index, 'status', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not-started">Not Started</SelectItem>
                              <SelectItem value="in-progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="on-hold">On Hold</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No goals set yet. Click "Add Goal" to create mentorship objectives.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Progress Tracking */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Progress Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Total Sessions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">12</div>
                      <p className="text-xs text-muted-foreground">Planned sessions</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Completed</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">8</div>
                      <p className="text-xs text-muted-foreground">Sessions done</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Goals Achieved</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">5/7</div>
                      <p className="text-xs text-muted-foreground">71% completion</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Satisfaction</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold flex items-center gap-1">
                        4.8 <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      </div>
                      <p className="text-xs text-muted-foreground">Both parties</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Overall Progress</span>
                    <span>67%</span>
                  </div>
                  <Progress value={67} className="h-3" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="flex justify-between">
          <div className="flex gap-2">
            <Button variant="outline">
              <MessageCircle className="h-4 w-4 mr-2" />
              Contact Participants
            </Button>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Meeting
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
            <Button onClick={handleSave}>
              <Send className="h-4 w-4 mr-2" />
              {mode === 'match' ? 'Create Match' : 'Save & Notify'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};