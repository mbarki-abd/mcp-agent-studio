import { CheckCircle, Circle, Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm: string;
}

interface TodoProgressProps {
  todos: TodoItem[];
  className?: string;
}

export function TodoProgress({ todos, className }: TodoProgressProps) {
  const completed = todos.filter((t) => t.status === 'completed').length;
  const total = todos.length;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium">Task Progress</span>
          <span className="text-muted-foreground">
            {completed}/{total} ({progressPercent}%)
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Todo list */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {todos.map((todo) => (
          <div
            key={todo.id}
            className={cn(
              'flex items-start gap-2 p-2 rounded-lg text-sm',
              todo.status === 'in_progress' && 'bg-primary/10',
              todo.status === 'completed' && 'opacity-60'
            )}
          >
            {todo.status === 'completed' ? (
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            ) : todo.status === 'in_progress' ? (
              <Loader2 className="h-4 w-4 text-primary animate-spin mt-0.5 flex-shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'truncate',
                  todo.status === 'completed' && 'line-through'
                )}
              >
                {todo.status === 'in_progress' ? todo.activeForm : todo.content}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
