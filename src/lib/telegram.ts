import axios from 'axios';
import { showErrorBox } from './error-tracker';

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '8010136953:AAHnKUy_0jgJN5grZIgSDzbtTJznfqq5was';
const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID || '1841202339';

const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// ============================================
// INTERFACES
// ============================================

export interface TicketNotification {
  ticketId: string;
  subject: string;
  category: string;
  email: string;
  description: string;
  timestamp: string;
}

export interface OrderNotification {
  orderId: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  items: { title: string; tier: string; quantity: number; price: number }[];
  timestamp: string;
}

export interface UserData {
  id?: string;
  email: string;
  name: string;
  role?: string;
  avatar?: string;
}

export interface CartItem {
  id: string;
  title: string;
  tier: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface CheckoutData {
  user: UserData;
  items: CartItem[];
  totalAmount: number;
  subtotal?: number;
  tax?: number;
  shipping?: number;
  discount?: number;
  couponCode?: string;
}

export interface PaymentData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  paymentMethod: string;
  transactionId?: string;
  timestamp: string;
  items?: CartItem[];
}

export interface OrderStatusData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  previousStatus: string;
  items?: CartItem[];
}

export interface AdminLoginData {
  email: string;
  name: string;
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  os?: string;
  location?: string;
  timestamp: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get status emoji based on order/payment status
 */
function getStatusEmoji(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': '⏳',
    'processing': '🔧',
    'completed': '✅',
    'delivered': '📦',
    'cancelled': '❌',
    'refunded': '💸',
    'failed': '⚠️',
    'success': '✅',
    'paid': '💰',
    'shipped': '🚚',
    'on-hold': '⏸️',
    'waiting': '⏰',
  };
  return statusMap[status.toLowerCase()] || '📋';
}

/**
 * Get payment method emoji
 */
function getPaymentMethodEmoji(method: string): string {
  const methodMap: Record<string, string> = {
    'credit_card': '💳',
    'debit_card': '💳',
    'bank_transfer': '🏦',
    'e-wallet': '👛',
    'ewallet': '👛',
    'paypal': '💰',
    'crypto': '₿',
    'cod': '💵',
    'cash_on_delivery': '💵',
    'virtual_account': '🏧',
  };
  return methodMap[method.toLowerCase()] || '💳';
}

/**
 * Format cart items for message
 */
function formatCartItems(items: CartItem[]): string {
  return items.map((item, index) => 
    `${index + 1}. *${item.title}* \(${item.tier}\)
   ├ Qty: ${item.quantity}
   └ Price: Rp ${item.price.toLocaleString('id-ID')}`
  ).join('\n');
}

/**
 * Escape markdown special characters
 */
function escapeMarkdown(text: string): string {
  return text.replace(/[_*\[\]()~`>#+=|{}.!-]/g, '\\$&');
}

// ============================================
// TELEGRAM BOT OBJECT
// ============================================

export const TelegramBot = {
  // ============================================
  // 1. LOGIN NOTIFICATION
  // ============================================
  async sendLoginNotification(user: UserData, deviceInfo?: { device?: string; browser?: string; os?: string; ip?: string }): Promise<void> {
    try {
      const timestamp = new Date().toLocaleString('id-ID', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const device = deviceInfo?.device || 'Unknown Device';
      const browser = deviceInfo?.browser || 'Unknown Browser';
      const os = deviceInfo?.os || 'Unknown OS';
      const ip = deviceInfo?.ip || 'Unknown IP';

      const message = `
🔐 *USER LOGIN*

👤 *User Information*
├ Name: ${escapeMarkdown(user.name)}
├ Email: ${escapeMarkdown(user.email)}
${user.role ? `├ Role: ${user.role}` : ''}
└ User ID: ${user.id || 'N/A'}

📱 *Device Information*
├ Device: ${device}
├ Browser: ${browser}
├ OS: ${os}
└ IP Address: ${ip}

🕐 *Login Time:* ${timestamp}

━━━━━━━━━━━━━━━━━━━━
⚡ User successfully logged into the system.
      `.trim();

      const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'MarkdownV2',
      });

      if (response.data.ok) {
        console.log('✅ Login notification sent to Telegram');
      }
    } catch (error: any) {
      showErrorBox('💥 TELEGRAM LOGIN ERROR', { 'Error': error.response?.data?.description || error.message || 'Unknown' }, 'error');
    }
  },

  // ============================================
  // 2. LOGOUT NOTIFICATION
  // ============================================
  async sendLogoutNotification(user: UserData, sessionDuration?: string): Promise<void> {
    try {
      const timestamp = new Date().toLocaleString('id-ID', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const durationText = sessionDuration ? `\n⏱️ *Session Duration:* ${sessionDuration}` : '';

      const message = `
🚪 *USER LOGOUT*

👤 *User Information*
├ Name: ${escapeMarkdown(user.name)}
├ Email: ${escapeMarkdown(user.email)}
${user.role ? `├ Role: ${user.role}` : ''}
└ User ID: ${user.id || 'N/A'}

🕐 *Logout Time:* ${timestamp}${durationText}

━━━━━━━━━━━━━━━━━━━━
👋 User has logged out from the system.
      `.trim();

      const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'MarkdownV2',
      });

      if (response.data.ok) {
        console.log('✅ Logout notification sent to Telegram');
      }
    } catch (error: any) {
      showErrorBox('💥 TELEGRAM LOGOUT ERROR', { 'Error': error.response?.data?.description || error.message || 'Unknown' }, 'error');
    }
  },

  // ============================================
  // 3. CHECKOUT NOTIFICATION
  // ============================================
  async sendCheckoutNotification(checkoutData: CheckoutData): Promise<void> {
    try {
      const timestamp = new Date().toLocaleString('id-ID', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const itemsList = formatCartItems(checkoutData.items);
      const itemCount = checkoutData.items.reduce((sum, item) => sum + item.quantity, 0);

      const subtotalText = checkoutData.subtotal ? `\n├ Subtotal: Rp ${checkoutData.subtotal.toLocaleString('id-ID')}` : '';
      const taxText = checkoutData.tax ? `\n├ Tax: Rp ${checkoutData.tax.toLocaleString('id-ID')}` : '';
      const shippingText = checkoutData.shipping ? `\n├ Shipping: Rp ${checkoutData.shipping.toLocaleString('id-ID')}` : '';
      const discountText = checkoutData.discount ? `\n├ Discount: \-Rp ${checkoutData.discount.toLocaleString('id-ID')}` : '';
      const couponText = checkoutData.couponCode ? `\n├ Coupon: ${checkoutData.couponCode}` : '';

      const message = `
🛒 *CHECKOUT INITIATED*

👤 *Customer Information*
├ Name: ${escapeMarkdown(checkoutData.user.name)}
├ Email: ${escapeMarkdown(checkoutData.user.email)}
└ User ID: ${checkoutData.user.id || 'N/A'}

📦 *Cart Items* (${itemCount} items)
${itemsList}

💰 *Payment Summary*${subtotalText}${taxText}${shippingText}${discountText}${couponText}
└ *Total Amount: Rp ${checkoutData.totalAmount.toLocaleString('id-ID')}*

🕐 *Checkout Time:* ${timestamp}

━━━━━━━━━━━━━━━━━━━━
🛍️ Customer is proceeding to payment.
      `.trim();

      const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'MarkdownV2',
      });

      if (response.data.ok) {
        console.log('✅ Checkout notification sent to Telegram');
      }
    } catch (error: any) {
      showErrorBox('💥 TELEGRAM CHECKOUT ERROR', { 'Error': error.response?.data?.description || error.message || 'Unknown' }, 'error');
    }
  },

  // ============================================
  // 4. PAYMENT SUCCESS NOTIFICATION
  // ============================================
  async sendPaymentSuccessNotification(paymentData: PaymentData): Promise<void> {
    try {
      const timestamp = new Date().toLocaleString('id-ID', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const paymentEmoji = getPaymentMethodEmoji(paymentData.paymentMethod);
      const itemsList = paymentData.items ? '\n\n📦 *Order Items:*\n' + formatCartItems(paymentData.items) : '';

      const message = `
✅ *PAYMENT SUCCESSFUL*

💳 *Payment Details*
├ Order ID: #${paymentData.orderId}
${paymentData.transactionId ? `├ Transaction ID: ${paymentData.transactionId}` : ''}
├ Amount: Rp ${paymentData.amount.toLocaleString('id-ID')}
${paymentEmoji} Method: ${paymentData.paymentMethod}
└ Status: ✅ SUCCESS

👤 *Customer Information*
├ Name: ${escapeMarkdown(paymentData.customerName)}
└ Email: ${escapeMarkdown(paymentData.customerEmail)}
${itemsList}

🕐 *Payment Time:* ${timestamp}

━━━━━━━━━━━━━━━━━━━━
🎉 Payment confirmed! Order is ready for processing.
      `.trim();

      const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'MarkdownV2',
      });

      if (response.data.ok) {
        console.log('✅ Payment success notification sent to Telegram');
      }
    } catch (error: any) {
      showErrorBox('💥 TELEGRAM PAYMENT ERROR', { 'Error': error.response?.data?.description || error.message || 'Unknown' }, 'error');
    }
  },

  // ============================================
  // 5. ORDER STATUS UPDATE NOTIFICATION
  // ============================================
  async sendOrderStatusUpdate(orderData: OrderStatusData, newStatus: string): Promise<void> {
    try {
      const timestamp = new Date().toLocaleString('id-ID', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const prevStatusEmoji = getStatusEmoji(orderData.previousStatus);
      const newStatusEmoji = getStatusEmoji(newStatus);
      const itemsList = orderData.items ? '\n\n📦 *Order Items:*\n' + formatCartItems(orderData.items) : '';

      const message = `
📊 *ORDER STATUS UPDATE*

📋 *Order Information*
├ Order ID: #${orderData.orderId}
├ Amount: Rp ${orderData.totalAmount.toLocaleString('id-ID')}
└ Status Change: ${prevStatusEmoji} ${orderData.previousStatus.toUpperCase()} → ${newStatusEmoji} ${newStatus.toUpperCase()}

👤 *Customer Information*
├ Name: ${escapeMarkdown(orderData.customerName)}
└ Email: ${escapeMarkdown(orderData.customerEmail)}
${itemsList}

🕐 *Update Time:* ${timestamp}

━━━━━━━━━━━━━━━━━━━━
📢 Order status has been updated to *${newStatus.toUpperCase()}*.
      `.trim();

      const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'MarkdownV2',
      });

      if (response.data.ok) {
        console.log('✅ Order status update notification sent to Telegram');
      }
    } catch (error: any) {
      showErrorBox('💥 TELEGRAM ORDER ERROR', { 'Error': error.response?.data?.description || error.message || 'Unknown' }, 'error');
    }
  },

  // ============================================
  // 6. NEW USER REGISTRATION NOTIFICATION
  // ============================================
  async sendNewUserNotification(userData: UserData & { registrationMethod?: string; referralCode?: string }): Promise<void> {
    try {
      const timestamp = new Date().toLocaleString('id-ID', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const regMethod = userData.registrationMethod ? `\n├ Registration Method: ${userData.registrationMethod}` : '';
      const referral = userData.referralCode ? `\n├ Referral Code: ${userData.referralCode}` : '';

      const message = `
🎉 *NEW USER REGISTRATION*

👤 *User Information*
├ Name: ${escapeMarkdown(userData.name)}
├ Email: ${escapeMarkdown(userData.email)}
${userData.id ? `├ User ID: ${userData.id}` : ''}
${userData.role ? `├ Role: ${userData.role}` : ''}${regMethod}${referral}

🕐 *Registration Time:* ${timestamp}

━━━━━━━━━━━━━━━━━━━━
🚀 A new user has joined the platform!
      `.trim();

      const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'MarkdownV2',
      });

      if (response.data.ok) {
        console.log('✅ New user registration notification sent to Telegram');
      }
    } catch (error: any) {
      showErrorBox('💥 TELEGRAM NEW USER ERROR', { 'Error': error.response?.data?.description || error.message || 'Unknown' }, 'error');
    }
  },

  // ============================================
  // 7. SUPPORT TICKET NOTIFICATION (ENHANCED)
  // ============================================
  async sendTicketNotification(ticket: TicketNotification): Promise<void> {
    try {
      const categoryEmojis: Record<string, string> = {
        'general': '❓',
        'technical': '🔧',
        'billing': '💳',
        'account': '👤',
        'bug': '🐛',
        'feature': '💡',
        'complaint': '📝',
        'other': '📌',
      };

      const categoryEmoji = categoryEmojis[ticket.category.toLowerCase()] || '🎫';

      const message = `
🎫 *NEW SUPPORT TICKET RECEIVED*

📋 *Ticket Details*
├ Ticket ID: #${ticket.ticketId}
├ Subject: ${escapeMarkdown(ticket.subject)}
${categoryEmoji} Category: ${ticket.category}
├ Priority: MEDIUM

👤 *Contact Information*
└ Email: ${escapeMarkdown(ticket.email)}

📝 *Description:*
${escapeMarkdown(ticket.description)}

🕐 *Submitted:* ${ticket.timestamp}

━━━━━━━━━━━━━━━━━━━━
⚡ Please respond to this ticket as soon as possible.
      `.trim();

      const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'MarkdownV2',
      });

      if (response.data.ok) {
        console.log('✅ Ticket notification sent to Telegram');
      }
    } catch (error: any) {
      showErrorBox('💥 TELEGRAM TICKET ERROR', { 'Error': error.response?.data?.description || error.message || 'Unknown' }, 'error');
    }
  },

  // ============================================
  // 8. ADMIN LOGIN NOTIFICATION
  // ============================================
  async sendAdminLoginNotification(adminData: AdminLoginData): Promise<void> {
    try {
      const timestamp = new Date().toLocaleString('id-ID', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      });

      const device = adminData.device || 'Unknown Device';
      const browser = adminData.browser || 'Unknown Browser';
      const os = adminData.os || 'Unknown OS';
      const ip = adminData.ipAddress || 'Unknown IP';
      const location = adminData.location ? `\n├ Location: ${adminData.location}` : '';
      const ua = adminData.userAgent ? `\n├ User Agent: ${adminData.userAgent.slice(0, 50)}...` : '';

      const message = `
🔴 *ADMIN LOGIN ALERT*

⚠️ *Administrator Access Detected*

👤 *Admin Information*
├ Name: ${escapeMarkdown(adminData.name)}
├ Email: ${escapeMarkdown(adminData.email)}
└ Role: ADMINISTRATOR

📱 *Device Information*
├ Device: ${device}
├ Browser: ${browser}
├ OS: ${os}
├ IP Address: ${ip}${location}${ua}

🕐 *Login Time:* ${timestamp}

━━━━━━━━━━━━━━━━━━━━
🔒 Admin panel access granted. Please verify this is authorized.
      `.trim();

      const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'MarkdownV2',
      });

      if (response.data.ok) {
        console.log('✅ Admin login notification sent to Telegram');
      }
    } catch (error: any) {
      showErrorBox('💥 TELEGRAM ADMIN ERROR', { 'Error': error.response?.data?.description || error.message || 'Unknown' }, 'error');
    }
  },

  // ============================================
  // LEGACY METHODS (for backward compatibility)
  // ============================================

  /**
   * @deprecated Use sendOrderStatusUpdate instead
   */
  async sendOrderNotification(order: OrderNotification): Promise<void> {
    try {
      const itemsList = order.items.map(item => 
        `• ${escapeMarkdown(item.title)} (${item.tier}) x${item.quantity} \- Rp ${item.price.toLocaleString('id-ID')}`
      ).join('\n');

      const message = `
🛒 *NEW ORDER RECEIVED*

📋 *Order ID:* #${order.orderId}
👤 *Customer:* ${escapeMarkdown(order.customerName)}
📧 *Email:* ${escapeMarkdown(order.customerEmail)}
💰 *Total:* Rp ${order.totalAmount.toLocaleString('id-ID')}
🕐 *Time:* ${order.timestamp}

📦 *Order Items:*
${itemsList}

━━━━━━━━━━━━━━━━━━━━
Please process this order immediately.
      `.trim();

      const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'MarkdownV2',
      });

      if (response.data.ok) {
        console.log('✅ Order notification sent to Telegram');
      }
    } catch (error: any) {
      showErrorBox('💥 TELEGRAM ORDER ERROR', { 'Error': error.response?.data?.description || error.message || 'Unknown' }, 'error');
    }
  },

  /**
   * @deprecated Use sendPaymentSuccessNotification instead
   */
  async sendPaymentNotification(orderId: string, amount: number, paymentMethod: string, status: string): Promise<void> {
    try {
      const statusEmoji = status === 'success' ? '✅' : '❌';
      const paymentEmoji = getPaymentMethodEmoji(paymentMethod);
      const timestamp = new Date().toLocaleString('id-ID');

      const message = `
${statusEmoji} *PAYMENT NOTIFICATION*

📋 *Order ID:* #${orderId}
💰 *Amount:* Rp ${amount.toLocaleString('id-ID')}
${paymentEmoji} *Method:* ${paymentMethod}
📊 *Status:* ${status.toUpperCase()}
🕐 *Time:* ${timestamp}

━━━━━━━━━━━━━━━━━━━━
      `.trim();

      const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      });

      if (response.data.ok) {
        console.log('✅ Payment notification sent to Telegram');
      }
    } catch (error: any) {
      showErrorBox('💥 TELEGRAM PAYMENT ERROR', { 'Error': error.response?.data?.description || error.message || 'Unknown' }, 'error');
    }
  },

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Send custom message to Telegram
   */
  async sendCustomMessage(message: string, parseMode: 'Markdown' | 'MarkdownV2' | 'HTML' = 'Markdown'): Promise<void> {
    try {
      const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: parseMode,
      });

      if (response.data.ok) {
        console.log('✅ Custom message sent to Telegram');
      }
    } catch (error: any) {
      showErrorBox('💥 TELEGRAM MESSAGE ERROR', { 'Error': error.response?.data?.description || error.message || 'Unknown' }, 'error');
    }
  },

  /**
   * Test bot connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${TELEGRAM_API_URL}/getMe`);
      if (response.data.ok) {
        console.log('✅ Telegram bot connection successful');
        console.log(`🤖 Bot Name: ${response.data.result.first_name}`);
        console.log(`🔗 Bot Username: @${response.data.result.username}`);
      }
      return response.data.ok;
    } catch (error) {
      showErrorBox('💥 TELEGRAM CONNECTION ERROR', { 'Status': 'Failed to connect' }, 'error');
      return false;
    }
  },

  /**
   * Get bot information
   */
  async getBotInfo(): Promise<{ firstName: string; username: string; id: number } | null> {
    try {
      const response = await axios.get(`${TELEGRAM_API_URL}/getMe`);
      if (response.data.ok) {
        return {
          firstName: response.data.result.first_name,
          username: response.data.result.username,
          id: response.data.result.id,
        };
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to get bot info');
      return null;
    }
  },
};

// Export default for convenience
export default TelegramBot;
