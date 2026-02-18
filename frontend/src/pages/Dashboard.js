import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { goalsAPI, tasksAPI, remindersAPI, jobsAPI } from '../utils/api';
import { getTodayString, formatDate } from '../utils/helpers';
import { CalendarDays, Target, CheckCircle2, Circle, Plus, X, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

export const Dashboard = () => {
  const [goals, setGoals] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ type: 'application', description: '', job_id: '' });

  const today = getTodayString();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [goalsRes, tasksRes, remindersRes, jobsRes] = await Promise.all([
        goalsAPI.get(),
        tasksAPI.getAll(today),
        remindersAPI.getAll(),
        jobsAPI.getAll(),
      ]);
      setGoals(goalsRes.data);
      setTasks(tasksRes.data);
      setReminders(remindersRes.data.filter(r => !r.completed));
      setJobs(jobsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (taskId, completed) => {
    try {
      await tasksAPI.update(taskId, !completed);
      setTasks(tasks.map(t => t.task_id === taskId ? { ...t, completed: !completed } : t));
      toast.success(completed ? 'Task marked incomplete' : 'Task completed!');
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const addTask = async () => {
    if (!newTask.description.trim()) {
      toast.error('Please enter a task description');
      return;
    }

    try {
      const response = await tasksAPI.create(
        {
          task_type: newTask.type,
          description: newTask.description,
          job_id: newTask.job_id || undefined,
        },
        today
      );
      setTasks([...tasks, response.data]);
      setNewTask({ type: 'application', description: '', job_id: '' });
      setShowAddTask(false);
      toast.success('Task added!');
    } catch (error) {
      toast.error('Failed to add task');
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await tasksAPI.delete(taskId);
      setTasks(tasks.filter(t => t.task_id !== taskId));
      toast.success('Task deleted');
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#064E3B] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-600">Loading your day...</p>
        </div>
      </div>
    );
  }

  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const todayReminders = reminders.filter(r => {
    const reminderDate = new Date(r.reminder_date);
    const now = new Date();
    return reminderDate.toDateString() === now.toDateString();
  });

  return (
    <div data-testid="today-dashboard">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="w-6 h-6 text-[#064E3B]" strokeWidth={1.5} />
            <p className="text-sm font-bold uppercase tracking-widest text-stone-500">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <h1 className="text-5xl md:text-6xl font-medium tracking-tighter leading-[1.1] text-stone-900 mb-2">
            Your Day
          </h1>
          <p className="text-lg text-stone-600 leading-relaxed">
            {completedTasks === totalTasks && totalTasks > 0
              ? 'All done! Great work today.'
              : `${completedTasks} of ${totalTasks} tasks complete`}
          </p>
        </div>

        {/* Progress Card */}
        <Card className="bg-white rounded-xl border border-stone-200/60 shadow-sm p-8 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Target className="w-6 h-6 text-[#064E3B]" strokeWidth={1.5} />
              <h2 className="text-2xl font-medium tracking-tight text-stone-900">Daily Goals</h2>
            </div>
            <span className="text-3xl font-medium text-[#064E3B]">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-3 mb-6" />
          {goals && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-stone-50/50 rounded-lg">
                <p className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-1">Applications</p>
                <p className="text-2xl font-medium text-stone-900">
                  {tasks.filter(t => t.task_type === 'application' && t.completed).length}/{goals.applications_per_day}
                </p>
              </div>
              <div className="p-4 bg-stone-50/50 rounded-lg">
                <p className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-1">Networking</p>
                <p className="text-2xl font-medium text-stone-900">
                  {tasks.filter(t => t.task_type === 'networking' && t.completed).length}/{goals.networking_per_day}
                </p>
              </div>
              <div className="p-4 bg-stone-50/50 rounded-lg">
                <p className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-1">Skills Practice</p>
                <p className="text-2xl font-medium text-stone-900">
                  {tasks.filter(t => t.task_type === 'skills' && t.completed).length}/{goals.skills_per_day}
                </p>
              </div>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tasks */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-stone-900">Today's Tasks</h2>
              <Button
                onClick={() => setShowAddTask(true)}
                className="rounded-full px-6 py-2 bg-[#064E3B] text-white hover:bg-[#064E3B]/90"
                data-testid="add-task-button"
              >
                <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} />
                Add Task
              </Button>
            </div>

            {showAddTask && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-white rounded-xl border border-stone-200/60 shadow-sm p-6 mb-4"
              >
                <div className="space-y-4">
                  <Select value={newTask.type} onValueChange={(value) => setNewTask({ ...newTask, type: value })}>
                    <SelectTrigger data-testid="task-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="application">Application</SelectItem>
                      <SelectItem value="networking">Networking</SelectItem>
                      <SelectItem value="skills">Skills Practice</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="What do you need to do?"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    data-testid="task-description-input"
                  />
                  <div className="flex gap-2">
                    <Button onClick={addTask} className="flex-1" data-testid="save-task-button">
                      Save Task
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddTask(false)} data-testid="cancel-task-button">
                      Cancel
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="space-y-3">
              {tasks.length === 0 ? (
                <Card className="bg-white rounded-xl border border-stone-200/60 shadow-sm p-8 text-center">
                  <Sparkles className="w-12 h-12 text-stone-300 mx-auto mb-4" strokeWidth={1.5} />
                  <p className="text-stone-500">No tasks yet. Add your first task to get started!</p>
                </Card>
              ) : (
                tasks.map((task, index) => (
                  <motion.div
                    key={task.task_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-xl border border-stone-200/60 shadow-sm p-4 hover:shadow-md transition-all"
                    data-testid={`task-${index}`}
                  >
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => toggleTask(task.task_id, task.completed)}
                        className="flex-shrink-0"
                        data-testid={`task-toggle-${index}`}
                      >
                        {task.completed ? (
                          <CheckCircle2 className="w-6 h-6 text-[#059669]" strokeWidth={1.5} />
                        ) : (
                          <Circle className="w-6 h-6 text-stone-300" strokeWidth={1.5} />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-medium ${
                            task.completed ? 'line-through text-stone-400' : 'text-stone-900'
                          }`}
                        >
                          {task.description}
                        </p>
                        <p className="text-xs text-stone-500 mt-1 capitalize">{task.task_type}</p>
                      </div>
                      <button
                        onClick={() => deleteTask(task.task_id)}
                        className="text-stone-400 hover:text-red-600 transition-colors"
                        data-testid={`task-delete-${index}`}
                      >
                        <X className="w-5 h-5" strokeWidth={1.5} />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Reminders */}
          <div>
            <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-stone-900 mb-6">Reminders</h2>
            <div className="space-y-3">
              {todayReminders.length === 0 ? (
                <Card className="bg-white rounded-xl border border-stone-200/60 shadow-sm p-6 text-center">
                  <p className="text-stone-500 text-sm">No reminders for today</p>
                </Card>
              ) : (
                todayReminders.map((reminder, index) => {
                  const job = jobs.find(j => j.job_id === reminder.job_id);
                  return (
                    <motion.div
                      key={reminder.reminder_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white rounded-xl border border-stone-200/60 shadow-sm p-4"
                      data-testid={`reminder-${index}`}
                    >
                      <p className="font-medium text-stone-900 mb-1">{reminder.message}</p>
                      {job && (
                        <p className="text-sm text-stone-600">
                          {job.title} at {job.company}
                        </p>
                      )}
                      <p className="text-xs text-stone-500 mt-2">{formatDate(reminder.reminder_date)}</p>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
