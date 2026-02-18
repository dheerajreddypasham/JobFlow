import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { jobsAPI } from '../utils/api';
import { formatRelativeDate } from '../utils/helpers';
import {
  Plus,
  Search,
  Building2,
  MapPin,
  ExternalLink,
  Sparkles,
  Filter,
  Check,
  X as XIcon,
  Loader2,
  Globe,
  Clock,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { api } from '../utils/api';

export const JobInbox = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddJob, setShowAddJob] = useState(false);
  const [activeTab, setActiveTab] = useState('saved');
  
  // Job search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    query: '',
    location: '',
    remote_only: false,
    experience_level: '',
  });
  const [selectedJobs, setSelectedJobs] = useState(new Set());
  
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
      setFilteredJobs(jobs.filter((j) => j.status === 'saved'));
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredJobs(
        jobs.filter(
          (j) =>
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
      setFilteredJobs(response.data.filter((j) => j.status === 'saved'));
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

  const handleSearchJobs = async () => {
    if (!searchFilters.query.trim()) {
      toast.error('Please enter a search term');
      return;
    }

    setSearching(true);
    try {
      const response = await api.post('/jobs/search', {
        query: searchFilters.query,
        location: searchFilters.location || null,
        remote_only: searchFilters.remote_only,
        experience_level: searchFilters.experience_level || null,
        max_results: 20,
      });
      setSearchResults(response.data.jobs);
      setSelectedJobs(new Set());
      toast.success(`Found ${response.data.count} jobs!`);
    } catch (error) {
      console.error('Job search error:', error);
      toast.error('Failed to search jobs');
    } finally {
      setSearching(false);
    }
  };

  const toggleJobSelection = (index) => {
    const newSelected = new Set(selectedJobs);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedJobs(newSelected);
  };

  const selectAllJobs = () => {
    if (selectedJobs.size === searchResults.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(searchResults.map((_, i) => i)));
    }
  };

  const bulkSaveJobs = async () => {
    const selectedJobsData = Array.from(selectedJobs).map((index) => {
      const job = searchResults[index];
      return {
        title: job.title,
        company: job.company,
        location: job.location,
        job_url: job.job_url,
        source: job.source,
        description: job.description,
        salary_range: job.salary_range || null,
      };
    });

    try {
      const response = await api.post('/jobs/bulk-save', selectedJobsData);
      toast.success(response.data.message);
      setSelectedJobs(new Set());
      setShowSearch(false);
      fetchJobs();
    } catch (error) {
      toast.error('Failed to save jobs');
    }
  };

  const quickSaveJob = async (job) => {
    try {
      await jobsAPI.create({
        title: job.title,
        company: job.company,
        location: job.location,
        job_url: job.job_url,
        source: job.source,
        description: job.description,
        salary_range: job.salary_range || null,
      });
      toast.success(`${job.title} saved!`);
      fetchJobs();
    } catch (error) {
      toast.error('Failed to save job');
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
            Search the web for jobs or add them manually
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Button
            onClick={() => setShowSearch(!showSearch)}
            className="rounded-full px-6 py-3 bg-[#064E3B] text-white hover:bg-[#064E3B]/90 hover:-translate-y-0.5 transition-all shadow-lg shadow-[#064E3B]/20"
            data-testid="search-web-jobs-button"
          >
            <Search className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Search Web for Jobs
          </Button>

          <Dialog open={showAddJob} onOpenChange={setShowAddJob}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="rounded-full px-6 py-3"
                data-testid="add-job-manually-button"
              >
                <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} />
                Add Manually
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

        {/* Job Search Panel */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8"
            >
              <Card className="bg-white rounded-xl border border-stone-200/60 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-[#064E3B]" strokeWidth={1.5} />
                    <h3 className="text-xl font-medium text-stone-900">Search Jobs Across the Web</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSearch(false)}
                    data-testid="close-search-panel"
                  >
                    <XIcon className="w-5 h-5" strokeWidth={1.5} />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="search-query">Job Title / Keywords *</Label>
                      <Input
                        id="search-query"
                        value={searchFilters.query}
                        onChange={(e) => setSearchFilters({ ...searchFilters, query: e.target.value })}
                        placeholder="e.g., Software Engineer, Product Manager"
                        data-testid="search-query-input"
                        onKeyPress={(e) => e.key === 'Enter' && handleSearchJobs()}
                      />
                    </div>
                    <div>
                      <Label htmlFor="search-location">Location (Optional)</Label>
                      <Input
                        id="search-location"
                        value={searchFilters.location}
                        onChange={(e) => setSearchFilters({ ...searchFilters, location: e.target.value })}
                        placeholder="e.g., San Francisco, Remote"
                        data-testid="search-location-input"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="remote-only"
                        checked={searchFilters.remote_only}
                        onCheckedChange={(checked) =>
                          setSearchFilters({ ...searchFilters, remote_only: checked })
                        }
                        data-testid="remote-only-checkbox"
                      />
                      <Label htmlFor="remote-only" className="cursor-pointer">
                        Remote only
                      </Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label htmlFor="experience-level" className="whitespace-nowrap">
                        Experience:
                      </Label>
                      <Select
                        value={searchFilters.experience_level}
                        onValueChange={(value) =>
                          setSearchFilters({ ...searchFilters, experience_level: value })
                        }
                      >
                        <SelectTrigger id="experience-level" className="w-40" data-testid="experience-select">
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Any</SelectItem>
                          <SelectItem value="entry">Entry Level</SelectItem>
                          <SelectItem value="mid">Mid Level</SelectItem>
                          <SelectItem value="senior">Senior</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={handleSearchJobs}
                    disabled={searching || !searchFilters.query.trim()}
                    className="w-full rounded-full"
                    data-testid="execute-search-button"
                  >
                    {searching ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" strokeWidth={1.5} />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" strokeWidth={1.5} />
                        Search Jobs
                      </>
                    )}
                  </Button>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-stone-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-medium text-stone-900">
                        {searchResults.length} Jobs Found
                      </h4>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={selectAllJobs}
                          data-testid="select-all-jobs-button"
                        >
                          {selectedJobs.size === searchResults.length ? 'Deselect All' : 'Select All'}
                        </Button>
                        {selectedJobs.size > 0 && (
                          <Button
                            size="sm"
                            onClick={bulkSaveJobs}
                            className="bg-[#064E3B] text-white hover:bg-[#064E3B]/90"
                            data-testid="bulk-save-button"
                          >
                            Save {selectedJobs.size} Job{selectedJobs.size > 1 ? 's' : ''}
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                      {searchResults.map((job, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className={`bg-stone-50 rounded-lg p-4 border transition-all ${
                            selectedJobs.has(index)
                              ? 'border-[#064E3B] bg-[#ECFDF5]'
                              : 'border-stone-200 hover:border-stone-300'
                          }`}
                          data-testid={`search-result-${index}`}
                        >
                          <div className="flex items-start gap-4">
                            <Checkbox
                              checked={selectedJobs.has(index)}
                              onCheckedChange={() => toggleJobSelection(index)}
                              data-testid={`job-checkbox-${index}`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h5 className="font-medium text-stone-900 mb-1">{job.title}</h5>
                                  <p className="text-sm text-stone-600">{job.company}</p>
                                </div>
                                <span className="text-xs text-stone-500 bg-white px-2 py-1 rounded">
                                  {job.source}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-sm text-stone-500 mb-2">
                                {job.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" strokeWidth={1.5} />
                                    {job.location}
                                  </span>
                                )}
                                {job.is_remote && (
                                  <span className="bg-[#ECFDF5] text-[#064E3B] px-2 py-0.5 rounded text-xs font-medium">
                                    Remote
                                  </span>
                                )}
                                {job.salary_range && (
                                  <span className="text-[#059669] font-medium">{job.salary_range}</span>
                                )}
                              </div>

                              {job.description && (
                                <p className="text-sm text-stone-600 line-clamp-2 mb-3">{job.description}</p>
                              )}

                              {job.tags && job.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {job.tags.map((tag, i) => (
                                    <span
                                      key={i}
                                      className="text-xs bg-white px-2 py-1 rounded text-stone-600 border border-stone-200"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-stone-400">
                                  <Clock className="w-3 h-3" strokeWidth={1.5} />
                                  Posted recently
                                </div>
                                <div className="flex gap-2">
                                  {job.job_url && (
                                    <a
                                      href={job.job_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-stone-500 hover:text-[#064E3B] transition-colors"
                                      data-testid={`job-external-link-${index}`}
                                    >
                                      <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
                                    </a>
                                  )}
                                  {!selectedJobs.has(index) && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => quickSaveJob(job)}
                                      className="h-8 px-3 text-xs"
                                      data-testid={`quick-save-${index}`}
                                    >
                                      Quick Save
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Saved Jobs */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" strokeWidth={1.5} />
            <Input
              type="text"
              placeholder="Search saved jobs by title, company, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 bg-white border-stone-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#064E3B]/20 focus:border-[#064E3B] shadow-sm"
              data-testid="saved-jobs-search-input"
            />
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <Card className="bg-white rounded-xl border border-stone-200/60 shadow-sm p-12 text-center">
            <Sparkles className="w-16 h-16 text-stone-300 mx-auto mb-4" strokeWidth={1.5} />
            <h3 className="text-xl font-medium text-stone-900 mb-2">No saved jobs yet</h3>
            <p className="text-stone-600 mb-6">
              {searchQuery
                ? 'Try a different search term'
                : 'Search the web for jobs or add them manually to get started'}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => setShowSearch(true)}
                className="rounded-full px-6 py-3 bg-[#064E3B] text-white hover:bg-[#064E3B]/90"
              >
                <Search className="w-4 h-4 mr-2" strokeWidth={1.5} />
                Search for Jobs
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
                data-testid={`saved-job-card-${index}`}
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
                          data-testid={`saved-job-link-${index}`}
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
