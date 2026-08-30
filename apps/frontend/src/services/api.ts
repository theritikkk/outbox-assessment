import axios from 'axios';
import { 
  UserDto, 
  EmailDto, 
  CampaignDto, 
  CreateCampaignRequest, 
  SlackStatusDto,
  ApiResponse
} from '../types';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

export const authApi = {
  getCurrentUser: () => api.get<ApiResponse<UserDto>>('/auth/me'),
  logout: () => api.post<ApiResponse<void>>('/auth/logout'),
};

export const emailApi = {
  getScheduledEmails: () => api.get<ApiResponse<EmailDto[]>>('/emails/scheduled'),
  getSentEmails: () => api.get<ApiResponse<EmailDto[]>>('/emails/sent'),
  getEmailById: (id: string) => api.get<ApiResponse<EmailDto>>(`/emails/${id}`),
  searchEmails: (query: string) => api.get<ApiResponse<EmailDto[]>>(`/emails/search?q=${encodeURIComponent(query)}`),
  uploadCsv: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ApiResponse<{ recipients: string[] }>>('/emails/upload-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const campaignApi = {
  createCampaign: (data: CreateCampaignRequest) => api.post<ApiResponse<CampaignDto>>('/campaigns', data),
  getCampaigns: () => api.get<ApiResponse<CampaignDto[]>>('/campaigns'),
};

export const slackApi = {
  getSlackStatus: () => api.get<ApiResponse<SlackStatusDto>>('/slack/status'),
  disconnectSlack: () => api.post<ApiResponse<void>>('/slack/disconnect'),
};

export default api;
