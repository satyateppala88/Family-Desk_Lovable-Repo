import { Task } from "@/types/database";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TaskFiltersProps {
  statusFilter: Task['status'] | 'all';
  priorityFilter: Task['priority'] | 'all';
  onStatusChange: (status: Task['status'] | 'all') => void;
  onPriorityChange: (priority: Task['priority'] | 'all') => void;
}

export const TaskFilters = ({
  statusFilter,
  priorityFilter,
  onStatusChange,
  onPriorityChange,
}: TaskFiltersProps) => {
  return (
    <div className="space-y-4">
      <Tabs value={statusFilter} onValueChange={(value: any) => onStatusChange(value)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      <Select value={priorityFilter} onValueChange={(value: any) => onPriorityChange(value)}>
        <SelectTrigger>
          <SelectValue placeholder="Filter by priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
