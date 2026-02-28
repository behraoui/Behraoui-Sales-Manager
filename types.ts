
export enum ServiceType {
  VideoAds = 'Video Ads',
  LandingPage = 'Landing Page',
  VoiceOver = 'Voice Over',
  LogoCreation = 'Logo Creation'
}

export enum SaleStatus {
  Lead = 'Lead',
  Contacted = 'Contacted',
  InProgress = 'In Progress',
  Delivered = 'Delivered',
  Paid = 'Paid',
  ClosedLost = 'Closed Lost',
  Scammer = 'Scammer'
}

export enum TaskType {
  General = 'General Task',
  UGCMale = 'UGC Photo (Male)',
  UGCFemale = 'UGC Photo (Female)',
  ScriptWriting = 'Script Writing',
  VideoEditing = 'Video Editing',
  VoiceOver = 'Voice Over Recording'
}

export type ItemStatus = 'Pending' | 'In Progress' | 'Delivered' | 'Needs Revision';

export type UserRole = 'admin' | 'worker';

export type WorkerStatus = 'available' | 'busy' | 'offline';

export interface User {
  id: string;
  username: string;
  password: string; // In a real app, this should be hashed
  name: string;
  role: UserRole;
  createdAt: string;
  avatar?: string; // Base64 string for profile picture
  workerStatus?: WorkerStatus; // New: Availability status
}

export interface Reminder {
  id: string;
  date: string; // ISO Date string (YYYY-MM-DD)
  note: string;
  isCompleted: boolean;
}

// Independent notifications (e.g., Admin sending an alert to a worker)
export interface GlobalNotification {
  id: string;
  targetUserId: string; // 'all', 'admin', or specific user ID
  fromUserName: string;
  message: string;
  date: string;
  isRead: boolean;
  type: 'alert' | 'info';
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string; // 'admin' for messages to admin, or specific user ID
  text: string;
  timestamp: string;
  read: boolean;
}

export interface Attachment {
  name: string;
  type: 'audio' | 'pdf' | 'image' | 'video' | 'other';
  data: string; // Base64 string
}

export interface SaleItem {
  name: string;
  isPaid: boolean;
  status: ItemStatus;
  type?: TaskType;
  description?: string; // Script or instructions
  attachments?: Attachment[];
  deliverables?: Attachment[]; // New: Final files uploaded by worker
  rejectionNote?: string; // New: Reason for 'Needs Revision'
}

// 'Sale' now represents a Client/Job within a Project
export interface Sale {
  id: string;
  sequenceNumber?: number; // Auto-incrementing order ID
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
  assignedWorkerIds?: string[]; // IDs of users assigned to this sale
  teamInstructions?: string; // Specific instructions for the team
  hasClientModifications?: boolean; // Flag for new client modifications
  isReturningCustomer?: boolean; // Flag for repeat customers
}

export interface Project {
  id: string;
  name: string;
  createdAt: string; // ISO Date
  description?: string;
  clients: Sale[];
  cost?: number; // Project Budget/Expenses for ROI calculation
}

export interface Goal {
  id: string;
  type: 'weekly' | 'monthly';
  targetAmount: number;
  startDate: string; // ISO Date
  endDate: string; // ISO Date
  createdAt: string;
}

export interface Stats {
  totalRevenue: number;
  totalSales: number;
  pendingPaymentCount: number;
  conversionRate: number;
}