import { useState, useEffect } from 'react';
import { Users, Plus, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'manager' | 'admin' | 'moderator';
  is_active: boolean;
  created_at: string;
}

export function AdminManagement() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    password: '',
    name: '',
    role: 'admin' as const,
  });

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      // Super admin can list all admin users (not customers)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['super_admin', 'manager', 'admin', 'moderator']);
      
      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast.error('Gagal memuat daftar admin');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (!newAdmin.email || !newAdmin.password || !newAdmin.name || !newAdmin.role) {
      toast.error('Semua field wajib diisi');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: {
          email: newAdmin.email,
          password: newAdmin.password,
          name: newAdmin.name,
          role: newAdmin.role,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Gagal membuat admin');

      toast.success('Admin berhasil dibuat');
      setShowCreateDialog(false);
      setNewAdmin({ email: '', password: '', name: '', role: 'admin' });
      await fetchAdmins();
    } catch (error) {
      console.error('Error creating admin:', error);
      toast.error('Gagal membuat admin: ' + (error as Error).message);
    }
  };

  const toggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from('profiles').update({ is_active: !currentStatus }).eq('user_id', userId);
      if (error) throw error;
      await fetchAdmins();
      toast.success(currentStatus ? 'Admin dinonaktifkan' : 'Admin diaktifkan');
    } catch (error) { toast.error('Gagal update status'); }
  };

  return (
    <div className="p-4 pb-20">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Manajemen Admin</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Admin
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : admins.length === 0 ? (
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Tidak ada admin</p>
        </div>
      ) : (
        <div className="space-y-3">
          {admins.map((admin) => (
            <Card key={admin.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{admin.full_name}</p>
                      <Badge variant="outline">{admin.role}</Badge>
                      {admin.is_active && (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{admin.email}</p>
                    <p className="text-xs text-gray-400 mt-1">Joined {new Date(admin.created_at).toLocaleDateString('id-ID')}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => toggleStatus(admin.id, admin.is_active)}>
                      {admin.is_active ? (
                        <>
                          <ShieldAlert className="h-4 w-4 mr-1" />
                          Disable
                        </>
                      ) : (
                        <>
                          <Users className="h-4 w-4 mr-1" />
                          Enable
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Admin Baru</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email"
                value={newAdmin.email}
                onChange={(e) => setNewAdmin(s => ({ ...s, email: e.target.value }))}
                placeholder="admin@example.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Password</Label>
              <Input 
                type="password"
                value={newAdmin.password}
                onChange={(e) => setNewAdmin(s => ({ ...s, password: e.target.value }))}
                placeholder="••••••••"
                minLength={6}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Nama Lengkap</Label>
              <Input 
                value={newAdmin.name}
                onChange={(e) => setNewAdmin(s => ({ ...s, name: e.target.value }))}
                placeholder="Nama Admin"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Role</Label>
              <Select 
                value={newAdmin.role}
                onValueChange={(val: any) => setNewAdmin(s => ({ ...s, role: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleCreateAdmin} className="w-full">
              Buat Admin
            </Button>

            <p className="text-xs text-gray-500 text-center">
              Admin baru akan mendapatkan akses ke dashboard berdasarkan role yang dipilih
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
