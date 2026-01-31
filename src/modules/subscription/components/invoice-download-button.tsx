import { Download, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { apiClient } from '@/services/api/client';
import { toast } from 'sonner';

interface InvoiceDownloadButtonProps {
  invoiceId: number;
  invoiceNumber: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showText?: boolean;
}

export function InvoiceDownloadButton({
  invoiceId,
  invoiceNumber,
  variant = 'outline',
  size = 'sm',
  showText = true,
}: InvoiceDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await apiClient.get(
        `/admin/subscription/invoices/${invoiceId}/pdf`,
        {
          responseType: 'blob',
        }
      );

      // Create blob URL and trigger download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('تم تحميل الفاتورة بنجاح');
    } catch (error) {
      console.error('Failed to download invoice:', error);
      toast.error('فشل في تحميل الفاتورة');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleView = async () => {
    setIsDownloading(true);
    try {
      const response = await apiClient.get(
        `/admin/subscription/invoices/${invoiceId}/pdf/view`,
        {
          responseType: 'blob',
        }
      );

      // Open PDF in new tab
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');

      // Clean up after a delay
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (error) {
      console.error('Failed to view invoice:', error);
      toast.error('فشل في عرض الفاتورة');
    } finally {
      setIsDownloading(false);
    }
  };

  if (size === 'icon') {
    return (
      <Button
        variant={variant}
        size="icon"
        onClick={handleDownload}
        disabled={isDownloading}
        title="تحميل الفاتورة"
      >
        {isDownloading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <div className="flex gap-1">
      <Button
        variant={variant}
        size={size}
        onClick={handleDownload}
        disabled={isDownloading}
      >
        {isDownloading ? (
          <Loader2 className="h-4 w-4 animate-spin ml-2" />
        ) : (
          <Download className="h-4 w-4 ml-2" />
        )}
        {showText && 'تحميل'}
      </Button>
      <Button
        variant="ghost"
        size={size}
        onClick={handleView}
        disabled={isDownloading}
        title="عرض الفاتورة"
      >
        <FileText className="h-4 w-4" />
      </Button>
    </div>
  );
}
