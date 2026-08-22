import { useState, useEffect } from 'react';
import { Search, Ticket } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TicketService, type SupportTicket } from '@/lib/db';
import { toast } from 'sonner';

export function AdminTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const data = await TicketService.getAll();
      setTickets(data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Gagal memuat tiket');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'open': return 'bg-blue-100 text-blue-700';
      case 'in_progress': return 'bg-yellow-100 text-yellow-700';
      case 'resolved': return 'bg-green-100 text-green-700';
      case 'closed': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredTickets = tickets.filter(ticket => 
    ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const updateStatus = async (ticketId: string, status: SupportTicket['status']) => {
    try {
      await TicketService.updateStatus(ticketId, status);
      await fetchTickets();
      toast.success('Status tiket diperbarui');
    } catch (error) {
      toast.error('Gagal update status');
    }
  };

  return (
    <div className="p-4 pb-20">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Tiket Dukungan</h1>
        <Button variant="outline" size="sm" onClick={fetchTickets}>
          Refresh
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Cari tiket..."
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
      ) : filteredTickets.length === 0 ? (
        <div className="text-center py-8">
          <Ticket className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Tidak ada tiket</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => (
            <Card key={ticket.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedTicket(ticket); setShowDetailDialog(true); }}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{ticket.subject}</p>
                    <p className="text-sm text-gray-500">{ticket.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString('id-ID') : '-'}
                    </p>
                  </div>
                  <Badge className={getStatusColor(ticket.status)}>
                    {ticket.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Detail Tiket</DialogTitle>
          </DialogHeader>
          
          {selectedTicket && (
            <div className="space-y-4 mt-4">
              <div>
                <p className="text-sm text-gray-600">Subjek</p>
                <p>{selectedTicket.subject}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email Pelanggan</p>
                <p>{selectedTicket.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Kategori</p>
                <p>{selectedTicket.category}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <Badge className={getStatusColor(selectedTicket.status)}>{selectedTicket.status}</Badge>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-2">Deskripsi</p>
                <pre className="bg-gray-50 p-3 rounded-lg text-sm whitespace-pre-wrap">
                  {selectedTicket.description}
                </pre>
              </div>

              {selectedTicket.response && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Respon</p>
                  <pre className="bg-gray-50 p-3 rounded-lg text-sm whitespace-pre-wrap">
                    {selectedTicket.response}
                  </pre>
                </div>
              )}

              <div className="flex gap-2">
                <Button size="sm" onClick={() => updateStatus(selectedTicket.id, 'in_progress')}>
                  In Progress
                </Button>
                <Button size="sm" onClick={() => updateStatus(selectedTicket.id, 'resolved')}>
                  Resolved
                </Button>
                <Button size="sm" onClick={() => updateStatus(selectedTicket.id, 'closed')} variant="destructive">
                  Closed
                </Button>
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
