import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TeachingUpdate {
  date: string;
  subject: string;
  class: string;
  topicsCovered: string[];
  importantTopics: string[];
  pyq: string[];
  nextClassPrep: string;
  notes: string;
}

export function DailyTeachingUpdate() {
  const { toast } = useToast();
  const [update, setUpdate] = useState<TeachingUpdate>({
    date: new Date().toISOString().split('T')[0],
    subject: '',
    class: '',
    topicsCovered: [],
    importantTopics: [],
    pyq: [],
    nextClassPrep: '',
    notes: ''
  });

  const [currentTopic, setCurrentTopic] = useState('');
  const [currentImportant, setCurrentImportant] = useState('');
  const [currentPyq, setCurrentPyq] = useState('');

  const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History'];
  const classes = ['Class 9A', 'Class 9B', 'Class 10A', 'Class 10B', 'Class 11 Science', 'Class 12 Science'];

  const addTopic = (type: 'topicsCovered' | 'importantTopics' | 'pyq', value: string, setValue: (val: string) => void) => {
    if (value.trim()) {
      setUpdate(prev => ({
        ...prev,
        [type]: [...prev[type], value.trim()]
      }));
      setValue('');
    }
  };

  const removeTopic = (type: 'topicsCovered' | 'importantTopics' | 'pyq', index: number) => {
    setUpdate(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save to localStorage (in real app, this would go to backend)
    const existingUpdates = JSON.parse(localStorage.getItem('teachingUpdates') || '[]');
    const newUpdate = { ...update, id: Date.now().toString() };
    localStorage.setItem('teachingUpdates', JSON.stringify([...existingUpdates, newUpdate]));
    
    toast({
      title: "Daily Update Saved",
      description: "Your teaching update has been saved and will appear in student mentor chat.",
    });

    // Reset form
    setUpdate({
      date: new Date().toISOString().split('T')[0],
      subject: '',
      class: '',
      topicsCovered: [],
      importantTopics: [],
      pyq: [],
      nextClassPrep: '',
      notes: ''
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation showBackButton={true} backUrl="/dashboard" backLabel="Back to Dashboard" />
      <main className="container mx-auto px-4 py-6">
        <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <CardTitle>Daily Teaching Update</CardTitle>
        </div>
        <CardDescription>
          Update what you taught today - this will help students in their mentor chat
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={update.date}
                onChange={(e) => setUpdate(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={update.subject} onValueChange={(value) => setUpdate(prev => ({ ...prev, subject: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={update.class} onValueChange={(value) => setUpdate(prev => ({ ...prev, class: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Topics Covered Today</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Add topic covered..."
                  value={currentTopic}
                  onChange={(e) => setCurrentTopic(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTopic('topicsCovered', currentTopic, setCurrentTopic))}
                />
                <Button 
                  type="button" 
                  onClick={() => addTopic('topicsCovered', currentTopic, setCurrentTopic)}
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {update.topicsCovered.map((topic, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {topic}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => removeTopic('topicsCovered', index)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Important Topics for Exams</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Add important topic..."
                  value={currentImportant}
                  onChange={(e) => setCurrentImportant(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTopic('importantTopics', currentImportant, setCurrentImportant))}
                />
                <Button 
                  type="button" 
                  onClick={() => addTopic('importantTopics', currentImportant, setCurrentImportant)}
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {update.importantTopics.map((topic, index) => (
                  <Badge key={index} variant="default" className="flex items-center gap-1">
                    {topic}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => removeTopic('importantTopics', index)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Previous Year Questions (PYQ)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Add PYQ reference..."
                  value={currentPyq}
                  onChange={(e) => setCurrentPyq(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTopic('pyq', currentPyq, setCurrentPyq))}
                />
                <Button 
                  type="button" 
                  onClick={() => addTopic('pyq', currentPyq, setCurrentPyq)}
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {update.pyq.map((pyq, index) => (
                  <Badge key={index} variant="outline" className="flex items-center gap-1">
                    {pyq}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => removeTopic('pyq', index)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nextClassPrep">Next Class Preparation</Label>
              <Input
                id="nextClassPrep"
                placeholder="What should students prepare for next class?"
                value={update.nextClassPrep}
                onChange={(e) => setUpdate(prev => ({ ...prev, nextClassPrep: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes or reminders for students..."
                value={update.notes}
                onChange={(e) => setUpdate(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={!update.subject || !update.class}>
            Save Daily Update
          </Button>
        </form>
      </CardContent>
    </Card>
      </main>
    </div>
  );
}