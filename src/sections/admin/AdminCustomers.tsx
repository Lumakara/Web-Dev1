import { useState, useEffect } from 'react';
import { Search, Users, UserX, Mail, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { UserService, type UserProfile } from '@/lib/db';
import { toast } from 'sonner';

export function AdminCustomers() {
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<UserProfile | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const data = await UserService.getAll();
      const nonAdmins = data.filter((c: UserProfile) => 
        c.role !== 'super_admin' && c.role !== 'manager' && c.role !== 'admin' && c.role !== 'moderator'
      );
      setCustomers(nonAdmins);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Gagal memuat pelanggan');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchCustomers(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filteredCustomers = customers.filter(customer => 
    customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (customer.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const handleDeactivate = async (customer: UserProfile) => {
    try {
      await UserService.updateProfile(customer.id, { is_active: !customer.is_active });
      await fetchCustomers();
      toast.success(`Pelanggan ${!customer.is_active ? 'diaktifkan' : 'dinonaktifkan'} berhasil`);
    } catch {
      toast.error('Gagal update status');
    }
  };

  const openDetail = async (customer: UserProfile) => {
    setSelectedCustomer(customer);
    setShowDetailDialog(true);
  };

  return (
    <div className="p-4 pb-20">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Pelanggan</h1>
        <Button variant="outline" size="sm" onClick={fetchCustomers}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Cari pelanggan..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Tidak ada pelanggan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex justify-between items-start">
                <div onClick={() => openDetail(customer)}>
                  <p className="font-medium">{customer.full_name || customer.email}</p>
                  <p className="text-sm text-gray-500">{customer.email}</p>
                  <Badge variant={customer.is_active ? "default" : "secondary"} className="mt-1">
                    {customer.is_active ? 'Aktif' : 'Non-aktif'}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeactivate(customer); }}
                    className={`p-2 hover:bg-gray-100 rounded-lg ${customer.is_active ? 'text-orange-600' : 'text-green-600'}`}
                  >
                    {customer.is_active ? <UserX className="h-4 w-4" /> : <UserX className="h-4 w-4 rotate-45" />}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Pelanggan</DialogTitle>
          </DialogHeader>
          
          {selectedCustomer && (
            <div className="space-y-4 mt-4">
              <div>
                <p className="text-sm text-gray-600">Nama</p>
                <p>{selectedCustomer.full_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="flex items-center gap-2">
                  {selectedCustomer.email}
                  <Mail className="h-3 w-3 text-gray-400" />
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Role</p>
                <Badge>{selectedCustomer.role}</Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <Badge variant={selectedCustomer.is_active ? "default" : "secondary"}>
                  {selectedCustomer.is_active ? 'Aktif' : 'Non-aktif'}
                </Badge>
              </div>
              <Button variant="outline" className="w-full" onClick={() => setShowDetailDialog(false)}>
                Tutup
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
