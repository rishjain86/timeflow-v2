import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';

export interface UpdateOrganizationData {
  name?: string;
  domain?: string;
  companyName?: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  defaultCurrency?: string;
  taxRate?: number;
  invoicePrefix?: string;
  dueDays?: number;
  invoiceNotes?: string;
  footerText?: string;
  defaultHourlyRate?: number;
  timeZone?: string;
  dateFormat?: string;
  timeFormat?: string;
  language?: string;
  theme?: string;
  notificationsOn?: boolean;
}

export const updateOrganization = async (data: UpdateOrganizationData) => {
  const response = await axiosInstance.patch('/organizations', data);
  return response.data;
};

export const useUpdateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateOrganization,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
  });
};
