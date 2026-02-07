import emailjs from '@emailjs/browser';
import { showErrorBox } from './error-tracker';

// EmailJS Configuration
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_5cy0pte';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_nf642dj';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'Y50IKgvUerHPeqTwt';

export interface RegistrationEmailData {
  to_email: string;
  to_name: string;
  user_email: string;
  registration_date: string;
}

export interface OrderEmailData {
  to_email: string;
  to_name: string;
  order_id: string;
  order_date: string;
  total_amount: string;
  items: string;
}

export const EmailService = {
  // Initialize EmailJS
  init() {
    emailjs.init(EMAILJS_PUBLIC_KEY);
  },

  // Send registration confirmation email
  async sendRegistrationEmail(data: RegistrationEmailData): Promise<void> {
    try {
      const templateParams = {
        to_email: data.to_email,
        to_name: data.to_name,
        user_email: data.user_email,
        registration_date: data.registration_date,
        subject: 'Selamat Datang di Layanan Digital!',
        message: `Halo ${data.to_name},\n\nSelamat! Akun Anda telah berhasil dibuat di Layanan Digital.\n\nDetail Akun:\nEmail: ${data.user_email}\nTanggal Registrasi: ${data.registration_date}\n\nAnda sekarang dapat login dan mulai menggunakan layanan kami.\n\nTerima kasih,\nTim Layanan Digital`,
      };

      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams
      );
      console.log('Registration email sent successfully');
    } catch (error: any) {
      showErrorBox('💥 EMAILJS ERROR', { 'Error': error?.message || 'Unknown' }, 'error');
      // Don't throw error, just log it - email is not critical
    }
  },

  // Send order confirmation email
  async sendOrderConfirmationEmail(data: OrderEmailData): Promise<void> {
    try {
      const templateParams = {
        to_email: data.to_email,
        to_name: data.to_name,
        order_id: data.order_id,
        order_date: data.order_date,
        total_amount: data.total_amount,
        items: data.items,
        subject: 'Konfirmasi Pesanan - Layanan Digital',
        message: `Halo ${data.to_name},\n\nPesanan Anda telah berhasil dibuat!\n\nDetail Pesanan:\nID Pesanan: ${data.order_id}\nTanggal: ${data.order_date}\nTotal: ${data.total_amount}\n\nItem:\n${data.items}\n\nTerima kasih telah berbelanja dengan kami!\n\nTim Layanan Digital`,
      };

      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams
      );
      console.log('Order confirmation email sent successfully');
    } catch (error: any) {
      showErrorBox('💥 EMAILJS ERROR', { 'Error': error?.message || 'Unknown' }, 'error');
      // Don't throw error, just log it
    }
  },

  // Send generic notification email
  async sendNotificationEmail(toEmail: string, toName: string, subject: string, message: string): Promise<void> {
    try {
      const templateParams = {
        to_email: toEmail,
        to_name: toName,
        subject: subject,
        message: message,
      };

      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams
      );
      console.log('Notification email sent successfully');
    } catch (error: any) {
      showErrorBox('💥 EMAILJS ERROR', { 'Error': error?.message || 'Unknown' }, 'error');
    }
  }
};

// Initialize on module load
EmailService.init();
