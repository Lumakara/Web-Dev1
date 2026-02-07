/**
 * Admin Authentication System
 * Provides multi-admin support with role-based access control
 */

import { TelegramBot } from './telegram';

// ============================================
// TYPES & INTERFACES
// ============================================

export type AdminRole = 'super_admin' | 'admin' | 'moderator';

export interface Admin {
  id: string;
  email: string;
  password: string;
  name: string;
  role: AdminRole;
  permissions: AdminPermission[];
  avatar?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export type AdminPermission =
  | 'all'
  | 'dashboard:view'
  | 'products:view'
  | 'products:create'
  | 'products:edit'
  | 'products:delete'
  | 'orders:view'
  | 'orders:edit'
  | 'orders:delete'
  | 'tickets:view'
  | 'tickets:edit'
  | 'analytics:view'
  | 'admins:view'
  | 'admins:create'
  | 'admins:edit'
  | 'admins:delete'
  | 'settings:view'
  | 'settings:edit';

export interface AdminSession {
  adminId: string;
  token: string;
  expiry: number;
  role: AdminRole;
  permissions: AdminPermission[];
}

export interface AdminActivity {
  id: string;
  adminId: string;
  adminName: string;
  adminEmail: string;
  action: string;
  resource: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface LoginAttempt {
  email: string;
  timestamp: number;
  success: boolean;
  ipAddress?: string;
}

// ============================================
// ROLE-BASED PERMISSIONS CONFIGURATION
// ============================================

export const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  super_admin: ['all'],
  admin: [
    'dashboard:view',
    'products:view',
    'products:create',
    'products:edit',
    'products:delete',
    'orders:view',
    'orders:edit',
    'tickets:view',
    'tickets:edit',
    'analytics:view',
    'settings:view',
  ],
  moderator: [
    'dashboard:view',
    'products:view',
    'orders:view',
    'orders:edit',
    'tickets:view',
    'tickets:edit',
  ],
};

// ============================================
// CONSTANTS
// ============================================

const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const ACTIVITY_LOG_KEY = 'admin_activity_log';
const SESSION_KEY = 'admin_session';
const TOKEN_KEY = 'admin_token';
const EXPIRY_KEY = 'admin_session_expiry';
const LOGIN_ATTEMPTS_KEY = 'admin_login_attempts';
const LOCKOUT_KEY = 'admin_lockout';

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate a cryptographically secure token
 */
export function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get client IP address (best effort)
 */
async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Get device/browser info
 */
function getDeviceInfo(): { device: string; browser: string; os: string } {
  const ua = navigator.userAgent;
  let device = 'Desktop';
  let browser = 'Unknown';
  let os = 'Unknown';

  // Detect device type
  if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) {
    device = /iPad|Tablet/i.test(ua) ? 'Tablet' : 'Mobile';
  }

  // Detect browser
  if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua)) browser = 'Safari';
  else if (/Edge/i.test(ua)) browser = 'Edge';
  else if (/Opera/i.test(ua)) browser = 'Opera';

  // Detect OS
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iOS|iPhone|iPad/i.test(ua)) os = 'iOS';

  return { device, browser, os };
}

// ============================================
// ADMIN DATA MANAGEMENT
// ============================================

/**
 * Load admin data from JSON file
 * In production, this should be an API call
 */
export async function loadAdmins(): Promise<Admin[]> {
  try {
    const response = await fetch('/src/data/admins.json');
    const data = await response.json();
    return data.admins || [];
  } catch {
    // Fallback: try to load from localStorage (for demo purposes)
    const stored = localStorage.getItem('admins_data');
    if (stored) {
      return JSON.parse(stored);
    }
    return [];
  }
}

/**
 * Find admin by email
 */
export async function findAdminByEmail(email: string): Promise<Admin | null> {
  const admins = await loadAdmins();
  return admins.find((admin) => admin.email.toLowerCase() === email.toLowerCase()) || null;
}

/**
 * Verify admin password
 * Note: In production, use bcrypt or similar for hashing
 */
export function verifyPassword(plainPassword: string, hashedPassword: string): boolean {
  // For demo: direct comparison (replace with bcrypt.compare in production)
  return plainPassword === hashedPassword;
}

// ============================================
// LOGIN & LOGOUT FUNCTIONS
// ============================================

export interface LoginResult {
  success: boolean;
  message: string;
  admin?: Admin;
  session?: AdminSession;
}

/**
 * Check if account is locked
 */
export function isAccountLocked(): { locked: boolean; remainingMinutes: number } {
  const lockoutEnd = localStorage.getItem(LOCKOUT_KEY);
  if (lockoutEnd) {
    const endTime = parseInt(lockoutEnd, 10);
    if (Date.now() < endTime) {
      return {
        locked: true,
        remainingMinutes: Math.ceil((endTime - Date.now()) / 60000),
      };
    }
    localStorage.removeItem(LOCKOUT_KEY);
    localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
  }
  return { locked: false, remainingMinutes: 0 };
}

/**
 * Record login attempt
 */
function recordLoginAttempt(email: string, success: boolean): void {
  const attempts: LoginAttempt[] = JSON.parse(localStorage.getItem(LOGIN_ATTEMPTS_KEY) || '[]');
  attempts.push({
    email,
    timestamp: Date.now(),
    success,
    ipAddress: 'client',
  });

  // Keep only last 20 attempts
  if (attempts.length > 20) attempts.shift();
  localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(attempts));

  // Check for lockout
  if (!success) {
    const recentFailures = attempts.filter(
      (a) => !a.success && Date.now() - a.timestamp < LOCKOUT_DURATION
    );
    if (recentFailures.length >= MAX_LOGIN_ATTEMPTS) {
      const lockoutEnd = Date.now() + LOCKOUT_DURATION;
      localStorage.setItem(LOCKOUT_KEY, lockoutEnd.toString());
    }
  }
}

/**
 * Login admin
 */
export async function loginAdmin(email: string, password: string): Promise<LoginResult> {
  // Check lockout
  const lockStatus = isAccountLocked();
  if (lockStatus.locked) {
    return {
      success: false,
      message: `Akun terkunci. Coba lagi dalam ${lockStatus.remainingMinutes} menit.`,
    };
  }

  // Find admin
  const admin = await findAdminByEmail(email);
  if (!admin) {
    recordLoginAttempt(email, false);
    return { success: false, message: 'Email atau password salah.' };
  }

  // Check if active
  if (!admin.isActive) {
    recordLoginAttempt(email, false);
    return { success: false, message: 'Akun tidak aktif. Hubungi super admin.' };
  }

  // Verify password
  if (!verifyPassword(password, admin.password)) {
    recordLoginAttempt(email, false);
    const attempts = JSON.parse(localStorage.getItem(LOGIN_ATTEMPTS_KEY) || '[]').filter(
      (a: LoginAttempt) => !a.success && Date.now() - a.timestamp < LOCKOUT_DURATION
    );
    const remaining = MAX_LOGIN_ATTEMPTS - attempts.length;
    return {
      success: false,
      message: `Email atau password salah. ${remaining} percobaan tersisa.`,
    };
  }

  // Success - create session
  const token = generateSecureToken();
  const expiry = Date.now() + SESSION_DURATION;
  const session: AdminSession = {
    adminId: admin.id,
    token,
    expiry,
    role: admin.role,
    permissions: admin.permissions,
  };

  // Store session
  sessionStorage.setItem(SESSION_KEY, 'true');
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(EXPIRY_KEY, expiry.toString());
  sessionStorage.setItem('admin_role', admin.role);
  sessionStorage.setItem('admin_name', admin.name);
  sessionStorage.setItem('admin_email', admin.email);
  sessionStorage.setItem('admin_id', admin.id);

  // Record successful login
  recordLoginAttempt(email, true);

  // Log activity
  await logActivity({
    adminId: admin.id,
    adminName: admin.name,
    adminEmail: admin.email,
    action: 'LOGIN',
    resource: 'auth',
  });

  // Send Telegram notification
  const { device, browser, os } = getDeviceInfo();
  await TelegramBot.sendAdminLoginNotification({
    email: admin.email,
    name: admin.name,
    device,
    browser,
    os,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  });

  return {
    success: true,
    message: 'Login berhasil!',
    admin,
    session,
  };
}

/**
 * Logout admin
 */
export async function logoutAdmin(adminId?: string): Promise<void> {
  const adminName = sessionStorage.getItem('admin_name');
  const adminEmail = sessionStorage.getItem('admin_email');

  // Log activity if we have session data
  if (adminId && adminName && adminEmail) {
    await logActivity({
      adminId,
      adminName,
      adminEmail,
      action: 'LOGOUT',
      resource: 'auth',
    });
  }

  // Clear session
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(EXPIRY_KEY);
  sessionStorage.removeItem('admin_role');
  sessionStorage.removeItem('admin_name');
  sessionStorage.removeItem('admin_email');
  sessionStorage.removeItem('admin_id');
}

// ============================================
// PERMISSION MANAGEMENT
// ============================================

/**
 * Check if admin has a specific permission
 */
export function checkPermission(
  adminPermissions: AdminPermission[],
  requiredPermission: AdminPermission
): boolean {
  // Super admin has all permissions
  if (adminPermissions.includes('all')) return true;
  // Check specific permission
  return adminPermissions.includes(requiredPermission);
}

/**
 * Check if current session has permission
 */
export function checkCurrentPermission(requiredPermission: AdminPermission): boolean {
  const permissionsStr = sessionStorage.getItem('admin_permissions');
  if (!permissionsStr) return false;

  const permissions: AdminPermission[] = JSON.parse(permissionsStr);
  return checkPermission(permissions, requiredPermission);
}

/**
 * Get current admin role
 */
export function getCurrentRole(): AdminRole | null {
  const role = sessionStorage.getItem('admin_role');
  return (role as AdminRole) || null;
}

/**
 * Get current admin info
 */
export function getCurrentAdmin(): Pick<Admin, 'id' | 'name' | 'email' | 'role'> | null {
  const id = sessionStorage.getItem('admin_id');
  const name = sessionStorage.getItem('admin_name');
  const email = sessionStorage.getItem('admin_email');
  const role = sessionStorage.getItem('admin_role') as AdminRole;

  if (!id || !name || !email || !role) return null;

  return { id, name, email, role };
}

/**
 * Validate current session
 */
export function validateSession(): boolean {
  const session = sessionStorage.getItem(SESSION_KEY);
  const token = sessionStorage.getItem(TOKEN_KEY);
  const expiry = sessionStorage.getItem(EXPIRY_KEY);

  if (!session || !token || !expiry) return false;

  const expiryTime = parseInt(expiry, 10);
  if (Date.now() >= expiryTime) {
    // Session expired - clear it
    logoutAdmin();
    return false;
  }

  return true;
}

/**
 * Extend session
 */
export function extendSession(): void {
  const currentExpiry = sessionStorage.getItem(EXPIRY_KEY);
  if (currentExpiry) {
    const newExpiry = Date.now() + SESSION_DURATION;
    sessionStorage.setItem(EXPIRY_KEY, newExpiry.toString());
  }
}

// ============================================
// ACTIVITY LOGGING
// ============================================

/**
 * Log admin activity
 */
export async function logActivity(
  activity: Omit<AdminActivity, 'id' | 'timestamp' | 'ipAddress' | 'userAgent'>
): Promise<void> {
  const timestamp = new Date().toISOString();
  const ipAddress = await getClientIP();
  const userAgent = navigator.userAgent;

  const fullActivity: AdminActivity = {
    ...activity,
    id: generateSecureToken(),
    timestamp,
    ipAddress,
    userAgent,
  };

  // Store in localStorage (in production, send to API)
  const existingLogs: AdminActivity[] = JSON.parse(
    localStorage.getItem(ACTIVITY_LOG_KEY) || '[]'
  );
  existingLogs.unshift(fullActivity);

  // Keep only last 1000 activities
  if (existingLogs.length > 1000) {
    existingLogs.length = 1000;
  }

  localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(existingLogs));
}

/**
 * Get activity logs
 */
export function getActivityLogs(
  filters?: {
    adminId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
  }
): AdminActivity[] {
  const logs: AdminActivity[] = JSON.parse(localStorage.getItem(ACTIVITY_LOG_KEY) || '[]');

  if (!filters) return logs;

  return logs.filter((log) => {
    if (filters.adminId && log.adminId !== filters.adminId) return false;
    if (filters.action && log.action !== filters.action) return false;
    if (filters.resource && log.resource !== filters.resource) return false;
    if (filters.startDate && new Date(log.timestamp) < filters.startDate) return false;
    if (filters.endDate && new Date(log.timestamp) > filters.endDate) return false;
    return true;
  });
}

/**
 * Get recent activity for current admin
 */
export function getCurrentAdminActivity(limit: number = 10): AdminActivity[] {
  const adminId = sessionStorage.getItem('admin_id');
  if (!adminId) return [];

  const logs = getActivityLogs({ adminId });
  return logs.slice(0, limit);
}

/**
 * Clear activity logs (super admin only)
 */
export function clearActivityLogs(): void {
  const role = getCurrentRole();
  if (role === 'super_admin') {
    localStorage.removeItem(ACTIVITY_LOG_KEY);
  }
}

// ============================================
// PERMISSION HELPERS
// ============================================

export const PERMISSION_DESCRIPTIONS: Record<AdminPermission, string> = {
  all: 'Semua akses (Super Admin)',
  'dashboard:view': 'Melihat dashboard',
  'products:view': 'Melihat produk',
  'products:create': 'Menambah produk',
  'products:edit': 'Mengedit produk',
  'products:delete': 'Menghapus produk',
  'orders:view': 'Melihat pesanan',
  'orders:edit': 'Mengedit pesanan',
  'orders:delete': 'Menghapus pesanan',
  'tickets:view': 'Melihat tiket',
  'tickets:edit': 'Mengedit tiket',
  'analytics:view': 'Melihat analitik',
  'admins:view': 'Melihat admin',
  'admins:create': 'Menambah admin',
  'admins:edit': 'Mengedit admin',
  'admins:delete': 'Menghapus admin',
  'settings:view': 'Melihat pengaturan',
  'settings:edit': 'Mengedit pengaturan',
};

export const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  super_admin: 'Super Administrator - Akses penuh ke semua fitur',
  admin: 'Administrator - Akses ke kebanyakan fitur kecuali manajemen admin',
  moderator: 'Moderator - Akses terbatas untuk melihat dan mengedit',
};

export function getPermissionsByRole(role: AdminRole): AdminPermission[] {
  return ROLE_PERMISSIONS[role];
}

export function hasPermission(
  permissions: AdminPermission[],
  permission: AdminPermission
): boolean {
  return checkPermission(permissions, permission);
}

// ============================================
// EXPORT
// ============================================

export default {
  loginAdmin,
  logoutAdmin,
  checkPermission,
  checkCurrentPermission,
  validateSession,
  extendSession,
  logActivity,
  getActivityLogs,
  getCurrentAdminActivity,
  clearActivityLogs,
  getCurrentAdmin,
  getCurrentRole,
  isAccountLocked,
  generateSecureToken,
};
