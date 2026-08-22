import { useState, useEffect } from 'react';
import { Search, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AuditLog {
  id: string;
  admin_id: string;
  admin_email: string;
  action: string;
  resource: string;
  resource_id?: string;
  details?: any;
  before_data?: any;
  after_data?: any;
  created_at: string;
}

export function AdminAuditLog() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Gagal memuat audit log');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.admin_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold mb-4">Audit Log</h1>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Cari log..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Tidak ada audit log</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <Card key={log.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{log.action}</p>
                    <p className="text-sm text-gray-500">{log.resource} {log.resource_id && `#${log.resource_id.slice(0, 8)}`}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      by {log.admin_email} • {new Date(log.created_at).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <Badge variant="outline">{log.action}</Badge>
                </div>
                {log.details && (
                  <pre className="bg-gray-50 p-2 rounded-lg text-xs mt-2 overflow-auto max-h-32">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
