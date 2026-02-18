import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { jobsAPI } from '../utils/api';
import { formatRelativeDate } from '../utils/helpers';
import { Plus, Search, Building2, MapPin, ExternalLink, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';

export const JobInbox = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddJob, setShowAddJob] = useState(false);
  const [newJob, setNewJob] = useState({
    title: '',
    company: '',
    location: '',
    job_url: '',
    source: '',
    description: '',
    salary_range: '',
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredJobs(jobs.filter(j => j.status === 'saved'));
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredJobs(
        jobs.filter(
          j =>
            j.status === 'saved' &&
            (j.title.toLowerCase().includes(query) ||
              j.company.toLowerCase().includes(query) ||
              (j.location && j.location.toLowerCase().includes(query)))
        )
      );
    }
  }, [searchQuery, jobs]);

  const fetchJobs = async () => {
    try {
      const response = await jobsAPI.getAll();
      setJobs(response.data);
      setFilteredJobs(response.data.filter(j => j.status === 'saved'));
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const addJob = async () => {
    if (!newJob.title || !newJob.company) {
      toast.error('Please enter job title and company');
      return;
    }

    try {
      await jobsAPI.create(newJob);
      toast.success('Job added to inbox!');
      setShowAddJob(false);
      setNewJob({
        title: '',
        company: '',
        location: '',
        job_url: '',
        source: '',
        description: '',
        salary_range: '',
      });
      fetchJobs();
    } catch (error) {
      toast.error('Failed to add job');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#064E3B] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-600">Loading jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="job-inbox">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="mb-8">
          <h1 className="text-5xl md:text-6xl font-medium tracking-tighter leading-[1.1] text-stone-900 mb-2">
            Job Inbox
          </h1>
          <p className="text-lg text-stone-600 leading-relaxed">
            Discover and save opportunities to review later
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" strokeWidth={1.5} />
            <Input
              type="text"
              placeholder="Search jobs by title, company, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 bg-white border-stone-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#064E3B]/20 focus:border-[#064E3B] shadow-sm"
              data-testid="job-search-input"
            />
          </div>

          <Dialog open={showAddJob} onOpenChange={setShowAddJob}>
            <DialogTrigger asChild>
              <Button
                className="rounded-full px-6 py-3 bg-[#064E3B] text-white hover:bg-[#064E3B]/90 hover:-translate-y-0.5 transition-all shadow-lg shadow-[#064E3B]/20"
                data-testid="add-job-button"
              >
                <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} />
                Add Job
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-medium tracking-tight">Add New Job</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="job-title">Job Title *</Label>
                    <Input
                      id="job-title"
                      value={newJob.title}
                      onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                      placeholder="e.g., Frontend Developer"
                      data-testid="job-title-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company">Company *</Label>
                    <Input
                      id="company"
                      value={newJob.company}
                      onChange={(e) => setNewJob({ ...newJob, company: e.target.value })}
                      placeholder="e.g., Google"
                      data-testid="job-company-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={newJob.location}
                      onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                      placeholder="e.g., Remote, San Francisco"
                      data-testid="job-location-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="salary">Salary Range</Label>
                    <Input
                      id="salary"
                      value={newJob.salary_range}
                      onChange={(e) => setNewJob({ ...newJob, salary_range: e.target.value })}
                      placeholder="e.g., $120k - $150k"
                      data-testid="job-salary-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="source">Source</Label>
                    <Input
                      id="source"
                      value={newJob.source}
                      onChange={(e) => setNewJob({ ...newJob, source: e.target.value })}
                      placeholder="e.g., LinkedIn, Indeed"
                      data-testid="job-source-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="job-url">Job URL</Label>
                    <Input
                      id="job-url"
                      value={newJob.job_url}
                      onChange={(e) => setNewJob({ ...newJob, job_url: e.target.value })}
                      placeholder="https://..."
                      data-testid="job-url-input"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Job Description</Label>
                  <Textarea
                    id="description"
                    value={newJob.description}
                    onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                    placeholder="Paste the job description here..."
                    rows={6}
                    data-testid="job-description-input"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={addJob} className="flex-1" data-testid="save-job-button">
                    Save Job
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddJob(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {filteredJobs.length === 0 ? (
          <Card className="bg-white rounded-xl border border-stone-200/60 shadow-sm p-12 text-center">
            <Sparkles className="w-16 h-16 text-stone-300 mx-auto mb-4" strokeWidth={1.5} />
            <h3 className="text-xl font-medium text-stone-900 mb-2">No jobs in your inbox</h3>
            <p className="text-stone-600 mb-6">
              {searchQuery ? 'Try a different search term' : 'Start adding jobs you want to review and apply to'}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => setShowAddJob(true)}
                className="rounded-full px-6 py-3 bg-[#064E3B] text-white hover:bg-[#064E3B]/90"
              >
                <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} />
                Add Your First Job
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredJobs.map((job, index) => (
              <motion.div
                key={job.job_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                data-testid={`job-card-${index}`}
              >
                <Card
                  className="bg-white rounded-xl border border-stone-200/60 shadow-sm hover:shadow-md hover:border-stone-300 transition-all cursor-pointer overflow-hidden"
                  onClick={() => navigate(`/dashboard/jobs/${job.job_id}`)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 rounded-full bg-[#F5F5F4] flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-[#064E3B]" strokeWidth={1.5} />
                      </div>
                      {job.job_url && (
                        <a
                          href={job.job_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-stone-400 hover:text-[#064E3B] transition-colors"
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`job-link-${index}`}
                        >
                          <ExternalLink className="w-5 h-5" strokeWidth={1.5} />
                        </a>
                      )}
                    </div>
                    <h3 className="text-xl font-medium text-stone-900 mb-1">{job.title}</h3>
                    <p className="text-stone-600 mb-3">{job.company}</p>
                    {(job.location || job.salary_range) && (
                      <div className="flex flex-wrap gap-3 mb-3">
                        {job.location && (
                          <span className="flex items-center gap-1 text-sm text-stone-500">
                            <MapPin className="w-4 h-4" strokeWidth={1.5} />
                            {job.location}
                          </span>
                        )}
                        {job.salary_range && (
                          <span className="text-sm text-[#059669] font-medium">{job.salary_range}</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                      <span className="text-xs text-stone-500">{formatRelativeDate(job.date_added)}</span>
                      {job.source && (
                        <span className="text-xs text-stone-500 bg-stone-100 px-2 py-1 rounded">{job.source}</span>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};
