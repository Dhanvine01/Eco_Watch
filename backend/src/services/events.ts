import { EventEmitter } from 'events';
import type { Alert, SensorReading } from '@prisma/client';

type AppEvents = {
  reading: SensorReading;
  alert: Alert;
};

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

export function publishEvent<K extends keyof AppEvents>(event: K, payload: AppEvents[K]) {
  emitter.emit(event, payload);
}

export function subscribeEvent<K extends keyof AppEvents>(
  event: K,
  listener: (payload: AppEvents[K]) => void
) {
  emitter.on(event, listener);
  return () => emitter.off(event, listener);
}
