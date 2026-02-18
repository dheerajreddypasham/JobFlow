import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { jobsAPI, aiAPI, remindersAPI } from '../utils/api';
import { statusLabels, formatDate } from '../utils/helpers';
import {
  ArrowLeft,
  ExternalLink,
  Building2,
  MapPin,
  DollarSign,
  Calendar,
  Sparkles,
  FileText,
  Mail,
  Trash2,
  Bell,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';

export const JobDetail = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [emailDraft, setEmailDraft] = useState('');
  const [emailType, setEmailType] = useState('application');
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderMessage, setReminderMessage] = useState('');

  useEffect(() => {
    fetchJob();
  }, [jobId]);

  const fetchJob = async () => {
    try {
      const response = await jobsAPI.getOne(jobId);
      setJob(response.data);
      if (response.data.ai_match_score) {
        setAiAnalysis({
          match_score: response.data.ai_match_score,
          keywords: response.data.ai_keywords,
          summary: response.data.ai_summary,
        });
      }
    } catch (error) {
      console.error('Error fetching job:', error);
      toast.error('Failed to load job');
      navigate('/dashboard/inbox');
    } finally {
      setLoading(false);
    }
  };

  const updateJobStatus = async (newStatus) => {
    try {
      await jobsAPI.update(jobId, { status: newStatus });
      setJob({ ...job, status: newStatus });
      toast.success(`Status updated to ${statusLabels[newStatus]}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const analyzeJob = async () => {
    if (!job.description) {
      toast.error('No job description to analyze');
      return;
    }

    setAiLoading(true);
    try {
      const response = await aiAPI.analyzeJob(job.description);
      setAiAnalysis(response.data);
      await jobsAPI.update(jobId, {
        ai_match_score: response.data.match_score,
        ai_keywords: response.data.keywords,
        ai_summary: response.data.summary,
      });
      toast.success('Job analyzed!');
    } catch (error) {
      toast.error('Failed to analyze job');
    } finally {
      setAiLoading(false);
    }
  };

  const generateCoverLetter = async () => {
    if (!job.description) {
      toast.error('No job description available');
      return;
    }

    setAiLoading(true);
    try {
      const response = await aiAPI.generateCoverLetter(job.description);
      setCoverLetter(response.data.cover_letter);
      toast.success('Cover letter generated!');
    } catch (error) {
      toast.error('Failed to generate cover letter');
    } finally {
      setAiLoading(false);
    }
  };

  const generateEmail = async () => {
    setAiLoading(true);
    try {
      const response = await aiAPI.generateEmail(job.title, job.company, job.contact_person, emailType);
      setEmailDraft(response.data.email);
      toast.success('Email drafted!');
    } catch (error) {
      toast.error('Failed to generate email');
    } finally {
      setAiLoading(false);
    }
  };

  const deleteJob = async () => {
    if (!window.confirm('Are you sure you want to delete this job?')) return;

    try {
      await jobsAPI.delete(jobId);
      toast.success('Job deleted');
      navigate('/dashboard/inbox');
    } catch (error) {
      toast.error('Failed to delete job');
    }
  };

  const addReminder = async () => {
    if (!reminderDate || !reminderMessage) {
      toast.error('Please fill in all reminder fields');
      return;
    }

    try {
      await remindersAPI.create({
        job_id: jobId,
        reminder_date: new Date(reminderDate).toISOString(),
        message: reminderMessage,
      });
      toast.success('Reminder created!');
      setShowReminderDialog(false);
      setReminderDate('');
      setReminderMessage('');
    } catch (error) {
      toast.error('Failed to create reminder');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#064E3B] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-600">Loading job...</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="job-detail-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 -ml-2"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" strokeWidth={1.5} />
          Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <Card className="bg-white rounded-xl border border-stone-200/60 shadow-sm p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl bg-[#F5F5F4] flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-[#064E3B]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-stone-900 mb-2">
                      {job.title}
                    </h1>
                    <p className="text-xl text-stone-600">{job.company}</p>
                  </div>
                </div>
                {job.job_url && (
                  <a
                    href={job.job_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-stone-400 hover:text-[#064E3B] transition-colors"
                    data-testid="job-external-link"
                  >
                    <ExternalLink className="w-6 h-6" strokeWidth={1.5} />
                  </a>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {job.location && (
                  <div className="flex items-center gap-2 text-stone-600">
                    <MapPin className="w-5 h-5" strokeWidth={1.5} />
                    <span>{job.location}</span>
                  </div>
                )}
                {job.salary_range && (
                  <div className="flex items-center gap-2 text-[#059669] font-medium">
                    <DollarSign className="w-5 h-5" strokeWidth={1.5} />
                    <span>{job.salary_range}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-stone-600">
                  <Calendar className="w-5 h-5" strokeWidth={1.5} />
                  <span>{formatDate(job.date_added)}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium">Status:</Label>
                <Select value={job.status} onValueChange={updateJobStatus}>
                  <SelectTrigger className="w-48" data-testid="job-status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="saved">Saved</SelectItem>
                    <SelectItem value="to-apply">To Apply</SelectItem>
                    <SelectItem value="applied">Applied</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="offer">Offer</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* Description */}
            {job.description && (
              <Card className="bg-white rounded-xl border border-stone-200/60 shadow-sm p-8">
                <h2 className="text-2xl font-medium tracking-tight text-stone-900 mb-4">Job Description</h2>
                <div className="prose prose-stone max-w-none">
                  <p className="text-stone-600 whitespace-pre-wrap leading-relaxed">{job.description}</p>
                </div>
              </Card>
            )}

            {/* Notes */}
            <Card className="bg-white rounded-xl border border-stone-200/60 shadow-sm p-8">
              <h2 className="text-2xl font-medium tracking-tight text-stone-900 mb-4">Notes</h2>
              <Textarea
                value={job.notes || ''}
                onChange={(e) => setJob({ ...job, notes: e.target.value })}
                onBlur={() => jobsAPI.update(jobId, { notes: job.notes })}
                placeholder="Add your notes here..."
                rows={4}
                data-testid="job-notes-textarea"
              />
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* AI Assistant */}
            <Card className="bg-white rounded-xl border border-stone-200/60 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-[#064E3B]" strokeWidth={1.5} />
                <h3 className="text-lg font-medium text-stone-900">AI Assistant</h3>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={analyzeJob}
                  disabled={aiLoading || !job.description}
                  className="w-full justify-start"
                  variant="outline"
                  data-testid="analyze-job-button"
                >
                  <Sparkles className="w-4 h-4 mr-2" strokeWidth={1.5} />
                  {aiAnalysis ? 'Re-analyze Job' : 'Analyze Job'}
                </Button>
                <Button
                  onClick={generateCoverLetter}
                  disabled={aiLoading || !job.description}
                  className="w-full justify-start"
                  variant="outline"
                  data-testid="generate-cover-letter-button"
                >
                  <FileText className="w-4 h-4 mr-2" strokeWidth={1.5} />
                  Generate Cover Letter
                </Button>
                <Button
                  onClick={generateEmail}
                  disabled={aiLoading}
                  className="w-full justify-start"
                  variant="outline"
                  data-testid="generate-email-button"
                >
                  <Mail className="w-4 h-4 mr-2" strokeWidth={1.5} />
                  Draft Email
                </Button>
              </div>

              {aiAnalysis && (
                <div className="mt-6 p-4 bg-[#ECFDF5] rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-stone-700">Match Score</span>
                    <span className="text-2xl font-medium text-[#064E3B]">{aiAnalysis.match_score}%</span>
                  </div>
                  {aiAnalysis.keywords && aiAnalysis.keywords.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-stone-700 mb-2">Key Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {aiAnalysis.keywords.map((keyword, i) => (
                          <span
                            key={i}
                            className="text-xs bg-white px-2 py-1 rounded text-stone-700"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiAnalysis.summary && aiAnalysis.summary.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-stone-700 mb-2">Summary</p>
                      <ul className="text-sm text-stone-600 space-y-1 ai-text">
                        {aiAnalysis.summary.map((point, i) => (
                          <li key={i}>• {point}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {coverLetter && (
                <div className="mt-4 p-4 bg-stone-50 rounded-lg">
                  <p className="text-sm font-medium text-stone-700 mb-2">Cover Letter</p>
                  <p className="text-sm text-stone-600 whitespace-pre-wrap ai-text">{coverLetter}</p>
                </div>
              )}

              {emailDraft && (
                <div className="mt-4 p-4 bg-stone-50 rounded-lg">
                  <p className="text-sm font-medium text-stone-700 mb-2">Email Draft</p>
                  <p className="text-sm text-stone-600 whitespace-pre-wrap ai-text">{emailDraft}</p>
                </div>
              )}
            </Card>

            {/* Actions */}
            <Card className="bg-white rounded-xl border border-stone-200/60 shadow-sm p-6">
              <h3 className="text-lg font-medium text-stone-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start" data-testid="set-reminder-button">
                      <Bell className="w-4 h-4 mr-2" strokeWidth={1.5} />
                      Set Reminder
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Set Reminder</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="reminder-date">Date</Label>
                        <Input
                          id="reminder-date"
                          type="date"
                          value={reminderDate}
                          onChange={(e) => setReminderDate(e.target.value)}
                          data-testid="reminder-date-input"
                        />
                      </div>
                      <div>
                        <Label htmlFor="reminder-message">Message</Label>
                        <Input
                          id="reminder-message"
                          value={reminderMessage}
                          onChange={(e) => setReminderMessage(e.target.value)}
                          placeholder="e.g., Follow up on application"
                          data-testid="reminder-message-input"
                        />
                      </div>
                      <Button onClick={addReminder} className="w-full" data-testid="save-reminder-button">
                        Create Reminder
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="outline"
                  onClick={deleteJob}
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                  data-testid="delete-job-button"
                >
                  <Trash2 className="w-4 h-4 mr-2" strokeWidth={1.5} />
                  Delete Job
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
