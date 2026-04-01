/**
 * Database Record Types
 * Type-safe representations of Supabase table records
 */

// Profiles table
export interface ProfileRecord {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  position: string | null;
  department: string | null;
  status: string;
  created_at: string;
  avatar_url: string | null;
}

// Leave requests table
export interface LeaveRequestRecord {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  status: string;
  reason: string | null;
  created_at: string;
}

// Projects table
export interface ProjectRecord {
  id: string;
  title: string;
  description: string | null;
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';
  progress: number;
  deadline: string;
  team_lead_id: string;
  member_ids: string[] | null;
  created_at: string;
}

// Tasks table
export interface TaskRecord {
  id: string;
  project_id: string;
  title: string;
  status: string;
  assignee_id: string;
  priority: string;
  proof_url: string | null;
  verification_status: string;
  due_date: string | null;
  created_at: string;
}

// Applications table (Hiring)
export interface ApplicationRecord {
  id: string;
  candidate_name: string;
  candidate_email: string;
  status: string;
  resume_url: string | null;
  resume_text: string | null;
  generated_questions: unknown | null;
  ai_reasoning: string | null;
  score: number | null;
  created_at: string;
}

// Job postings table
export interface JobRecord {
  id: string;
  title: string;
  description: string | null;
  required_skills: string[] | null;
  is_active: boolean;
  created_at: string;
}

// Organizations table
export interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: string;
  subscription_status: string | null;
  max_employees: number;
  created_at: string;
}

/**
 * Type guard functions for database records
 */

export function isProfileRecord(value: unknown): value is ProfileRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'role' in value &&
    'full_name' in value
  );
}

export function isLeaveRequestRecord(value: unknown): value is LeaveRequestRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'user_id' in value &&
    'start_date' in value &&
    'end_date' in value
  );
}

export function isProjectRecord(value: unknown): value is ProjectRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'title' in value &&
    'status' in value
  );
}

export function isTaskRecord(value: unknown): value is TaskRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'project_id' in value &&
    'title' in value
  );
}

export function isApplicationRecord(value: unknown): value is ApplicationRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'candidate_name' in value &&
    'candidate_email' in value
  );
}

/**
 * Safe assertion functions - use when you're sure of the type
 */

export function assertProfileRecord(value: unknown): ProfileRecord {
  if (!isProfileRecord(value)) {
    throw new Error('Invalid profile record: missing required fields');
  }
  return value;
}

export function assertLeaveRequestRecord(value: unknown): LeaveRequestRecord {
  if (!isLeaveRequestRecord(value)) {
    throw new Error('Invalid leave request record: missing required fields');
  }
  return value;
}

export function assertProjectRecord(value: unknown): ProjectRecord {
  if (!isProjectRecord(value)) {
    throw new Error('Invalid project record: missing required fields');
  }
  return value;
}

export function assertTaskRecord(value: unknown): TaskRecord {
  if (!isTaskRecord(value)) {
    throw new Error('Invalid task record: missing required fields');
  }
  return value;
}
