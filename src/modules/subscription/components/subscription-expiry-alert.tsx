import { AlertTriangle, Clock, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { differenceInDays, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface SubscriptionExpiryAlertProps {
  endsAt: string | null;
  status?: string;
  gracePeriodRemaining?: number;
}

export function SubscriptionExpiryAlert({
  endsAt,
  status,
  gracePeriodRemaining,
}: SubscriptionExpiryAlertProps) {
  const navigate = useNavigate();

  if (!endsAt) return null;

  const endDate = parseISO(endsAt);
  const daysUntilExpiry = differenceInDays(endDate, new Date());

  // Don't show alert if more than 7 days remaining
  if (daysUntilExpiry > 7 && status !== 'past_due') return null;

  // In grace period
  if (status === 'past_due' && gracePeriodRemaining !== undefined) {
    return (
      <Alert variant="destructive" className="mb-4">
        <XCircle className="h-4 w-4" />
        <AlertTitle>انتهى اشتراكك!</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>
            أنت في فترة السماح. متبقي <strong>{gracePeriodRemaining} يوم</strong> للتجديد قبل قطع الخدمة.
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => navigate('/admin/subscription')}
          >
            جدد الآن
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Expired
  if (daysUntilExpiry <= 0) {
    return (
      <Alert variant="destructive" className="mb-4">
        <XCircle className="h-4 w-4" />
        <AlertTitle>انتهى اشتراكك!</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>يرجى تجديد الاشتراك لمواصلة استخدام النظام.</span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => navigate('/admin/subscription')}
          >
            جدد الآن
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Expiring soon (1-3 days)
  if (daysUntilExpiry <= 3) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>اشتراكك ينتهي قريباً!</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>
            متبقي <strong>{daysUntilExpiry} {daysUntilExpiry === 1 ? 'يوم' : 'أيام'}</strong> على انتهاء اشتراكك.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/subscription')}
          >
            تجديد الاشتراك
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Expiring in 4-7 days
  return (
    <Alert className="mb-4 border-yellow-500 bg-yellow-50 text-yellow-800">
      <Clock className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-800">تذكير</AlertTitle>
      <AlertDescription className="flex items-center justify-between text-yellow-700">
        <span>
          اشتراكك ينتهي خلال <strong>{daysUntilExpiry} أيام</strong>. ننصحك بالتجديد مبكراً.
        </span>
        <Button
          variant="outline"
          size="sm"
          className="border-yellow-600 text-yellow-700 hover:bg-yellow-100"
          onClick={() => navigate('/admin/subscription')}
        >
          عرض الاشتراك
        </Button>
      </AlertDescription>
    </Alert>
  );
}
