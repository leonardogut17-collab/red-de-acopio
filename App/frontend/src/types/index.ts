export type Role = "admin" | "coordinador" | "voluntario" | "donante";
export type Category =
  | "alimentos" | "agua" | "higiene" | "ropa" | "medicamentos" | "aseo" | "cobijas" | "otros";
export type Priority = "alta" | "media" | "baja";
export type NeedStatus = "abierta" | "cubierta";
export type DonationStatus = "prometida" | "recibida" | "cancelada";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  phone: string | null;
}

export interface AdminUser extends User {
  is_active: number;
  created_at: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface Center {
  id: number;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  schedule: string | null;
  description: string | null;
  coordinator_id: number | null;
  coordinator_name: string | null;
  coordinator_email: string | null;
  is_active: number;
  open_needs: number;
  urgent_needs: number;
  can_manage?: boolean;
  created_at: string;
}

export interface CenterDetail extends Center {
  needs: Need[];
}

export interface Need {
  id: number;
  center_id: number;
  center_name: string;
  center_address: string;
  category: Category;
  item: string;
  quantity: number;
  unit: string;
  priority: Priority;
  status: NeedStatus;
  created_at: string;
}

export interface Donation {
  id: number;
  center_id: number;
  center_name: string;
  donor_id: number | null;
  donor_display: string;
  donor_email: string | null;
  category: Category;
  item: string;
  quantity: number;
  unit: string;
  status: DonationStatus;
  notes: string | null;
  received_by_name: string | null;
  received_at: string | null;
  created_at: string;
}

export interface InventoryRow {
  category: Category;
  item: string;
  unit: string;
  received: number;
  delivered: number;
  stock: number;
}

export interface Delivery {
  id: number;
  center_id: number;
  category: Category;
  item: string;
  quantity: number;
  unit: string;
  beneficiary: string;
  notes: string | null;
  created_by_name: string | null;
  created_at: string;
}

export interface Shift {
  id: number;
  center_id: number;
  center_name: string;
  center_address: string;
  title: string;
  description: string | null;
  date: string;
  start_time: string;
  end_time: string;
  slots: number;
  signed_up: number;
  is_signed_up: boolean;
  can_manage: boolean;
}

export interface Volunteer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  signed_up_at: string;
}

export interface Stats {
  centers: number;
  openNeeds: number;
  urgentNeeds: number;
  donationsReceived: number;
  donationsPending: number;
  volunteers: number;
  upcomingShifts: number;
  deliveries: number;
}
