import { requireAuth } from '@/lib/auth';
import { getProjectsByUserId } from '@/lib/db/queries';
import { TaskBoard } from '@/components/tasks/TaskBoard';

export default async function TasksPage() {
  const user = await requireAuth();
  const projects = await getProjectsByUserId(user.id);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Task Board</h1>
        <p className="text-muted-foreground">
          Organize your tasks and track progress across all your projects.
        </p>
      </div>

      <TaskBoard
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      />
    </div>
  );
}
