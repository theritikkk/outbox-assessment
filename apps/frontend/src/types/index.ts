export enum EmailStatus { 
  PENDING = 'PENDING', 
  QUEUED = 'QUEUED', 
  SENDING = 'SENDING', 
  SENT = 'SENT', 
  FAILED = 'FAILED', 
  RATE_LIMITED = 'RATE_LIMITED' 
}

export enum CampaignStatus { 
  DRAFT = 'DRAFT', 
  SCHEDULING = 'SCHEDULING', 
  ACTIVE = 'ACTIVE', 
  COMPLETED = 'COMPLETED', 
  FAILED = 'FAILED' 
}

export interface ApiResponse<T> { 
  success: boolean; 
  data?: T; 
  error?: string; 
  message?: string;
}

export interface UserDto { 
  id: string; 
  name: string; 
  email: string; 
  avatarUrl: string | null;
  senderAccounts?: SenderAccountDto[];
}

export interface SenderAccountDto { 
  id: string; 
  email: string; 
  displayName: string; 
  hourlyLimit: number;
}

export interface EmailDto { 
  id: string; 
  campaignId: string; 
  recipient: string; 
  subject: string; 
  body: string; 
  scheduledAt: string; 
  sentAt: string | null; 
  status: EmailStatus; 
  attempts: number; 
  providerMessageId: string | null; 
  errorMessage: string | null; 
  createdAt: string;
}

export interface CampaignDto { 
  id: string; 
  subject: string; 
  body: string; 
  startAt: string; 
  delayBetweenEmails: number; 
  hourlyLimit: number; 
  status: CampaignStatus; 
  totalEmails: number; 
  sentCount: number; 
  failedCount: number; 
  createdAt: string; 
  sender?: SenderAccountDto;
}

export interface CreateCampaignRequest { 
  senderId: string; 
  subject: string; 
  body: string; 
  recipients: string[]; 
  startAt: string; 
  delayBetweenEmails: number; 
  hourlyLimit: number;
}

export interface SlackStatusDto { 
  connected: boolean; 
  teamName?: string; 
  connectedAt?: string;
}
