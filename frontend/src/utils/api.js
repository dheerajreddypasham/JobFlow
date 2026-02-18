import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_URL = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authAPI = {
  createSession: (sessionId) => api.post('/auth/session', { session_id: sessionId }),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

export const jobsAPI = {
  getAll: () => api.get('/jobs'),
  getOne: (jobId) => api.get(`/jobs/${jobId}`),
  create: (jobData) => api.post('/jobs', jobData),
  update: (jobId, jobData) => api.patch(`/jobs/${jobId}`, jobData),
  delete: (jobId) => api.delete(`/jobs/${jobId}`),
};

export const goalsAPI = {
  get: () => api.get('/goals'),
  update: (goalsData) => api.patch('/goals', goalsData),
};

export const tasksAPI = {
  getAll: (date) => api.get('/tasks', { params: { date } }),
  create: (taskData, date) => api.post('/tasks', taskData, { params: { date } }),
  update: (taskId, completed) => api.patch(`/tasks/${taskId}`, null, { params: { completed } }),
  delete: (taskId) => api.delete(`/tasks/${taskId}`),
};

export const remindersAPI = {
  getAll: () => api.get('/reminders'),
  create: (reminderData) => api.post('/reminders', reminderData),
  update: (reminderId, completed) => api.patch(`/reminders/${reminderId}`, null, { params: { completed } }),
  delete: (reminderId) => api.delete(`/reminders/${reminderId}`),
};

export const aiAPI = {
  analyzeJob: (jobDescription, userResume) => 
    api.post('/ai/analyze-job', { job_description: jobDescription, user_resume: userResume }),
  generateCoverLetter: (jobDescription, userResume) => 
    api.post('/ai/generate-cover-letter', { job_description: jobDescription, user_resume: userResume }),
  generateEmail: (jobTitle, company, recipientName, emailType) => 
    api.post('/ai/generate-email', { job_title: jobTitle, company, recipient_name: recipientName, email_type: emailType }),
};
