export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatRelativeDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diffTime = Math.abs(now - d);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return formatDate(date);
};

export const getTodayString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

export const statusColors = {
  saved: '#A8A29E',
  'to-apply': '#D97706',
  applied: '#0F766E',
  interview: '#7C3AED',
  offer: '#059669',
  rejected: '#DC2626',
};

export const statusLabels = {
  saved: 'Saved',
  'to-apply': 'To Apply',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
};
