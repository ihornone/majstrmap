import type { MasterContacts } from "../../shared/contacts";
export interface Category {
  id: string;
  name: string;
  is_custom: number;
  approved: number;
  created_at: string;
}

export type Contacts = MasterContacts;

export interface Master {
  id: number;
  telegram_id: number;
  slug: string;
  name: string;
  region_id: string;
  city: string;
  category_primary: string;
  category_secondary?: string | null;
  price_start: number;
  work_conditions: string;
  availability: string;
  contacts: string;  
  avatar_key?: string | null;
  description: string;
  about?: string | null;
  experience_years: number;
  rating: number;
  reviews_count: number;
  status: 'pending' | 'active' | 'inactive' | 'banned';
  channel_subscribed: number;
  last_activity_check?: string | null;
  activity_check_state?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MasterService {
  id: number;
  master_id: number;
  name: string;
  price: string;
  created_at: string;
}

export interface Review {
  id: number;
  master_id: number;
  client_telegram_id: number;
  client_name: string;
  rating: number;
  text?: string | null;
  collaboration_confirmed?: number;
  status: 'approved' | 'pending' | 'hidden';
  created_at: string;
  updated_at: string;
}

export interface BotSession {
  telegram_id: number;
  step: string;
  data: string;  
  updated_at: string;
}

export interface AdminRequest {
  id: number;
  type: 'new_category' | 'complaint' | 'new_profile' | 'edit_profile';
  master_id?: number | null;
  payload: string;  
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}
