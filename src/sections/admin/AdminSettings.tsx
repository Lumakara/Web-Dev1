import { useState, useEffect } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function AdminSettings() {
  const [settings, setSettings] = useState({
    site_name: '',
    email_support: '',
    currency: 'IDR',
    timezone: 'Asia/Jakarta',
    maintenance_mode: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .limit(10);
    
    if (!error && data) {
      setSettings(prev => ({
        ...prev,
        site_name: (data.find((s: any) => s.key === 'site_name')?.value || ''),
        email_support: (data.find((s: any) => s.key === 'email_support')?.value || ''),
        currency: (data.find((s: any) => s.key === 'currency')?.value || 'IDR'),
        timezone: (data.find((s: any) => s.key === 'timezone')?.value || 'Asia/Jakarta'),
      }));
    }
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      for (const [key, value] of Object.entries(settings)) {
        await supabase
          .from('settings')
          .upsert({ key, value, updated_at: new Date().toISOString() })
          .eq('key', key);
      }
      toast.success('Pengaturan disimpan');
      await fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold mb-4">Pengaturan</h1>

      <Card>
        <CardHeader>
          <CardTitle>Pengaturan Aplikasi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nama Situs</Label>
              <Input 
                value={settings.site_name} 
                onChange={(e) => setSettings(s => ({ ...s, site_name: e.target.value }))} 
              />
            </div>
            <div className="space-y-2">
              <Label>Email Dukungan</Label>
              <Input 
                type="email"
                value={settings.email_support} 
                onChange={(e) => setSettings(s => ({ ...s, email_support: e.target.value }))} 
              />
            </div>
            <div className="space-y-2">
              <Label>Mata Uang</Label>
              <Select 
                value={settings.currency || "IDR"}
                onValueChange={(val) => setSettings(s => ({ ...s, currency: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IDR">IDR - Rupiah</SelectItem>
                  <SelectItem value="USD">USD - Dollar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select 
                value={settings.timezone || "Asia/Jakarta"}
                onValueChange={(val) => setSettings(s => ({ ...s, timezone: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Jakarta">Jakarta</SelectItem>
                  <SelectItem value="Asia/Singapore">Singapore</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status Server</Label>
              <Badge variant="default">Online</Badge>
            </div>
            <div className="space-y-2 flex items-end">
              <Button onClick={() => fetchSettings()} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          <Button onClick={saveSettings} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            Simpan Pengaturan
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
