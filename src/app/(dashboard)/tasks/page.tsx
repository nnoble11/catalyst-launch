import { requireAuth } from '@/lib/auth';
import { getProjectsByUserId } from '@/lib/db/queries';
import { TaskBoard } from '@/components/tasks/TaskBoard';

export default async function TasksPage() {
  const user = await requireAuth();
  const projects = await getProjectsByUserId(user.id);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Task Board</h1>
        <p className="text-sm text-muted-foreground">
          Organize your tasks and track progress across all your projects.
        </p>
      </div>

      <TaskBoard
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      />
    </div>
  );
}
