import { useState, useEffect } from 'react';
import { TrendingUp, ShoppingBag, Package, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProducts } from '@/hooks/useProducts';
import { OrderService, TicketService } from '@/lib/firebase-db';
import type { Order, SupportTicket } from '@/lib/firebase-db';

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalTickets: number;
  pendingOrders: number;
  completedOrders: number;
  revenueChange: number;
  ordersChange: number;
}

export function AdminDashboard() {
  const { products } = useProducts();
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalTickets: 0,
    pendingOrders: 0,
    completedOrders: 0,
    revenueChange: 12.5,
    ordersChange: 8.3,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [recentTickets, setRecentTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [orders, tickets] = await Promise.all([
        OrderService.getAll(),
        TicketService.getAll(),
      ]);

      const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
      const pendingOrders = orders.filter(o => o.status === 'pending').length;
      const completedOrders = orders.filter(o => o.status === 'completed').length;

      setStats({
        totalRevenue,
        totalOrders: orders.length,
        totalProducts: products.length,
        totalTickets: tickets.length,
        pendingOrders,
        completedOrders,
        revenueChange: 12.5,
        ordersChange: 8.3,
      });

      setRecentOrders(orders.slice(0, 5));
      setRecentTickets(tickets.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Pendapatan',
      value: `Rp ${stats.totalRevenue.toLocaleString('id-ID')}`,
      change: `+${stats.revenueChange}%`,
      trend: 'up',
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      title: 'Total Pesanan',
      value: stats.totalOrders.toString(),
      change: `+${stats.ordersChange}%`,
      trend: 'up',
      icon: ShoppingBag,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Produk',
      value: stats.totalProducts.toString(),
      change: '0%',
      trend: 'neutral',
      icon: Package,
      color: 'bg-purple-500',
    },
    {
      title: 'Tiket Dukungan',
      value: stats.totalTickets.toString(),
      change: 'Open',
      trend: 'neutral',
      icon: TrendingUp,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">Dashboard Admin</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
                <div className={`flex items-center text-xs ${stat.trend === 'up' ? 'text-green-600' : 'text-gray-500'}`}>
                  {stat.trend === 'up' && <ArrowUpRight className="h-3 w-3 mr-0.5" />}
                  {stat.change}
                </div>
              </div>
              <p className="text-2xl font-bold mt-3">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Order Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Status Pesanan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</p>
              <p className="text-sm text-yellow-700">Menunggu</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{stats.completedOrders}</p>
              <p className="text-sm text-green-700">Selesai</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Pesanan Terbaru</CardTitle>
          <button className="text-sm text-blue-600 hover:underline">Lihat Semua</button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <p className="text-center text-gray-500 py-4">Belum ada pesanan</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div 
                  key={order.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">#{order.id.slice(0, 8)}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.created_at || '').toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">
                      Rp {order.total_amount.toLocaleString('id-ID')}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      order.status === 'completed' ? 'bg-green-100 text-green-700' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Tickets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Tiket Dukungan Terbaru</CardTitle>
          <button className="text-sm text-blue-600 hover:underline">Lihat Semua</button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : recentTickets.length === 0 ? (
            <p className="text-center text-gray-500 py-4">Belum ada tiket</p>
          ) : (
            <div className="space-y-3">
              {recentTickets.map((ticket) => (
                <div 
                  key={ticket.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm truncate max-w-[150px]">{ticket.subject}</p>
                    <p className="text-xs text-gray-500">{ticket.category}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    ticket.status === 'open' ? 'bg-yellow-100 text-yellow-700' :
                    ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {ticket.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
