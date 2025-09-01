import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AddTeamDialogProps {
  onTeamAdded: (team: any) => void;
}

export const AddTeamDialog = ({ onTeamAdded }: AddTeamDialogProps) => {
  const [open, setOpen] = useState(false);
  const [teamData, setTeamData] = useState({
    sport: '',
    category: '',
    captain: '',
    coach: '',
    members: '11',
    description: '',
  });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teamData.sport || !teamData.category || !teamData.captain) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const newTeam = {
      id: Date.now(),
      sport: teamData.sport,
      category: teamData.category,
      captain: teamData.captain,
      members: parseInt(teamData.members) || 0,
      coach: teamData.coach || 'Not assigned',
      achievements: [],
      description: teamData.description,
      createdDate: new Date().toISOString().split('T')[0],
    };

    onTeamAdded(newTeam);
    
    toast({
      title: "Success",
      description: "Team created successfully!",
    });
    
    setTeamData({
      sport: '',
      category: '',
      captain: '',
      coach: '',
      members: '11',
      description: '',
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Team
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Team</DialogTitle>
          <DialogDescription>
            Create a new sports team with captain and coach details.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sport">Sport *</Label>
              <Select value={teamData.sport} onValueChange={(value) => setTeamData({ ...teamData, sport: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sport" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Football">Football</SelectItem>
                  <SelectItem value="Basketball">Basketball</SelectItem>
                  <SelectItem value="Cricket">Cricket</SelectItem>
                  <SelectItem value="Badminton">Badminton</SelectItem>
                  <SelectItem value="Athletics">Athletics</SelectItem>
                  <SelectItem value="Swimming">Swimming</SelectItem>
                  <SelectItem value="Tennis">Tennis</SelectItem>
                  <SelectItem value="Volleyball">Volleyball</SelectItem>
                  <SelectItem value="Hockey">Hockey</SelectItem>
                  <SelectItem value="Table Tennis">Table Tennis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={teamData.category} onValueChange={(value) => setTeamData({ ...teamData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Men's Senior">Men's Senior</SelectItem>
                  <SelectItem value="Women's Senior">Women's Senior</SelectItem>
                  <SelectItem value="Men's Junior">Men's Junior</SelectItem>
                  <SelectItem value="Women's Junior">Women's Junior</SelectItem>
                  <SelectItem value="Mixed Senior">Mixed Senior</SelectItem>
                  <SelectItem value="Mixed Junior">Mixed Junior</SelectItem>
                  <SelectItem value="Under-19">Under-19</SelectItem>
                  <SelectItem value="Under-16">Under-16</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="captain">Team Captain *</Label>
            <Input
              id="captain"
              value={teamData.captain}
              onChange={(e) => setTeamData({ ...teamData, captain: e.target.value })}
              placeholder="e.g., John Smith"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="coach">Coach</Label>
              <Input
                id="coach"
                value={teamData.coach}
                onChange={(e) => setTeamData({ ...teamData, coach: e.target.value })}
                placeholder="e.g., Mr. Johnson"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="members">Number of Members</Label>
              <Input
                id="members"
                type="number"
                value={teamData.members}
                onChange={(e) => setTeamData({ ...teamData, members: e.target.value })}
                placeholder="e.g., 11"
                min="1"
                max="50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              value={teamData.description}
              onChange={(e) => setTeamData({ ...teamData, description: e.target.value })}
              placeholder="Team description or notes"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Team</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};