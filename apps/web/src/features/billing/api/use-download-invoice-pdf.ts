import { useMutation } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export const useDownloadInvoicePdf = () => {
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      // 🟢 MAIN FIX: Pointing to '/invoices' instead of '/billing/invoices'
      const response = await axiosInstance.get(`/invoices/${invoiceId}/pdf`, {
        responseType: 'blob', // Required for handling binary data (PDF)
      });

      // Extract filename from Content-Disposition header if available
      let filename = `Invoice_${invoiceId}.pdf`;
      const disposition = response.headers['content-disposition'];
      
      if (disposition && disposition.indexOf('attachment') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      // Create a blob URL from the response data
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link element to trigger the download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      
      link.click();
      
      // Cleanup
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return true;
    },
  });
};
