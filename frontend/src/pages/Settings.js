import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { goalsAPI, authAPI } from '../utils/api';
import { Settings as SettingsIcon, Target, User } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { toast } from 'sonner';

export const Settings = () => {
  const [user, setUser] = useState(null);
  const [goals, setGoals] = useState({
    applications_per_day: 3,
    networking_per_day: 2,
    skills_per_day: 2,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [userRes, goalsRes] = await Promise.all([authAPI.getMe(), goalsAPI.get()]);
      setUser(userRes.data);
      setGoals({
        applications_per_day: goalsRes.data.applications_per_day,
        networking_per_day: goalsRes.data.networking_per_day,
        skills_per_day: goalsRes.data.skills_per_day,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveGoals = async () => {
    try {
      await goalsAPI.update(goals);
      toast.success('Goals updated successfully!');
    } catch (error) {
      toast.error('Failed to update goals');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#064E3B] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="settings-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="mb-8">
          <h1 className="text-5xl md:text-6xl font-medium tracking-tighter leading-[1.1] text-stone-900 mb-2">
            Settings
          </h1>
          <p className="text-lg text-stone-600 leading-relaxed">Manage your profile and preferences</p>
        </div>

        <div className="space-y-6 max-w-3xl">
          {/* Profile */}
          <Card className="bg-white rounded-xl border border-stone-200/60 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <User className="w-6 h-6 text-[#064E3B]" strokeWidth={1.5} />
              <h2 className="text-2xl font-medium tracking-tight text-stone-900">Profile</h2>
            </div>
            {user && (
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={user.picture} alt={user.name} />
                  <AvatarFallback className="bg-[#064E3B] text-white text-2xl">
                    {user.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xl font-medium text-stone-900">{user.name}</p>
                  <p className="text-stone-600">{user.email}</p>
                </div>
              </div>
            )}
          </Card>

          {/* Daily Goals */}
          <Card className="bg-white rounded-xl border border-stone-200/60 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <Target className="w-6 h-6 text-[#064E3B]" strokeWidth={1.5} />
              <h2 className="text-2xl font-medium tracking-tight text-stone-900">Daily Goals</h2>
            </div>
            <p className="text-stone-600 mb-6 leading-relaxed">
              Set your daily targets to build consistent job search habits.
            </p>
            <div className="space-y-6">
              <div>
                <Label htmlFor="applications" className="text-base">
                  Applications per day
                </Label>
                <Input
                  id="applications"
                  type="number"
                  min="0"
                  value={goals.applications_per_day}
                  onChange={(e) =>
                    setGoals({ ...goals, applications_per_day: parseInt(e.target.value) || 0 })
                  }
                  className="mt-2"
                  data-testid="applications-per-day-input"
                />
              </div>
              <div>
                <Label htmlFor="networking" className="text-base">
                  Networking messages per day
                </Label>
                <Input
                  id="networking"
                  type="number"
                  min="0"
                  value={goals.networking_per_day}
                  onChange={(e) => setGoals({ ...goals, networking_per_day: parseInt(e.target.value) || 0 })}
                  className="mt-2"
                  data-testid="networking-per-day-input"
                />
              </div>
              <div>
                <Label htmlFor="skills" className="text-base">
                  Skills practice per day
                </Label>
                <Input
                  id="skills"
                  type="number"
                  min="0"
                  value={goals.skills_per_day}
                  onChange={(e) => setGoals({ ...goals, skills_per_day: parseInt(e.target.value) || 0 })}
                  className="mt-2"
                  data-testid="skills-per-day-input"
                />
              </div>
              <Button
                onClick={saveGoals}
                className="rounded-full px-8 py-3 bg-[#064E3B] text-white hover:bg-[#064E3B]/90 hover:-translate-y-0.5 transition-all shadow-lg shadow-[#064E3B]/20"
                data-testid="save-goals-button"
              >
                Save Goals
              </Button>
            </div>
          </Card>

          {/* About */}
          <Card className="bg-white rounded-xl border border-stone-200/60 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-4">
              <SettingsIcon className="w-6 h-6 text-[#064E3B]" strokeWidth={1.5} />
              <h2 className="text-2xl font-medium tracking-tight text-stone-900">About JobFlow</h2>
            </div>
            <p className="text-stone-600 leading-relaxed mb-4">
              JobFlow is your personal copilot for a successful job search. Track applications, set daily goals, and
              leverage AI to optimize your job search process.
            </p>
            <p className="text-sm text-stone-500">Version 1.0.0</p>
          </Card>
        </div>
      </motion.div>
    </div>
  );
};
