import React, { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemePicker } from '@/components/ThemePicker';
import { 
  Clock, 
  Shuffle, 
  Hand, 
  Trophy 
} from 'lucide-react';

export default function Login() {
  const [usernameInput, setUsernameInput] = useState('');
  const { login } = useGame();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(usernameInput);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-background/90 animate-in fade-in">
      <div className="absolute top-4 right-4 z-50">
        <ThemePicker />
      </div>
      <Card className="max-w-sm w-full mx-4">
        <CardContent className="pt-6">
          <div className="flex justify-center mb-6">
            <h2 className="text-3xl font-bold text-primary">
              10 seconds, 10 numbers, 1 pick
            </h2>
          </div>
          
          <p className="text-center mb-6">Enter your username to start playing!</p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Enter your username"
                className="w-full"
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full"
            >
              Start Playing
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <h3 className="font-bold text-lg mb-2">How to Play:</h3>
            <ul className="text-left space-y-2 text-sm">
              <li className="flex items-center">
                <Clock className="h-5 w-5 text-accent-foreground mr-2" />
                Each round lasts 10 seconds
              </li>
              <li className="flex items-center">
                <Shuffle className="h-5 w-5 text-primary mr-2" />
                10 random numbers will appear one by one
              </li>
              <li className="flex items-center">
                <Hand className="h-5 w-5 text-secondary-foreground mr-2" />
                You must pick the last available number
              </li>
              <li className="flex items-center">
                <Trophy className="h-5 w-5 text-green-500 mr-2" />
                The player who picks the highest number wins!
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
