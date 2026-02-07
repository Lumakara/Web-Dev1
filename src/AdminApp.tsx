import { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, Package, ShoppingCart, LogOut, Menu,
  AlertCircle, DollarSign, Plus, Edit3, Trash2,
  Check, RefreshCw, Moon, Sun, BarChart3,
  Lock, Eye, EyeOff, X, Shield, FileJson, Info,
  Save, Download, Search, Clock, Star,
  FileText, Users, ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


import { useProducts } from '@/hooks/useProducts';
import { OrderService, TicketService, type Order } from '@/lib/firebase-db';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

// Import new admin auth system
import {
  loginAdmin,
  logoutAdmin,
  checkPermission,
  logActivity,
  validateSession,
  extendSession,
  getCurrentAdmin,
  type AdminRole,
  type AdminPermission,
  ROLE_DESCRIPTIONS,
  PERMISSION_DESCRIPTIONS,
} from '@/lib/admin-auth';

// Import security utilities
import {
  generateCSRFToken,
  executeRecaptcha,
} from '@/lib/security';

// Import products data
import productsData from '@/data/products.json';

// Local product type (matches the JSON structure)
interface LocalProduct {
  id: string;
  title: string;
  category: 'installation' | 'creative' | 'technical';
  base_price: number;
  discount_price?: number;
  stock: number;
  image: string;
  icon: string;
  rating: number;
  reviews: number;
  duration: string;
  description: string;
  tags: string[];
  tiers: { name: string; price: number; features: string[] }[];
  related: string[];
}

// Admin Activity type
interface AdminActivity {
  id: string;
  adminId: string;
  adminName: string;
  adminEmail: string;
  action: string;
  resource: string;
  details?: string;
  timestamp: string;
}

function AdminApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null);
  const [adminName, setAdminName] = useState('');

  // Check if already logged in on mount
  useEffect(() => {
    const checkSession = () => {
      if (validateSession()) {
        const admin = getCurrentAdmin();
        if (admin) {
          setIsLoggedIn(true);
          setAdminRole(admin.role);
          setAdminName(admin.name);
          extendSession();
        }
      }
    };

    checkSession();

    // Initialize CSRF token
    generateCSRFToken();

    // Check for saved theme
    const savedTheme = localStorage.getItem('admin_dark_mode');
    if (savedTheme === 'true') setIsDarkMode(true);

    // Session extension interval
    const interval = setInterval(() => {
      if (validateSession()) {
        extendSession();
      } else {
        handleLogout();
      }
    }, 5 * 60 * 1000); // Extend every 5 minutes

    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);

    try {
      // Execute reCAPTCHA if available
      try {
        await executeRecaptcha('admin_login');
      } catch {
        // reCAPTCHA not configured, continue without it
      }

      // Simulate API delay for security
      await new Promise((resolve) => setTimeout(resolve, 800));

      const result = await loginAdmin(loginEmail, loginPassword);

      if (result.success && result.admin) {
        setIsLoggedIn(true);
        setAdminRole(result.admin.role);
        setAdminName(result.admin.name);
        toast.success(`Login berhasil! Selamat datang ${result.admin.name}`);
      } else {
        setLoginError(result.message);
      }
    } catch (error) {
      setLoginError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    const admin = getCurrentAdmin();
    if (admin) {
      await logoutAdmin(admin.id);
    }
    setIsLoggedIn(false);
    setAdminRole(null);
    setAdminName('');
    setLoginEmail('');
    setLoginPassword('');
    toast.success('Logout berhasil');
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    localStorage.setItem('admin_dark_mode', (!isDarkMode).toString());
  };

  // Permission check helper
  const hasPermission = (permission: AdminPermission): boolean => {
    if (!adminRole) return false;
    if (adminRole === 'super_admin') return true;
    const permissions = JSON.parse(sessionStorage.getItem('admin_permissions') || '[]');
    return checkPermission(permissions, permission);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-orange-500 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/20" />
        <Card className="w-full max-w-md relative z-10 shadow-2xl">
          <CardHeader className="text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Shield className="h-10 w-10 text-white" />
            </div>
            <CardTitle className="text-2xl">Admin Login</CardTitle>
            <p className="text-gray-500">Layanan Digital Dashboard</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {loginError}
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Email Admin</Label>
                <Input
                  type="email"
                  placeholder="admin@lumakara.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600"
                disabled={isLoading}
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Lock className="h-4 w-4 mr-2" />
                )}
                {isLoading ? 'Memverifikasi...' : 'Masuk'}
              </Button>
            </form>
            
            <div className="mt-4 text-center">
              <a href="/" className="text-sm text-blue-600 hover:underline">
                ← Kembali ke Website
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardContent isDarkMode={isDarkMode} />;
      case 'products':
        return hasPermission('products:view') ? (
          <ProductsContent isDarkMode={isDarkMode} />
        ) : (
          <PermissionDenied />
        );
      case 'orders':
        return hasPermission('orders:view') ? (
          <OrdersContent _isDarkMode={isDarkMode} />
        ) : (
          <PermissionDenied />
        );
      case 'tickets':
        return hasPermission('tickets:view') ? (
          <TicketsContent _isDarkMode={isDarkMode} />
        ) : (
          <PermissionDenied />
        );
      case 'analytics':
        return hasPermission('analytics:view') ? (
          <AnalyticsContent _isDarkMode={isDarkMode} />
        ) : (
          <PermissionDenied />
        );
      case 'admins':
        return hasPermission('admins:view') ? (
          <AdminsContent isDarkMode={isDarkMode} />
        ) : (
          <PermissionDenied />
        );
      case 'activity':
        return <ActivityLogContent isDarkMode={isDarkMode} />;
      case 'documentation':
        return <DocumentationContent isDarkMode={isDarkMode} />;
      default:
        return <DashboardContent isDarkMode={isDarkMode} />;
    }
  };

  // Menu items with permission checks
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: null },
    { id: 'products', label: 'Produk', icon: Package, permission: 'products:view' as AdminPermission },
    { id: 'orders', label: 'Pesanan', icon: ShoppingCart, permission: 'orders:view' as AdminPermission },
    { id: 'tickets', label: 'Tiket', icon: AlertCircle, permission: 'tickets:view' as AdminPermission },
    { id: 'analytics', label: 'Analitik', icon: BarChart3, permission: 'analytics:view' as AdminPermission },
    { id: 'admins', label: 'Admin', icon: Users, permission: 'admins:view' as AdminPermission },
    { id: 'activity', label: 'Aktivitas', icon: Clock, permission: null },
    { id: 'documentation', label: 'Dokumentasi', icon: FileText, permission: null },
  ].filter(item => !item.permission || hasPermission(item.permission));

  const bgClass = isDarkMode ? 'bg-gray-900' : 'bg-gray-50';
  const sidebarClass = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white';
  const textClass = isDarkMode ? 'text-white' : 'text-gray-900';

  return (
    <div className={`min-h-screen ${bgClass} flex`}>
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 ${sidebarClass} shadow-lg transform transition-transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:static border-r`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-orange-500 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className={`font-bold ${textClass}`}>Admin Panel</h2>
              <p className="text-xs text-gray-500">Layanan Digital</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeTab === item.id
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md'
                    : isDarkMode
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="mb-3 px-4">
            <p className={`text-sm font-medium ${textClass}`}>{adminName}</p>
            <Badge variant="outline" className="text-xs mt-1">
              {adminRole}
            </Badge>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">
        {/* Header */}
        <header className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-sm p-4 flex items-center justify-between border-b`}>
          <button
            onClick={() => setSidebarOpen(true)}
            className={`lg:hidden p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Real-time
            </div>
            <button 
              onClick={toggleDarkMode}
              className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700 text-yellow-400' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-orange-500 rounded-full flex items-center justify-center">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {adminName}
                </span>
                <p className="text-xs text-gray-400">{adminRole}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-4 lg:p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

// Permission Denied Component
function PermissionDenied() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <ShieldAlert className="h-16 w-16 text-red-500 mb-4" />
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Akses Ditolak</h2>
      <p className="text-gray-500 mt-2">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
    </div>
  );
}

// Dashboard Content with Real-time
function DashboardContent({ isDarkMode }: { isDarkMode: boolean }) {
  const { products } = useProducts();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalTickets: 0,
    pendingOrders: 0,
    completedOrders: 0,
    todayOrders: 0,
    newTickets: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [orders, tickets] = await Promise.all([
        OrderService.getAll(),
        TicketService.getAll(),
      ]);

      const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
      const pendingOrders = orders.filter(o => o.status === 'pending').length;
      const completedOrders = orders.filter(o => o.status === 'completed').length;
      const todayOrders = orders.filter(o => {
        const orderDate = new Date(o.created_at || '');
        const today = new Date();
        return orderDate.toDateString() === today.toDateString();
      }).length;
      const newTickets = tickets.filter(t => t.status === 'open').length;

      setStats({
        totalRevenue,
        totalOrders: orders.length,
        totalProducts: products.length,
        totalTickets: tickets.length,
        pendingOrders,
        completedOrders,
        todayOrders,
        newTickets,
      });

      setRecentOrders(orders.slice(0, 5));
      setLastUpdate(new Date());

      // Generate chart data
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date;
      });

      const chartData = last7Days.map(date => {
        const dayOrders = orders.filter(o => {
          const orderDate = new Date(o.created_at || '');
          return orderDate.toDateString() === date.toDateString();
        });
        return {
          name: date.toLocaleDateString('id-ID', { weekday: 'short' }),
          orders: dayOrders.length,
          revenue: dayOrders.reduce((sum, o) => sum + o.total_amount, 0),
        };
      });
      setChartData(chartData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [products.length]);

  useEffect(() => {
    fetchDashboardData();
    
    // Real-time updates every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const statCards = [
    { title: 'Total Pendapatan', value: `Rp ${stats.totalRevenue.toLocaleString('id-ID')}`, icon: DollarSign, color: 'from-green-500 to-emerald-500', change: '+12%' },
    { title: 'Total Pesanan', value: stats.totalOrders.toString(), icon: ShoppingCart, color: 'from-blue-500 to-cyan-500', change: '+5%' },
    { title: 'Produk', value: stats.totalProducts.toString(), icon: Package, color: 'from-purple-500 to-violet-500', change: '0%' },
    { title: 'Tiket Baru', value: stats.newTickets.toString(), icon: AlertCircle, color: 'from-orange-500 to-red-500', change: stats.newTickets > 0 ? '!' : '' },
  ];

  const bgCard = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white';
  const textClass = isDarkMode ? 'text-white' : 'text-gray-900';
  const subTextClass = isDarkMode ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${textClass}`}>Dashboard</h1>
          <p className={subTextClass}>Update terakhir: {lastUpdate.toLocaleTimeString('id-ID')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDashboardData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className={`${bgCard} overflow-hidden hover:shadow-lg transition-shadow`}>
            <CardContent className="p-4">
              <div className={`w-10 h-10 bg-gradient-to-r ${stat.color} rounded-lg flex items-center justify-center mb-3`}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
              <p className={`text-2xl font-bold ${textClass}`}>{stat.value}</p>
              <div className="flex items-center justify-between">
                <p className={`text-sm ${subTextClass}`}>{stat.title}</p>
                {stat.change && stat.change !== '0%' && (
                  <span className={`text-xs ${stat.change.includes('+') ? 'text-green-500' : stat.change === '!' ? 'text-red-500' : 'text-gray-500'}`}>
                    {stat.change}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className={bgCard}>
          <CardHeader>
            <CardTitle className={textClass}>Grafik Pesanan 7 Hari Terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                <XAxis dataKey="name" stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1f2937' : '#fff', border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`, borderRadius: '8px' }} />
                <Line type="monotone" dataKey="orders" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className={bgCard}>
          <CardHeader>
            <CardTitle className={textClass}>Pendapatan 7 Hari Terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                <XAxis dataKey="name" stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1f2937' : '#fff', border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`, borderRadius: '8px' }} />
                <Bar dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card className={bgCard}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className={textClass}>Pesanan Terbaru</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => {}}>Lihat Semua</Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`h-12 rounded animate-pulse ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`} />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <p className={`text-center py-4 ${subTextClass}`}>Belum ada pesanan</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className={`flex items-center justify-between p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <div>
                    <p className={`font-medium text-sm ${textClass}`}>#{order.id.slice(0, 8)}</p>
                    <p className={`text-xs ${subTextClass}`}>
                      {new Date(order.created_at || '').toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-sm ${textClass}`}>
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
    </div>
  );
}

// ProductsContent with permission checks
function ProductsContent({ isDarkMode }: { isDarkMode: boolean }) {
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<LocalProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const admin = getCurrentAdmin();
  
  const [formData, setFormData] = useState<Partial<LocalProduct>>({
    title: '',
    category: 'installation',
    base_price: 0,
    stock: 0,
    image: '',
    icon: '',
    rating: 4.5,
    reviews: 0,
    duration: '',
    description: '',
    tags: [],
    tiers: [{ name: 'Basic', price: 0, features: [] }],
    related: [],
  });

  // Check permissions
  const canCreate = admin?.role === 'super_admin' || checkPermission(
    JSON.parse(sessionStorage.getItem('admin_permissions') || '[]'),
    'products:create'
  );
  const canEdit = admin?.role === 'super_admin' || checkPermission(
    JSON.parse(sessionStorage.getItem('admin_permissions') || '[]'),
    'products:edit'
  );
  const canDelete = admin?.role === 'super_admin' || checkPermission(
    JSON.parse(sessionStorage.getItem('admin_permissions') || '[]'),
    'products:delete'
  );

  // Load products from JSON file
  useEffect(() => {
    setIsLoading(true);
    try {
      setProducts(productsData.products as LocalProduct[]);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Gagal memuat data produk');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Filter products
  const filteredProducts = products.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = async () => {
    try {
      if (!formData.title || !formData.base_price) {
        toast.error('Nama produk dan harga wajib diisi');
        return;
      }

      if (editingProduct) {
        // Update existing product
        const updated = products.map(p => 
          p.id === editingProduct.id 
            ? { ...p, ...formData, id: editingProduct.id } as LocalProduct
            : p
        );
        setProducts(updated);
        toast.success('Produk berhasil diupdate!');
        
        // Log activity
        await logActivity({
          adminId: admin?.id || '',
          adminName: admin?.name || '',
          adminEmail: admin?.email || '',
          action: 'UPDATE',
          resource: 'products',
          details: `Updated product: ${editingProduct.title}`,
        });
      } else {
        // Create new product
        const newProduct: LocalProduct = {
          ...formData as LocalProduct,
          id: Date.now().toString(),
        };
        setProducts([...products, newProduct]);
        toast.success('Produk berhasil ditambahkan!');
        
        // Log activity
        await logActivity({
          adminId: admin?.id || '',
          adminName: admin?.name || '',
          adminEmail: admin?.email || '',
          action: 'CREATE',
          resource: 'products',
          details: `Created product: ${newProduct.title}`,
        });
      }
      
      setShowProductDialog(false);
      setEditingProduct(null);
      
      toast.info('Data disimpan sementara. Export ke JSON untuk menyimpan permanen.', {
        duration: 5000,
      });
    } catch (error) {
      toast.error('Gagal menyimpan produk');
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) {
      toast.error('Anda tidak memiliki izin untuk menghapus produk');
      return;
    }
    
    if (confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
      const product = products.find(p => p.id === id);
      setProducts(products.filter(p => p.id !== id));
      toast.success('Produk berhasil dihapus!');
      
      // Log activity
      if (product) {
        await logActivity({
          adminId: admin?.id || '',
          adminName: admin?.name || '',
          adminEmail: admin?.email || '',
          action: 'DELETE',
          resource: 'products',
          details: `Deleted product: ${product.title}`,
        });
      }
    }
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify({ products }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'products.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('File JSON berhasil diunduh!');
  };

  const resetForm = () => {
    setFormData({
      title: '',
      category: 'installation',
      base_price: 0,
      stock: 0,
      image: '',
      icon: '',
      rating: 4.5,
      reviews: 0,
      duration: '',
      description: '',
      tags: [],
      tiers: [{ name: 'Basic', price: 0, features: [] }],
      related: [],
    });
    setEditingProduct(null);
  };

  const bgCard = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white';
  const textClass = isDarkMode ? 'text-white' : 'text-gray-900';
  const subTextClass = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const inputClass = isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : '';

  return (
    <div className="space-y-6">
      {/* Header with instructions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${textClass}`}>Kelola Produk</h1>
          <p className={subTextClass}>Data produk disimpan di: src/data/products.json</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportJSON}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          {canCreate && (
            <Button onClick={() => { resetForm(); setShowProductDialog(true); }} className="bg-blue-600">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Produk
            </Button>
          )}
        </div>
      </div>

      {/* Permission Badge */}
      <div className="flex gap-2">
        <Badge variant={canCreate ? "default" : "secondary"}>Create: {canCreate ? 'Yes' : 'No'}</Badge>
        <Badge variant={canEdit ? "default" : "secondary"}>Edit: {canEdit ? 'Yes' : 'No'}</Badge>
        <Badge variant={canDelete ? "default" : "secondary"}>Delete: {canDelete ? 'Yes' : 'No'}</Badge>
      </div>

      {/* Info Alert */}
      <Alert className={isDarkMode ? 'bg-blue-900/30 border-blue-800' : 'bg-blue-50 border-blue-200'}>
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className={textClass}>Informasi Penting</AlertTitle>
        <AlertDescription className={subTextClass}>
          Data produk sekarang disimpan di file JSON lokal (src/data/products.json), bukan di Firestore.
          Gunakan tombol "Export JSON" untuk menyimpan perubahan ke file, lalu salin isi file ke src/data/products.json.
          Fitur upload gambar telah dihapus - gunakan URL gambar eksternal (Unsplash, dll).
        </AlertDescription>
      </Alert>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Cari produk berdasarkan nama atau kategori..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`pl-10 ${inputClass}`}
        />
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-40 rounded-lg animate-pulse ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`} />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card className={bgCard}>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className={textClass}>Tidak ada produk ditemukan</p>
            <p className={subTextClass}>Coba ubah kata kunci pencarian atau tambah produk baru</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.id} className={`${bgCard} hover:shadow-lg transition-shadow`}>
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <img 
                    src={product.icon || product.image} 
                    alt={product.title} 
                    className="w-20 h-20 object-cover rounded-lg bg-gray-100" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-bold truncate ${textClass}`}>{product.title}</h3>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {product.category}
                    </Badge>
                    <p className="text-blue-600 font-bold mt-1">
                      Rp {product.base_price.toLocaleString('id-ID')}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500" />
                        {product.rating}
                      </span>
                      <span>•</span>
                      <span>Stok: {product.stock}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {canEdit && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        setEditingProduct(product);
                        setFormData(product);
                        setShowProductDialog(true);
                      }}
                    >
                      <Edit3 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                  {canDelete && (
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleDelete(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Product Form Dialog */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className={`max-w-2xl max-h-[90vh] overflow-auto ${isDarkMode ? 'bg-gray-900' : ''}`}>
          <DialogHeader>
            <DialogTitle className={textClass}>
              {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label className={textClass}>Nama Produk *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Contoh: Wi-Fi Installation Service"
                  className={inputClass}
                />
              </div>

              <div>
                <Label className={textClass}>Kategori *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v as any })}
                >
                  <SelectTrigger className={inputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="installation">Installation</SelectItem>
                    <SelectItem value="creative">Creative</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className={textClass}>Durasi Pengerjaan</Label>
                <Input
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="Contoh: 2-3 jam"
                  className={inputClass}
                />
              </div>

              <div>
                <Label className={textClass}>Harga Dasar (Rp) *</Label>
                <Input
                  type="number"
                  value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: Number(e.target.value) })}
                  className={inputClass}
                />
              </div>

              <div>
                <Label className={textClass}>Harga Diskon (Rp)</Label>
                <Input
                  type="number"
                  value={formData.discount_price || ''}
                  onChange={(e) => setFormData({ ...formData, discount_price: Number(e.target.value) || undefined })}
                  placeholder="Kosongkan jika tidak ada diskon"
                  className={inputClass}
                />
              </div>

              <div>
                <Label className={textClass}>Stok</Label>
                <Input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                  className={inputClass}
                />
              </div>

              <div>
                <Label className={textClass}>Rating (0-5)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                  className={inputClass}
                />
              </div>

              <div>
                <Label className={textClass}>Jumlah Review</Label>
                <Input
                  type="number"
                  value={formData.reviews}
                  onChange={(e) => setFormData({ ...formData, reviews: Number(e.target.value) })}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Image URLs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className={textClass}>URL Gambar Utama</Label>
                <Input
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className={inputClass}
                />
                {formData.image && (
                  <img 
                    src={formData.image} 
                    alt="Preview" 
                    className="mt-2 w-full h-32 object-cover rounded-lg" 
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
              </div>

              <div>
                <Label className={textClass}>URL Ikon Produk</Label>
                <Input
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className={inputClass}
                />
                {formData.icon && (
                  <img 
                    src={formData.icon} 
                    alt="Preview" 
                    className="mt-2 w-full h-32 object-cover rounded-lg" 
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
              </div>
            </div>

            <div>
              <Label className={textClass}>Deskripsi</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Deskripsi lengkap produk..."
                className={inputClass}
                rows={3}
              />
            </div>

            {/* Tags */}
            <div>
              <Label className={textClass}>Tags (pisahkan dengan koma)</Label>
              <Input
                value={formData.tags?.join(', ')}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) 
                })}
                placeholder="network, internet, setup"
                className={inputClass}
              />
            </div>

            {/* Tiers */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className={textClass}>Paket/Tiers</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setFormData({
                    ...formData,
                    tiers: [...(formData.tiers || []), { name: 'New Tier', price: 0, features: [] }]
                  })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Tambah Paket
                </Button>
              </div>
              <div className="space-y-2">
                {formData.tiers?.map((tier, index) => (
                  <div key={index} className={`p-3 rounded-lg border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200'}`}>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <Input
                        value={tier.name}
                        onChange={(e) => {
                          const newTiers = [...(formData.tiers || [])];
                          newTiers[index] = { ...tier, name: e.target.value };
                          setFormData({ ...formData, tiers: newTiers });
                        }}
                        placeholder="Nama paket"
                        className={inputClass}
                      />
                      <Input
                        type="number"
                        value={tier.price}
                        onChange={(e) => {
                          const newTiers = [...(formData.tiers || [])];
                          newTiers[index] = { ...tier, price: Number(e.target.value) };
                          setFormData({ ...formData, tiers: newTiers });
                        }}
                        placeholder="Harga"
                        className={inputClass}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          const newTiers = (formData.tiers || []).filter((_, i) => i !== index);
                          setFormData({ ...formData, tiers: newTiers });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      value={tier.features.join(', ')}
                      onChange={(e) => {
                        const newTiers = [...(formData.tiers || [])];
                        newTiers[index] = { 
                          ...tier, 
                          features: e.target.value.split(',').map(f => f.trim()).filter(Boolean) 
                        };
                        setFormData({ ...formData, tiers: newTiers });
                      }}
                      placeholder="Fitur (pisahkan dengan koma)"
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Related Products */}
            <div>
              <Label className={textClass}>Produk Terkait (ID produk, pisahkan dengan koma)</Label>
              <Input
                value={formData.related?.join(', ')}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  related: e.target.value.split(',').map(r => r.trim()).filter(Boolean) 
                })}
                placeholder="vps, code, wifi"
                className={inputClass}
              />
            </div>

            <Button 
              onClick={handleSave} 
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {editingProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Admins Management Content
function AdminsContent({ isDarkMode }: { isDarkMode: boolean }) {
  const bgCard = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white';
  const textClass = isDarkMode ? 'text-white' : 'text-gray-900';
  const subTextClass = isDarkMode ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${textClass}`}>Manajemen Admin</h1>
        <p className={subTextClass}>Kelola admin dan izin akses</p>
      </div>

      <Card className={bgCard}>
        <CardHeader>
          <CardTitle className={textClass}>Informasi Role</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(ROLE_DESCRIPTIONS).map(([role, description]) => (
            <div key={role} className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <Badge variant={role === 'super_admin' ? 'destructive' : role === 'admin' ? 'default' : 'secondary'}>
                  {role}
                </Badge>
              </div>
              <p className={`mt-2 ${subTextClass}`}>{description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className={bgCard}>
        <CardHeader>
          <CardTitle className={textClass}>Izin Akses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {Object.entries(PERMISSION_DESCRIPTIONS).map(([permission, description]) => (
              <div key={permission} className="flex items-center gap-2 p-2 rounded bg-gray-100 dark:bg-gray-700">
                <Check className="h-4 w-4 text-green-500" />
                <div>
                  <code className="text-xs">{permission}</code>
                  <p className={`text-xs ${subTextClass}`}>{description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Alert className={isDarkMode ? 'bg-amber-900/30 border-amber-800' : 'bg-amber-50 border-amber-200'}>
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertTitle className={textClass}>Catatan Keamanan</AlertTitle>
        <AlertDescription className={subTextClass}>
          Data admin disimpan di file JSON lokal. Untuk mengubah data admin,
          edit file src/data/admins.json dan restart aplikasi.
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Activity Log Content
function ActivityLogContent({ isDarkMode }: { isDarkMode: boolean }) {
  const [logs, setLogs] = useState<AdminActivity[]>([]);
  const admin = getCurrentAdmin();
  const bgCard = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white';
  const textClass = isDarkMode ? 'text-white' : 'text-gray-900';
  const subTextClass = isDarkMode ? 'text-gray-400' : 'text-gray-500';

  useEffect(() => {
    const stored = localStorage.getItem('admin_activity_log');
    if (stored) {
      setLogs(JSON.parse(stored));
    }
  }, []);

  const clearLogs = () => {
    if (admin?.role === 'super_admin') {
      localStorage.removeItem('admin_activity_log');
      setLogs([]);
      toast.success('Log aktivitas berhasil dihapus');
    } else {
      toast.error('Hanya super admin yang dapat menghapus log');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${textClass}`}>Log Aktivitas Admin</h1>
          <p className={subTextClass}>Riwayat aktivitas admin panel</p>
        </div>
        {admin?.role === 'super_admin' && (
          <Button variant="destructive" size="sm" onClick={clearLogs}>
            <Trash2 className="h-4 w-4 mr-2" />
            Hapus Log
          </Button>
        )}
      </div>

      <Card className={bgCard}>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className={textClass}>Belum ada aktivitas tercatat</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {logs.slice(0, 50).map((log) => (
                <div key={log.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{log.action}</Badge>
                        <span className={textClass}>{log.resource}</span>
                      </div>
                      <p className={`text-sm mt-1 ${subTextClass}`}>
                        {log.adminName} ({log.adminEmail})
                      </p>
                      {log.details && (
                        <p className={`text-sm mt-1 ${subTextClass}`}>{log.details}</p>
                      )}
                    </div>
                    <span className={`text-xs ${subTextClass}`}>
                      {new Date(log.timestamp).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Documentation Content
function DocumentationContent({ isDarkMode }: { isDarkMode: boolean }) {
  const textClass = isDarkMode ? 'text-white' : 'text-gray-900';
  const subTextClass = isDarkMode ? 'text-gray-400' : 'text-gray-600';
  const bgCard = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white';

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${textClass}`}>Dokumentasi Admin</h1>
        <p className={subTextClass}>Informasi penting tentang konfigurasi dan penyimpanan data</p>
      </div>

      {/* Admin Credentials Section */}
      <Card className={bgCard}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className={textClass}>Kredensial Admin</CardTitle>
              <CardDescription className={subTextClass}>Lokasi penyimpanan data login admin</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className={isDarkMode ? 'bg-amber-900/30 border-amber-800' : 'bg-amber-50 border-amber-200'}>
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className={textClass}>File JSON (src/data/admins.json)</AlertTitle>
            <AlertDescription className={subTextClass}>
              Kredensial admin disimpan dalam file JSON untuk keamanan.
            </AlertDescription>
          </Alert>

          <div className={`p-4 rounded-lg font-mono text-sm ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
            <p className="text-green-600"># File: src/data/admins.json</p>
            <p className="text-gray-500"># Admin dengan berbagai role</p>
            <p className="text-blue-400">super_admin: admin@lumakara.com / admin123</p>
            <p className="text-blue-400">admin: manager@lumakara.com / manager123</p>
            <p className="text-blue-400">moderator: moderator@lumakara.com / mod123</p>
          </div>

          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <h4 className={`font-semibold mb-2 ${textClass}`}>Role yang Tersedia:</h4>
            <ul className={`list-disc list-inside space-y-1 ${subTextClass}`}>
              <li><strong>super_admin</strong> - Akses penuh ke semua fitur</li>
              <li><strong>admin</strong> - Akses ke produk, pesanan, tiket, analitik</li>
              <li><strong>moderator</strong> - Akses terbatas untuk melihat dan mengedit</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Security Features */}
      <Card className={bgCard}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
              <Lock className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <CardTitle className={textClass}>Fitur Keamanan</CardTitle>
              <CardDescription className={subTextClass}>Keamanan yang diimplementasikan</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h4 className={`font-semibold mb-2 ${textClass}`}>🛡️ Multi-Admin Support</h4>
              <p className={subTextClass}>Dukungan untuk multiple admin dengan role-based access control</p>
            </div>
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h4 className={`font-semibold mb-2 ${textClass}`}>📊 Activity Logging</h4>
              <p className={subTextClass}>Semua aktivitas admin tercatat dan dapat diaudit</p>
            </div>
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h4 className={`font-semibold mb-2 ${textClass}`}>⏱️ Rate Limiting</h4>
              <p className={subTextClass}>Batasan percobaan login untuk mencegah brute force</p>
            </div>
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h4 className={`font-semibold mb-2 ${textClass}`}>🤖 reCAPTCHA v3</h4>
              <p className={subTextClass}>Proteksi bot dengan Google reCAPTCHA v3</p>
            </div>
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h4 className={`font-semibold mb-2 ${textClass}`}>🔒 CSRF Protection</h4>
              <p className={subTextClass}>Token CSRF untuk melindungi dari serangan CSRF</p>
            </div>
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h4 className={`font-semibold mb-2 ${textClass}`}>📝 XSS Prevention</h4>
              <p className={subTextClass}>Sanitasi input untuk mencegah XSS attacks</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Data Section */}
      <Card className={bgCard}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <FileJson className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle className={textClass}>Data Produk</CardTitle>
              <CardDescription className={subTextClass}>Lokasi penyimpanan data produk</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className={isDarkMode ? 'bg-green-900/30 border-green-800' : 'bg-green-50 border-green-200'}>
            <FileJson className="h-4 w-4 text-green-600" />
            <AlertTitle className={textClass}>File JSON Lokal</AlertTitle>
            <AlertDescription className={subTextClass}>
              Data produk sekarang disimpan di file JSON lokal, bukan di Firestore.
            </AlertDescription>
          </Alert>

          <div className={`p-4 rounded-lg font-mono text-sm ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
            <p className="text-green-600"># File: src/data/products.json</p>
            <p className="text-gray-500"># Struktur data:</p>
            <p className="text-blue-400">{`{`}</p>
            <p className="text-blue-400 ml-4">{`"products": [`}</p>
            <p className="text-blue-400 ml-8">{`{`}</p>
            <p className="text-purple-400 ml-12">{`"id": "wifi",`}</p>
            <p className="text-purple-400 ml-12">{`"title": "Wi-Fi Installation Service",`}</p>
            <p className="text-purple-400 ml-12">{`"category": "installation",`}</p>
            <p className="text-purple-400 ml-12">{`"base_price": 89000,`}</p>
            <p className="text-purple-400 ml-12">{`"stock": 100,`}</p>
            <p className="text-purple-400 ml-12">{`...`}</p>
            <p className="text-blue-400 ml-8">{`}`}</p>
            <p className="text-blue-400 ml-4">{`]`}</p>
            <p className="text-blue-400">{`}`}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Placeholder for other components
function OrdersContent(_props: { _isDarkMode: boolean }) {
  return <div>Orders Content</div>;
}

function TicketsContent(_props: { _isDarkMode: boolean }) {
  return <div>Tickets Content</div>;
}

function AnalyticsContent(_props: { _isDarkMode: boolean }) {
  return <div>Analytics Content</div>;
}

export default AdminApp;
