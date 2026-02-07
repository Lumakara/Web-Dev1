/**
 * PWA Utilities for Layanan Digital
 * Handles service worker registration, install prompts, and offline/online monitoring
 */

// Type definitions
declare global {
  interface Window {
    deferredPrompt: BeforeInstallPromptEvent | null;
  }

  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
      outcome: 'accepted' | 'dismissed';
      platform: string;
    }>;
    prompt(): Promise<void>;
  }

  interface Navigator {
    standalone?: boolean;
  }
}

// PWA Install Event
type PWAInstallHandler = (event: BeforeInstallPromptEvent) => void;

// Connection status callback
type ConnectionStatusHandler = (isOnline: boolean) => void;

// Service Worker registration
let swRegistration: ServiceWorkerRegistration | null = null;

// Install prompt event
let deferredPrompt: BeforeInstallPromptEvent | null = null;

// Event listeners
const installHandlers: Set<PWAInstallHandler> = new Set();
const statusHandlers: Set<ConnectionStatusHandler> = new Set();

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service workers are not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    swRegistration = registration;

    // Handle service worker updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content is available, show update notification
            console.log('[PWA] New version available');
            window.dispatchEvent(new CustomEvent('sw-update-available'));
          }
        });
      }
    });

    console.log('[PWA] Service Worker registered:', registration.scope);

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SW_VERSION') {
        console.log('[PWA] Service Worker version:', event.data.version);
      }
    });

    return registration;
  } catch (error) {
    console.error('[PWA] Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Unregister the service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!swRegistration) {
    return false;
  }

  try {
    const result = await swRegistration.unregister();
    swRegistration = null;
    console.log('[PWA] Service Worker unregistered:', result);
    return result;
  } catch (error) {
    console.error('[PWA] Service Worker unregistration failed:', error);
    return false;
  }
}

/**
 * Initialize PWA install prompt handling
 * Call this early in your app initialization
 */
export function initInstallPrompt(): void {
  // Listen for beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (event) => {
    // Prevent the mini-infobar from appearing on mobile
    event.preventDefault();
    // Store the event for later use
    deferredPrompt = event as BeforeInstallPromptEvent;
    window.deferredPrompt = deferredPrompt;

    // Notify all registered handlers
    if (deferredPrompt) {
      installHandlers.forEach((handler) => handler(deferredPrompt as BeforeInstallPromptEvent));
    }

    console.log('[PWA] Install prompt available');
  });

  // Listen for app installed event
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App was installed');
    // Clear the deferred prompt
    deferredPrompt = null;
    window.deferredPrompt = null;
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('pwa-installed'));
  });
}

/**
 * Check if the app can be installed
 */
export function canInstallPWA(): boolean {
  // Check if we're on iOS Safari
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
  
  // iOS requires manual install
  if (isIos && isSafari) {
    return !isPWAInstalled();
  }

  // For other browsers, check for deferred prompt
  return !!deferredPrompt && !isPWAInstalled();
}

/**
 * Check if the PWA is already installed
 */
export function isPWAInstalled(): boolean {
  // Check display-mode: standalone
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  // Check iOS standalone mode
  const isIosStandalone = window.navigator.standalone === true;
  
  return isStandalone || isIosStandalone;
}

/**
 * Get install platform info
 */
export function getInstallPlatform(): {
  isIos: boolean;
  isAndroid: boolean;
  isDesktop: boolean;
  isSafari: boolean;
  isChrome: boolean;
} {
  const userAgent = navigator.userAgent;
  return {
    isIos: /iPad|iPhone|iPod/.test(userAgent),
    isAndroid: /Android/.test(userAgent),
    isDesktop: !/Mobile|Android|iPhone|iPad|iPod/.test(userAgent),
    isSafari: /Safari/.test(userAgent) && !/Chrome/.test(userAgent),
    isChrome: /Chrome/.test(userAgent) && !/Edg/.test(userAgent),
  };
}

/**
 * Show the install prompt
 * Returns true if the user accepted, false otherwise
 */
export async function showInstallPrompt(): Promise<boolean> {
  if (!deferredPrompt) {
    console.log('[PWA] No install prompt available');
    return false;
  }

  try {
    // Show the prompt
    await deferredPrompt.prompt();

    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log('[PWA] User choice:', outcome);

    // Clear the deferred prompt
    deferredPrompt = null;
    window.deferredPrompt = null;

    return outcome === 'accepted';
  } catch (error) {
    console.error('[PWA] Install prompt failed:', error);
    return false;
  }
}

/**
 * Subscribe to install prompt availability
 * Returns unsubscribe function
 */
export function onInstallPromptAvailable(handler: PWAInstallHandler): () => void {
  installHandlers.add(handler);

  // If prompt is already available, call handler immediately
  if (deferredPrompt) {
    handler(deferredPrompt);
  }

  return () => {
    installHandlers.delete(handler);
  };
}

/**
 * Initialize online/offline status monitoring
 */
export function initConnectionStatus(): void {
  // Initial status
  const initialStatus = navigator.onLine;
  notifyStatusChange(initialStatus);

  // Listen for online event
  window.addEventListener('online', () => {
    console.log('[PWA] Connection restored');
    notifyStatusChange(true);
  });

  // Listen for offline event
  window.addEventListener('offline', () => {
    console.log('[PWA] Connection lost');
    notifyStatusChange(false);
  });
}

/**
 * Subscribe to connection status changes
 * Returns unsubscribe function
 */
export function onConnectionStatusChange(handler: ConnectionStatusHandler): () => void {
  statusHandlers.add(handler);

  // Call with current status immediately
  handler(navigator.onLine);

  return () => {
    statusHandlers.delete(handler);
  };
}

/**
 * Get current connection status
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Notify all handlers of status change
 */
function notifyStatusChange(isOnline: boolean): void {
  statusHandlers.forEach((handler) => handler(isOnline));
}

/**
 * Get network information (if available)
 */
export function getNetworkInfo(): {
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
  saveData: boolean;
} {
  const connection = (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;

  if (connection) {
    return {
      effectiveType: connection.effectiveType || null,
      downlink: connection.downlink || null,
      rtt: connection.rtt || null,
      saveData: connection.saveData || false,
    };
  }

  return {
    effectiveType: null,
    downlink: null,
    rtt: null,
    saveData: false,
  };
}

/**
 * Push Notification Subscription
 */
export async function subscribeToPushNotifications(
  vapidPublicKey: string
): Promise<PushSubscription | null> {
  if (!swRegistration) {
    console.error('[PWA] Service worker not registered');
    return null;
  }

  try {
    // Check if push is supported
    if (!swRegistration.pushManager) {
      console.error('[PWA] Push notifications not supported');
      return null;
    }

    // Check existing subscription
    const existingSubscription = await swRegistration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('[PWA] Already subscribed to push notifications');
      return existingSubscription;
    }

    // Subscribe
    const subscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    });

    console.log('[PWA] Push notification subscription:', subscription);
    return subscription;
  } catch (error) {
    console.error('[PWA] Push subscription failed:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!swRegistration || !swRegistration.pushManager) {
    return false;
  }

  try {
    const subscription = await swRegistration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      console.log('[PWA] Unsubscribed from push notifications');
      return true;
    }
    return false;
  } catch (error) {
    console.error('[PWA] Push unsubscription failed:', error);
    return false;
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.error('[PWA] Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

/**
 * Check if notifications are supported and permitted
 */
export function getNotificationStatus(): {
  supported: boolean;
  permission: NotificationPermission;
} {
  return {
    supported: 'Notification' in window,
    permission: Notification.permission || 'default',
  };
}

/**
 * Send a local notification
 */
export function sendLocalNotification(
  title: string,
  options?: NotificationOptions
): Notification | null {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return null;
  }

  try {
    const notification = new Notification(title, {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      ...options,
    });
    return notification;
  } catch (error) {
    console.error('[PWA] Failed to send notification:', error);
    return null;
  }
}

/**
 * Trigger background sync
 */
export async function triggerBackgroundSync(tag: string): Promise<boolean> {
  if (!swRegistration || !('sync' in swRegistration)) {
    console.log('[PWA] Background sync not supported');
    return false;
  }

  try {
    await (swRegistration as any).sync.register(tag);
    console.log('[PWA] Background sync registered:', tag);
    return true;
  } catch (error) {
    console.error('[PWA] Background sync registration failed:', error);
    return false;
  }
}

/**
 * Update service worker
 */
export async function updateServiceWorker(): Promise<void> {
  if (!swRegistration) {
    return;
  }

  try {
    await swRegistration.update();
    console.log('[PWA] Service worker update check triggered');
  } catch (error) {
    console.error('[PWA] Service worker update failed:', error);
  }
}

/**
 * Skip waiting and activate new service worker
 */
export function skipWaiting(): void {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
  }
}

/**
 * Helper function to convert base64 to Uint8Array
 * Needed for VAPID key
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Get PWA display mode
 */
export function getDisplayMode(): 'standalone' | 'minimal-ui' | 'browser' | 'unknown' {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isMinimalUi = window.matchMedia('(display-mode: minimal-ui)').matches;
  const isIosStandalone = window.navigator.standalone === true;

  if (isStandalone || isIosStandalone) {
    return 'standalone';
  }
  if (isMinimalUi) {
    return 'minimal-ui';
  }
  if (!window.matchMedia) {
    return 'unknown';
  }
  return 'browser';
}

/**
 * Initialize all PWA features
 * Call this once at app startup
 */
export function initPWA(): void {
  initInstallPrompt();
  initConnectionStatus();
  registerServiceWorker();
}

export default {
  registerServiceWorker,
  unregisterServiceWorker,
  initInstallPrompt,
  initConnectionStatus,
  initPWA,
  canInstallPWA,
  isPWAInstalled,
  getInstallPlatform,
  showInstallPrompt,
  onInstallPromptAvailable,
  onConnectionStatusChange,
  isOnline,
  getNetworkInfo,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  requestNotificationPermission,
  getNotificationStatus,
  sendLocalNotification,
  triggerBackgroundSync,
  updateServiceWorker,
  skipWaiting,
  getDisplayMode,
};
