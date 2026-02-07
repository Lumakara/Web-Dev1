import { useState, useEffect } from 'react';
import { 
  User, 
  Package, 
  LogOut, 
  Edit2, 
  Camera, 
  Check, 
  X, 
  Mail, 
  Settings,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Music,
  Volume1,
  Globe,
  Bell,
  ChevronRight,
  Phone,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/store/appStore';
import { OrderService, UserService } from '@/lib/firebase-db';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Order } from '@/lib/firebase-db';
import { Link } from 'react-router-dom';
import { audioService } from '@/lib/audio';
import { toast } from 'sonner';

export function ProfileSection() {
  const { 
    user, 
    profile, 
    isAuthenticated, 
    setProfile,
    isDarkMode, 
    toggleDarkMode, 
    soundEnabled, 
    toggleSound,
    musicEnabled,
    toggleMusic,
  } = useAppStore();
  
  const { signOut, updateProfile: updateAuthProfile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [volume, setVolume] = useState(audioService.getMasterVolume() * 100);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [language] = useState<'id' | 'en'>('id');
  const [isVisible, setIsVisible] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    if (user?.uid) {
      fetchOrders();
    }
  }, [user?.uid]);

  // Initialize form when profile changes
  useEffect(() => {
    if (profile) {
      setEditForm({
        full_name: profile.full_name || user?.displayName || '',
        phone: profile.phone || '',
        address: profile.address || '',
      });
    } else if (user) {
      setEditForm({
        full_name: user.displayName || '',
        phone: '',
        address: '',
      });
    }
  }, [profile, user]);

  const fetchOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const userOrders = await OrderService.getByUser(user!.uid);
      setOrders(userOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleLogout = async () => {
    audioService.playClick();
    await signOut();
  };

  const handleSaveProfile = async () => {
    if (!user?.uid) return;
    
    setIsSaving(true);
    audioService.playClick();
    
    try {
      // Update Firestore profile dengan semua field
      await UserService.updateProfile(user.uid, {
        full_name: editForm.full_name,
        phone: editForm.phone,
        address: editForm.address,
      });
      
      // Update Firebase Auth profile
      await updateAuthProfile({
        displayName: editForm.full_name,
      });
      
      // Update local state
      setProfile({
        ...profile!,
        full_name: editForm.full_name,
        phone: editForm.phone,
        address: editForm.address,
      });
      
      audioService.playSuccess();
      toast.success('Profil berhasil diperbarui!');
      setShowEditDialog(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Gagal memperbarui profil: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 2MB');
      return;
    }
    
    setIsUploading(true);
    audioService.playClick();
    
    try {
      // Upload to Firebase Storage
      const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update profiles
      await UserService.updateProfile(user.uid, { avatar_url: downloadURL });
      await updateAuthProfile({ photoURL: downloadURL });
      
      // Update local state
      setProfile({
        ...profile!,
        avatar_url: downloadURL,
      });
      
      audioService.playSuccess();
      toast.success('Foto profil berhasil diperbarui!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Gagal mengupload foto');
    } finally {
      setIsUploading(false);
    }
  };

  // Settings handlers
  const handleDarkModeToggle = () => {
    audioService.playSwitch();
    toggleDarkMode();
  };

  const handleSoundToggle = () => {
    toggleSound();
    audioService.playClick();
  };

  const handleMusicToggle = () => {
    toggleMusic();
    audioService.playSuccess();
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0] / 100;
    setVolume(value[0]);
    audioService.setMasterVolume(newVolume);
  };

  const handleNotificationToggle = () => {
    setNotificationsEnabled(!notificationsEnabled);
    audioService.playSwitch();
    toast.success(notificationsEnabled ? 'Notifikasi dimatikan' : 'Notifikasi diaktifkan');
  };

  if (!isAuthenticated) {
    return (
      <div 
        className={`flex flex-col items-center justify-center min-h-[60vh] px-4 transition-all duration-500 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
        }`}
      >
        <div className="w-24 h-24 bg-gradient-to-r from-blue-100 to-orange-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
          <User className="h-12 w-12 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800">Belum Masuk</h2>
        <p className="text-gray-500 text-center mt-2 mb-6">
          Silakan masuk untuk melihat profil dan riwayat pesanan Anda
        </p>
        <Link to="/auth">
          <Button className="bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 transition-all duration-300 hover:shadow-lg hover:scale-105">
            Masuk / Daftar
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div 
      className={`pb-20 px-4 pt-4 transition-all duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Profile Header */}
      <div 
        className={`bg-gradient-to-r from-blue-600 to-orange-500 rounded-2xl p-6 text-white mb-6 relative overflow-hidden transition-all duration-500 hover:scale-[1.01] ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
        }`}
        style={{ transitionDelay: '50ms' }}
      >
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white rounded-full animate-pulse" />
          <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        <div className="relative flex items-center gap-4">
          <div className="relative group">
            <Avatar className="w-20 h-20 border-4 border-white shadow-xl transition-transform duration-300 group-hover:scale-105">
              <AvatarImage src={profile?.avatar_url || user?.photoURL || ''} />
              <AvatarFallback className="bg-white text-blue-600 text-2xl font-bold">
                {(profile?.full_name || user?.displayName || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <label 
              className={`absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg cursor-pointer transition-all duration-300 hover:scale-110 ${isUploading ? 'opacity-50' : ''}`}
            >
              {isUploading ? (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="h-4 w-4 text-gray-600" />
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
                disabled={isUploading}
              />
            </label>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate">{profile?.full_name || user?.displayName}</h2>
            <p className="text-white/80 text-sm truncate">{profile?.email || user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
                Member
              </span>
            </div>
          </div>
          <button 
            onClick={() => { audioService.playClick(); setShowEditDialog(true); }}
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-all duration-300 hover:scale-110 hover:rotate-12"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div 
        className={`grid grid-cols-3 gap-3 mb-6 transition-all duration-500 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
        }`}
        style={{ transitionDelay: '100ms' }}
      >
        {[
          { label: 'Total Pesanan', value: orders.length, color: 'text-blue-600' },
          { label: 'Selesai', value: orders.filter(o => o.status === 'completed').length, color: 'text-green-600' },
          { label: 'Diproses', value: orders.filter(o => o.status === 'pending' || o.status === 'processing').length, color: 'text-orange-600' },
        ].map((stat, index) => (
          <div
            key={stat.label}
            className="transform transition-all duration-300 hover:scale-105 hover:-translate-y-1"
            style={{ transitionDelay: `${150 + index * 50}ms` }}
          >
            <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer">
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Website Settings Card */}
      <div 
        className={`transition-all duration-500 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
        }`}
        style={{ transitionDelay: '200ms' }}
      >
        <Card className="mb-6 overflow-hidden hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600 animate-spin" style={{ animationDuration: '20s' }} />
              Pengaturan Website
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/50 hover:from-gray-100 dark:hover:from-gray-800 transition-all duration-300 hover:translate-x-1">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-orange-100 dark:bg-orange-900/30'} transition-all duration-300 hover:rotate-12 hover:scale-110`}>
                  {isDarkMode ? <Moon className="h-4 w-4 text-blue-600" /> : <Sun className="h-4 w-4 text-orange-600" />}
                </div>
                <div>
                  <p className="font-medium text-sm">Mode Gelap</p>
                  <p className="text-xs text-gray-500">{isDarkMode ? 'Aktif' : 'Nonaktif'}</p>
                </div>
              </div>
              <Switch 
                checked={isDarkMode} 
                onCheckedChange={handleDarkModeToggle}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>

            {/* Sound Effects Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/50 hover:from-gray-100 dark:hover:from-gray-800 transition-all duration-300 hover:translate-x-1">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${soundEnabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'} transition-all duration-300 hover:scale-110`}>
                  {soundEnabled ? <Volume2 className="h-4 w-4 text-green-600" /> : <VolumeX className="h-4 w-4 text-gray-400" />}
                </div>
                <div>
                  <p className="font-medium text-sm">Efek Suara</p>
                  <p className="text-xs text-gray-500">{soundEnabled ? 'Aktif' : 'Nonaktif'}</p>
                </div>
              </div>
              <Switch 
                checked={soundEnabled} 
                onCheckedChange={handleSoundToggle}
                className="data-[state=checked]:bg-green-600"
              />
            </div>

            {/* Music Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/50 hover:from-gray-100 dark:hover:from-gray-800 transition-all duration-300 hover:translate-x-1">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${musicEnabled ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-gray-100 dark:bg-gray-800'} transition-all duration-300 ${musicEnabled ? 'animate-pulse' : ''}`}>
                  <Music className={`h-4 w-4 ${musicEnabled ? 'text-purple-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className="font-medium text-sm">Musik Latar</p>
                  <p className="text-xs text-gray-500">{musicEnabled ? 'Sedang diputar' : 'Nonaktif'}</p>
                </div>
              </div>
              <Switch 
                checked={musicEnabled} 
                onCheckedChange={handleMusicToggle}
                className="data-[state=checked]:bg-purple-600"
              />
            </div>

            {/* Volume Slider */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Volume1 className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Volume</span>
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {volume}%
                </span>
              </div>
              <Slider
                value={[volume]}
                onValueChange={handleVolumeChange}
                max={100}
                step={5}
                className="w-full"
              />
            </div>

            {/* Language Selector (Placeholder) */}
            <div 
              className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/50 hover:from-gray-100 dark:hover:from-gray-800 transition-all duration-300 hover:translate-x-1 cursor-pointer group"
              onClick={() => toast.info('Fitur bahasa akan segera hadir!')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 transition-transform duration-300 group-hover:rotate-180">
                  <Globe className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Bahasa</p>
                  <p className="text-xs text-gray-500">{language === 'id' ? 'Bahasa Indonesia' : 'English'}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 transition-transform duration-300 group-hover:translate-x-1" />
            </div>

            {/* Notification Preferences */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/50 hover:from-gray-100 dark:hover:from-gray-800 transition-all duration-300 hover:translate-x-1">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${notificationsEnabled ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800'} transition-all duration-300 ${notificationsEnabled ? 'animate-bounce' : ''}`} style={{ animationDuration: '2s' }}>
                  <Bell className={`h-4 w-4 ${notificationsEnabled ? 'text-red-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className="font-medium text-sm">Notifikasi</p>
                  <p className="text-xs text-gray-500">{notificationsEnabled ? 'Aktif' : 'Nonaktif'}</p>
                </div>
              </div>
              <Switch 
                checked={notificationsEnabled} 
                onCheckedChange={handleNotificationToggle}
                className="data-[state=checked]:bg-red-500"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pesanan Saya */}
      <div 
        className={`transition-all duration-500 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
        }`}
        style={{ transitionDelay: '250ms' }}
      >
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-600 transition-transform duration-300 hover:rotate-12" />
          Pesanan Saya
        </h3>
        
        {isLoadingOrders ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div 
                key={i} 
                className="h-24 bg-gray-100 rounded-lg animate-pulse" 
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <Card className="hover:shadow-md transition-all duration-300">
            <CardContent className="p-8 text-center">
              <div className="animate-bounce" style={{ animationDuration: '2s' }}>
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              </div>
              <p className="text-gray-500">Belum ada pesanan</p>
              <Link to="/">
                <Button variant="outline" className="mt-3 hover:scale-105 transition-transform duration-300">
                  Mulai Berbelanja
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {orders.map((order, index) => (
              <div
                key={order.id}
                className={`transition-all duration-500 ${
                  isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-5'
                }`}
                style={{ transitionDelay: `${300 + index * 50}ms` }}
              >
                <OrderCard order={order} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logout Button */}
      <div 
        className={`transition-all duration-500 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
        }`}
        style={{ transitionDelay: '350ms' }}
      >
        <Button 
          variant="outline" 
          className="w-full mt-6 text-red-600 border-red-200 hover:bg-red-50 transition-all duration-300 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Keluar
        </Button>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-4 w-4" />
              Edit Profil
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Nama Lengkap
              </Label>
              <Input
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                placeholder="Masukkan nama lengkap"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                value={profile?.email || user?.email || ''}
                disabled
                className="bg-gray-100"
              />
              <p className="text-xs text-gray-500">Email tidak dapat diubah</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Nomor Telepon
              </Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="Contoh: 081234567890"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Alamat
              </Label>
              <Input
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                placeholder="Masukkan alamat lengkap"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 hover:scale-105 transition-transform duration-300"
                onClick={() => setShowEditDialog(false)}
              >
                <X className="h-4 w-4 mr-1" />
                Batal
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 hover:scale-105 transition-all duration-300"
                onClick={handleSaveProfile}
                disabled={isSaving || !editForm.full_name.trim()}
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    paid: 'bg-blue-100 text-blue-700 border-blue-200',
    processing: 'bg-purple-100 text-purple-700 border-purple-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Menunggu',
    paid: 'Dibayar',
    processing: 'Diproses',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
  };

  return (
    <div className="transform transition-all duration-300 hover:scale-[1.02]">
      <Card className="hover:shadow-md transition-all duration-300 cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm font-medium text-gray-900">#{order.id.slice(0, 8)}</p>
              <p className="text-xs text-gray-500">
                {order.created_at ? new Date(order.created_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                }) : '-'}
              </p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full border ${statusColors[order.status]}`}>
              {statusLabels[order.status]}
            </span>
          </div>
          
          <div className="space-y-1 mb-3">
            {order.items.slice(0, 2).map((item, idx) => (
              <p key={idx} className="text-sm text-gray-600 truncate">
                {item.title} ({item.tier}) x{item.quantity}
              </p>
            ))}
            {order.items.length > 2 && (
              <p className="text-xs text-gray-500">+{order.items.length - 2} item lainnya</p>
            )}
          </div>
          
          <div className="flex justify-between items-center pt-2 border-t">
            <p className="text-sm text-gray-500">Total</p>
            <p className="font-bold text-blue-600 hover:scale-105 transition-transform duration-300 inline-block">
              Rp {order.total_amount.toLocaleString('id-ID')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ProfileSection;
