/** Avisos Web Push: inscrição do navegador e estado para a interface. */
import { ApiError, api } from './api';

export type PushState = 'loading' | 'unsupported' | 'needs-install' | 'unconfigured' | 'denied' | 'disabled' | 'enabled';

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function base64UrlToBytes(base64Url: string) {
  const base64 = (base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), char => char.charCodeAt(0));
}

async function currentSubscription() {
  const registration = await navigator.serviceWorker.getRegistration('/');
  return registration ? registration.pushManager.getSubscription() : null;
}

export async function getPushState(): Promise<PushState> {
  // No iPhone, Web Push só funciona com o site instalado na tela de início.
  if (!supported()) return isIos() && !isStandalone() ? 'needs-install' : 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const subscription = await currentSubscription();
  if (subscription) {
    // Reassocia a inscrição à conta logada (o navegador pode ter trocado de usuário).
    await api.savePushSubscription(subscription.toJSON()).catch(() => undefined);
    return 'enabled';
  }
  return 'disabled';
}

export async function enablePush(): Promise<PushState> {
  let publicKey: string;
  try {
    ({ public_key: publicKey } = await api.pushPublicKey());
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return 'unconfigured';
    throw e;
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'disabled';
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(publicKey) });
  await api.savePushSubscription(subscription.toJSON());
  return 'enabled';
}

export async function disablePush(): Promise<PushState> {
  const subscription = await currentSubscription();
  if (subscription) {
    await api.deletePushSubscription(subscription.endpoint).catch(() => undefined);
    await subscription.unsubscribe();
  }
  return 'disabled';
}
