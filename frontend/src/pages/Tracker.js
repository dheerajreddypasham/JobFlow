import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { jobsAPI } from '../utils/api';
import { statusLabels, formatRelativeDate } from '../utils/helpers';
import { useNavigate } from 'react-router-dom';
import { Building2, GripVertical } from 'lucide-react';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';

const statuses = ['saved', 'to-apply', 'applied', 'interview', 'offer', 'rejected'];

const statusColors = {
  saved: '#A8A29E',
  'to-apply': '#D97706',
  applied: '#0F766E',
  interview: '#7C3AED',
  offer: '#059669',
  rejected: '#DC2626',
};

const JobCard = ({ job, isDragging }) => {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: job.job_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white p-4 rounded-xl shadow-sm border border-stone-100 hover:shadow-md cursor-grab active:cursor-grabbing mb-3 job-card-drag"
      onClick={() => navigate(`/dashboard/jobs/${job.job_id}`)}
      data-testid={`job-card-${job.job_id}`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-3 mb-2">
        <GripVertical className="w-4 h-4 text-stone-300 flex-shrink-0 mt-1" strokeWidth={1.5} />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-stone-900 mb-1 truncate">{job.title}</h4>
          <p className="text-sm text-stone-600 truncate">{job.company}</p>
        </div>
      </div>
      {job.location && <p className="text-xs text-stone-500 pl-7">{job.location}</p>}
      <p className="text-xs text-stone-400 mt-2 pl-7">{formatRelativeDate(job.date_added)}</p>
    </div>
  );
};

const KanbanColumn = ({ status, jobs }) => {
  const { setNodeRef } = useSortable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className="bg-stone-50/50 rounded-2xl p-4 min-w-[300px] border border-transparent flex-shrink-0"
      data-testid={`kanban-column-${status}`}
    >
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColors[status] }}></div>
          <h3 className="font-medium text-stone-900">{statusLabels[status]}</h3>
        </div>
        <span className="text-sm text-stone-500 bg-white px-2 py-1 rounded">{jobs.length}</span>
      </div>
      <SortableContext items={jobs.map((j) => j.job_id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 min-h-[200px]">
          {jobs.map((job) => (
            <JobCard key={job.job_id} job={job} />
          ))}
          {jobs.length === 0 && (
            <div className="text-center py-8 text-stone-400 text-sm">
              Drop jobs here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
};

export const Tracker = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await jobsAPI.getAll();
      setJobs(response.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const jobId = active.id;
    const newStatus = over.id;

    if (statuses.includes(newStatus)) {
      const job = jobs.find((j) => j.job_id === jobId);
      if (job && job.status !== newStatus) {
        try {
          await jobsAPI.update(jobId, { status: newStatus });
          setJobs(jobs.map((j) => (j.job_id === jobId ? { ...j, status: newStatus } : j)));
          toast.success(`Moved to ${statusLabels[newStatus]}`);
        } catch (error) {
          toast.error('Failed to update job status');
        }
      }
    }
    
    setActiveId(null);
  };

  const getJobsByStatus = (status) => jobs.filter((j) => j.status === status);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#064E3B] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-600">Loading tracker...</p>
        </div>
      </div>
    );
  }

  const activeJob = activeId ? jobs.find((j) => j.job_id === activeId) : null;

  return (
    <div data-testid="application-tracker">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="mb-8">
          <h1 className="text-5xl md:text-6xl font-medium tracking-tighter leading-[1.1] text-stone-900 mb-2">
            Application Tracker
          </h1>
          <p className="text-lg text-stone-600 leading-relaxed">
            Drag and drop to update your application status
          </p>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="overflow-x-auto pb-4 kanban-scroll">
            <div className="flex gap-6 min-w-max">
              <SortableContext items={statuses} strategy={verticalListSortingStrategy}>
                {statuses.map((status) => (
                  <KanbanColumn key={status} status={status} jobs={getJobsByStatus(status)} />
                ))}
              </SortableContext>
            </div>
          </div>

          <DragOverlay>
            {activeJob ? (
              <div className="bg-white p-4 rounded-xl shadow-xl border border-stone-200">
                <div className="flex items-start gap-3">
                  <GripVertical className="w-4 h-4 text-stone-300" strokeWidth={1.5} />
                  <div>
                    <h4 className="font-medium text-stone-900 mb-1">{activeJob.title}</h4>
                    <p className="text-sm text-stone-600">{activeJob.company}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </motion.div>
    </div>
  );
};
