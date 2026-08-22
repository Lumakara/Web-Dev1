import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, ShoppingCart, CheckCircle, AlertTriangle, Users, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AnalyticsMetrics {
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  successfulPayments: number;
  pendingPayments: number;
  failedPayments: number;
  totalCustomers: number;
  totalProducts: number;
  pendingFulfillment: number;
  qrisFallback: number;
}

export function AdminAnalytics() {
  const [metrics, setMetrics] = useState<AnalyticsMetrics>({
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    successfulPayments: 0,
    pendingPayments: 0,
    failedPayments: 0,
    totalCustomers: 0,
    totalProducts: 0,
    pendingFulfillment: 0,
    qrisFallback: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      // Fetch all data in parallel
      const [orders, payments, customers, products] = await Promise.all([
        supabase.from('orders').select('*'),
        supabase.from('payments').select('*'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }),
      ]);

      const orderList = orders.data || [];
      const paymentList = payments.data || [];
      const customerCount = (customers.count as number) || 0;
      const productCount = (products.count as number) || 0;

      // Calculate metrics
      const totalRevenue = orderList.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
      const pendingOrders = orderList.filter(o => ['pending', 'paid'].includes(o.status)).length;
      const completedOrders = orderList.filter(o => o.status === 'completed').length;
      const pendingFulfillment = orderList.filter(o => o.status === 'processing' && !o.payment_reference).length;

      const successfulPayments = paymentList.filter(p => p.status === 'paid').length;
      const pendingPayments = paymentList.filter(p => p.status === 'pending').length;
      const failedPayments = paymentList.filter(p => p.status === 'failed').length;

      // QRIS fallback count - payments with fallback_provider
      const qrisFallback = paymentList.filter(p => p.fallback_provider).length;

      setMetrics({
        totalRevenue,
        pendingOrders,
        completedOrders,
        successfulPayments,
        pendingPayments,
        failedPayments,
        totalCustomers: customerCount,
        totalProducts: productCount,
        pendingFulfillment,
        qrisFallback,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Gagal memuat metrik');
    } finally {
      setIsLoading(false);
    }
  };

  const MetricCard = ({ title, value, icon: Icon, color }: any) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString('id-ID')}</p>
          </div>
          <Icon className={`h-8 w-8 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 pb-20">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Analitik</h1>
        <button onClick={fetchMetrics} className="text-sm text-blue-600 hover:underline">Refresh</button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard
              title="Total Pendapatan"
              value={metrics.totalRevenue}
              icon={DollarSign}
              color="text-green-600"
            />
            <MetricCard
              title="Pesanan Pending"
              value={metrics.pendingOrders}
              icon={ShoppingCart}
              color="text-yellow-600"
            />
            <MetricCard
              title="Pesanan Selesai"
              value={metrics.completedOrders}
              icon={CheckCircle}
              color="text-blue-600"
            />
            <MetricCard
              title="Pembayaran Sukses"
              value={metrics.successfulPayments}
              icon={TrendingUp}
              color="text-green-600"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <MetricCard
              title="Pelanggan"
              value={metrics.totalCustomers}
              icon={Users}
              color="text-purple-600"
            />
            <MetricCard
              title="Produk Aktif"
              value={metrics.totalProducts}
              icon={Package}
              color="text-indigo-600"
            />
            <MetricCard
              title="Pending Fulfillment"
              value={metrics.pendingFulfillment}
              icon={AlertTriangle}
              color="text-orange-600"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pembayaran</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Sukses</span>
                  <Badge className="bg-green-100 text-green-700">{metrics.successfulPayments}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Pending</span>
                  <Badge className="bg-yellow-100 text-yellow-700">{metrics.pendingPayments}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Gagal</span>
                  <Badge className="bg-red-100 text-red-700">{metrics.failedPayments}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">QRIS Fallback</span>
                  <Badge variant="outline">{metrics.qrisFallback}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
