import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Search, UserX, UserCheck } from 'lucide-react';

interface Profile {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

const roleBadgeColor: Record<string, string> = {
  super_admin: 'bg-red-500/10 text-red-400 border-red-500/20',
  admin: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  manager: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  moderator: 'bg-green-500/10 text-green-400 border-green-500/20',
  customer: 'bg-muted text-muted-foreground',
};

export function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, email, full_name, role, is_active, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) toast.error('Gagal memuat user');
    else setUsers(data ?? []);
    setLoading(false);
  };

  const toggleActive = async (userId: string, current: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !current })
      .eq('user_id', userId);
    if (error) { toast.error('Gagal update status'); return; }
    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, is_active: !current } : u));
    toast.success(current ? 'User dinonaktifkan' : 'User diaktifkan');
  };

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari email atau nama..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length} user</span>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Memuat...</div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Bergabung</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(u => (
                <TableRow key={u.user_id}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-sm">{u.full_name || '—'}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${roleBadgeColor[u.role] ?? roleBadgeColor.customer}`}>
                      {u.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.is_active ? 'default' : 'secondary'}>
                      {u.is_active ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString('id-ID')}
                  </TableCell>
                  <TableCell className="text-right">
                    {u.role !== 'super_admin' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleActive(u.user_id, u.is_active)}
                        className="h-7 px-2"
                      >
                        {u.is_active
                          ? <><UserX className="w-3.5 h-3.5 mr-1" /> Ban</>
                          : <><UserCheck className="w-3.5 h-3.5 mr-1" /> Aktifkan</>
                        }
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
