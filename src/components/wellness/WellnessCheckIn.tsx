import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Sun, Moon, CheckCircle } from 'lucide-react';

interface CheckInOption {
  id: string;
  label: string;
  icon: string;
}

const morningOptions: CheckInOption[] = [
  { id: 'ate_healthy', label: 'Ate healthy breakfast', icon: '🍎' },
  { id: 'exercised', label: 'Did morning exercise', icon: '🏃‍♂️' },
  { id: 'well_rested', label: 'Feeling well-rested', icon: '😴' },
  { id: 'motivated', label: 'Feeling motivated', icon: '💪' },
  { id: 'stressed', label: 'Feeling stressed', icon: '😰' },
  { id: 'unwell', label: 'Not feeling well', icon: '🤒' }
];

const eveningOptions: CheckInOption[] = [
  { id: 'completed_goals', label: 'Completed daily goals', icon: '✅' },
  { id: 'ate_dinner', label: 'Had nutritious dinner', icon: '🥗' },
  { id: 'relaxed', label: 'Feeling relaxed', icon: '😌' },
  { id: 'satisfied', label: 'Satisfied with today', icon: '😊' },
  { id: 'anxious', label: 'Feeling anxious', icon: '😟' },
  { id: 'tired', label: 'Very tired', icon: '😴' }
];

export function WellnessCheckIn() {
  const [morningCheckIn, setMorningCheckIn] = useState<string[]>([]);
  const [eveningCheckIn, setEveningCheckIn] = useState<string[]>([]);
  const [morningCompleted, setMorningCompleted] = useState(false);
  const [eveningCompleted, setEveningCompleted] = useState(false);

  const handleOptionToggle = (optionId: string, type: 'morning' | 'evening') => {
    if (type === 'morning' && !morningCompleted) {
      setMorningCheckIn(prev => 
        prev.includes(optionId) 
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId]
      );
    } else if (type === 'evening' && !eveningCompleted) {
      setEveningCheckIn(prev => 
        prev.includes(optionId) 
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId]
      );
    }
  };

  const handleSubmitCheckIn = (type: 'morning' | 'evening') => {
    if (type === 'morning') {
      setMorningCompleted(true);
      // Here you would typically send the data to your backend
    } else {
      setEveningCompleted(true);
      // Here you would typically send the data to your backend
    }
  };

  return (
    <div className="space-y-6">
      {/* Morning Check-in */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sun className="w-5 h-5 text-yellow-500" />
              <CardTitle className="text-lg">Morning Check-in</CardTitle>
            </div>
            {morningCompleted ? (
              <Badge variant="default" className="flex items-center space-x-1">
                <CheckCircle className="w-3 h-3" />
                <span>Completed</span>
              </Badge>
            ) : (
              <Badge variant="outline">Pending</Badge>
            )}
          </div>
          <CardDescription>
            How are you feeling this morning? Select all that apply.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {morningOptions.map((option) => (
              <Button
                key={option.id}
                variant={morningCheckIn.includes(option.id) ? 'default' : 'outline'}
                size="sm"
                className="justify-start h-auto p-3"
                onClick={() => handleOptionToggle(option.id, 'morning')}
                disabled={morningCompleted}
              >
                <span className="mr-2">{option.icon}</span>
                <span className="text-xs">{option.label}</span>
              </Button>
            ))}
          </div>
          {!morningCompleted && morningCheckIn.length > 0 && (
            <Button 
              onClick={() => handleSubmitCheckIn('morning')}
              className="w-full"
            >
              Submit Morning Check-in
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Evening Check-in */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Moon className="w-5 h-5 text-blue-500" />
              <CardTitle className="text-lg">Evening Check-in</CardTitle>
            </div>
            {eveningCompleted ? (
              <Badge variant="default" className="flex items-center space-x-1">
                <CheckCircle className="w-3 h-3" />
                <span>Completed</span>
              </Badge>
            ) : (
              <Badge variant="outline">Pending</Badge>
            )}
          </div>
          <CardDescription>
            How did your day go? Reflect on your day and select all that apply.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {eveningOptions.map((option) => (
              <Button
                key={option.id}
                variant={eveningCheckIn.includes(option.id) ? 'default' : 'outline'}
                size="sm"
                className="justify-start h-auto p-3"
                onClick={() => handleOptionToggle(option.id, 'evening')}
                disabled={eveningCompleted}
              >
                <span className="mr-2">{option.icon}</span>
                <span className="text-xs">{option.label}</span>
              </Button>
            ))}
          </div>
          {!eveningCompleted && eveningCheckIn.length > 0 && (
            <Button 
              onClick={() => handleSubmitCheckIn('evening')}
              className="w-full"
            >
              Submit Evening Check-in
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}