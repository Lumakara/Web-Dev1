import { useState, useCallback } from 'react';
import { TicketService, type SupportTicket } from '@/lib/firebase-db';
import { TelegramBot } from '@/lib/telegram';
import { EmailService } from '@/lib/emailjs';
import { useAppStore } from '@/store/appStore';
import { showErrorBox } from '@/lib/error-tracker';

export interface TicketFormData {
  subject: string;
  category: string;
  email: string;
  description: string;
}

export const useSupport = () => {
  const { user } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  const submitTicket = useCallback(async (formData: TicketFormData): Promise<SupportTicket> => {
    setIsSubmitting(true);
    try {
      // Create ticket in Firestore
      const ticket = await TicketService.create({
        user_id: user?.uid,
        subject: formData.subject,
        category: formData.category,
        email: formData.email,
        description: formData.description,
      });

      // Send notification to Telegram
      await TelegramBot.sendTicketNotification({
        ticketId: ticket.id,
        subject: ticket.subject,
        category: ticket.category,
        email: ticket.email,
        description: ticket.description,
        timestamp: new Date(ticket.created_at || '').toLocaleString('id-ID'),
      });

      // Send notification email to admin
      await EmailService.sendNotificationEmail(
        'admin@lumakara.com',
        'Admin',
        '🎫 Tiket Baru: ' + ticket.subject,
        `Tiket dukungan baru telah dibuat:

📋 ID: #${ticket.id}
📌 Subjek: ${ticket.subject}
🏷️ Kategori: ${ticket.category}
📧 Email Pengirim: ${ticket.email}
🕐 Waktu: ${new Date(ticket.created_at || '').toLocaleString('id-ID')}

📝 Deskripsi:
${ticket.description}

Silakan segera ditindaklanjuti.`
      );

      // Send confirmation email to user
      await EmailService.sendNotificationEmail(
        ticket.email,
        'Pengguna',
        'Tiket Dukungan Anda Telah Diterima',
        `Halo,

Terima kasih telah menghubungi kami. Tiket dukungan Anda telah berhasil dibuat.

📋 ID Tiket: #${ticket.id}
📌 Subjek: ${ticket.subject}
🏷️ Kategori: ${ticket.category}
🕐 Waktu: ${new Date(ticket.created_at || '').toLocaleString('id-ID')}

Tim support kami akan segera meninjau dan merespons tiket Anda dalam waktu 2-4 jam.

Salam,
Tim Layanan Digital`
      );

      return ticket;
    } catch (error: any) {
      showErrorBox('💥 SUBMIT TICKET ERROR', {
        'Error': error?.message || 'Unknown',
      }, 'error');
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [user?.uid]);

  const fetchUserTickets = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const userTickets = await TicketService.getByUser(user.uid);
      setTickets(userTickets);
    } catch (error: any) {
      showErrorBox('💥 FETCH USER TICKETS ERROR', {
        'Error': error?.message || 'Unknown',
      }, 'error');
    }
  }, [user?.uid]);

  const fetchAllTickets = useCallback(async () => {
    try {
      const allTickets = await TicketService.getAll();
      setTickets(allTickets);
    } catch (error: any) {
      showErrorBox('💥 FETCH ALL TICKETS ERROR', {
        'Error': error?.message || 'Unknown',
      }, 'error');
    }
  }, []);

  return {
    tickets,
    isSubmitting,
    submitTicket,
    fetchUserTickets,
    fetchAllTickets,
  };
};
