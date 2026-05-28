export type StageCategory = 'structure' | 'finishing'
export type ProjectStatus = 'active' | 'completed' | 'on_hold'
export type StageStatus = 'on_time' | 'buffer' | 'delayed' | 'no_data'
export type UserRole = 'admin' | 'coordinator' | 'site_engineer' | 'project_manager' | 'client' | 'viewer'

export interface StageTarget {
  id: string
  stage_name: string
  target_days: number
  buffer_days: number
  category: StageCategory
  sort_order: number
  updated_at: string
}

export interface Project {
  id: string
  client_name: string
  location: string | null
  mob_date: string | null
  floors: string | null
  plot_size: string | null
  status: ProjectStatus
  notes: string | null
  client_phone: string | null
  engineer_name: string | null
  engineer_phone: string | null
  project_manager_name: string | null
  project_manager_phone: string | null
  maps_link: string | null
  created_at: string
  updated_at: string
}

export interface ProjectStage {
  id: string
  project_id: string
  stage_name: string
  completed_date: string | null
  notes: string | null
  payment_date: string | null
  created_at: string
  updated_at: string
}

export interface StageStatusRow {
  project_id: string
  client_name: string
  location: string | null
  mob_date: string | null
  project_status: ProjectStatus
  stage_name: string
  completed_date: string | null
  target_days: number
  buffer_days: number
  category: StageCategory
  sort_order: number
  days_from_mob: number | null
  stage_status: StageStatus
  delay_days: number | null
}

export interface ProjectSummary {
  id: string
  client_name: string
  location: string | null
  mob_date: string | null
  status: ProjectStatus
  total_stages_done: number
  stages_on_time: number
  stages_in_buffer: number
  stages_delayed: number
  on_time_pct: number | null
  max_delay_days: number
  last_stage_date: string | null
  created_at: string
}

export interface ProjectStageOverride {
  id: string
  project_id: string
  stage_name: string
  target_days: number
  buffer_days: number
}

export interface StageAnalysis {
  stage_name: string
  target_days: number
  buffer_days: number
  category: StageCategory
  sort_order: number
  project_count: number
  avg_days_from_mob: number | null
  avg_delay_days: number | null
  max_days_from_mob: number | null
  min_days_from_mob: number | null
  count_on_time: number
  count_buffer: number
  count_delayed: number
  on_time_pct: number | null
}
