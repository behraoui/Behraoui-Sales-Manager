
export enum ServiceType {
  VideoAds = 'Video Ads',
  LandingPage = 'Landing Page',
  VoiceOver = 'Voice Over'
}

export enum SaleStatus {
  Lead = 'Lead',
  Contacted = 'Contacted',
  InProgress = 'In Progress',
  Delivered = 'Delivered',
  ClosedLost = 'Closed Lost',
  Scammer = 'Scammer'
}

export type ItemStatus = 'Pending' | 'In Progress' | 'Delivered';

export interface Reminder {
  id: string;
  date: string; // ISO Date string (YYYY-MM-DD)
  note: string;
  isCompleted: boolean;
}

export interface SaleItem {
  name: string;
  isPaid: boolean;
  status: ItemStatus;
}

// 'Sale' now represents a Client/Job within a Project
export interface Sale {
  id: string;
  clientName: string;
  phoneNumber: string;
  serviceType: ServiceType;
  status: SaleStatus;
  price: number; // Unit Price
  quantity: number; // Quantity
  items: SaleItem[]; // List of items with individual payment status
  leadDate: string; // ISO Date string
  sentDate?: string; // ISO Date string
  notes?: string;
  reminders?: Reminder[];
}

export interface Project {
  id: string;
  name: string;
  createdAt: string; // ISO Date
  description?: string;
  clients: Sale[];
}

export interface Stats {
  totalRevenue: number;
  totalSales: number;
  pendingPaymentCount: number;
  conversionRate: number;
}
