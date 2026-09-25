import { checkOfflineDevices } from './index';

export function startDeviceOfflineJob(intervalMs = 30_000) {
  return setInterval(() => {
    checkOfflineDevices().catch((error) => {
      console.error('Device offline check failed', error);
    });
  }, intervalMs);
}

