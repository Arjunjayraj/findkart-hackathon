/**
 * FindKart — Kafka client singleton
 * Uses KafkaJS when KAFKA_BROKERS is configured and reachable.
 * Fails gracefully with zero noisy retry-pool stderr errors when disabled or offline.
 */

import net from 'node:net';
import tls from 'node:tls';
import {
  Kafka,
  type Producer,
  type Consumer,
  type SASLOptions,
  Partitioners,
  logLevel,
} from 'kafkajs';

function parseBrokers(): string[] {
  const raw = (process.env.KAFKA_BROKERS || '').trim().replace(/^["']|["']$/g, '');
  if (!raw || raw.toLowerCase() === 'disabled' || raw.toLowerCase() === 'false') {
    return [];
  }
  return raw
    .split(',')
    .map((b) => b.trim())
    .filter((b) => b.includes(':'));
}

export function isKafkaConfigured(): boolean {
  return parseBrokers().length > 0;
}

function buildSslConfig() {
  const ca = process.env.KAFKA_CA_CERT?.replace(/\\n/g, '\n');
  const cert = process.env.KAFKA_CLIENT_CERT?.replace(/\\n/g, '\n');
  const key = process.env.KAFKA_CLIENT_KEY?.replace(/\\n/g, '\n');

  if (ca || cert || key) {
    return {
      rejectUnauthorized: false,
      ...(ca ? { ca: [ca] } : {}),
      ...(cert ? { cert } : {}),
      ...(key ? { key } : {}),
    };
  }

  const brokers = parseBrokers();
  const isCloudBroker = brokers.some((b) => b.includes('aivencloud.com') || b.endsWith(':9093'));
  if (process.env.KAFKA_SSL === 'true' || isCloudBroker) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

function buildSaslConfig(): SASLOptions | undefined {
  const username = process.env.KAFKA_SASL_USERNAME?.trim();
  const password = process.env.KAFKA_SASL_PASSWORD?.trim();
  if (!username || !password) return undefined;
  const rawMech = (process.env.KAFKA_SASL_MECHANISM || 'scram-sha-256').trim().toLowerCase();
  if (rawMech === 'plain') {
    return { mechanism: 'plain', username, password };
  }
  if (rawMech === 'scram-sha-512') {
    return { mechanism: 'scram-sha-512', username, password };
  }
  return { mechanism: 'scram-sha-256', username, password };
}

function createKafkaClient(): Kafka {
  const brokers = parseBrokers();
  const ssl = buildSslConfig();
  const sasl = buildSaslConfig();

  return new Kafka({
    clientId: 'findkart-server',
    brokers: brokers.length > 0 ? brokers : ['localhost:9092'],
    ssl,
    sasl,
    connectionTimeout: 3000,
    requestTimeout: 5000,
    // Suppress KafkaJS internal stderr JSON dumps when broker is offline
    logLevel: logLevel.NOTHING,
    logCreator: () => () => {},
    retry: {
      initialRetryTime: 250,
      retries: 1,
    },
  });
}

// ─── Topics ──────────────────────────────────────────────────────────────────
export const TOPICS = {
  ORDERS:              'findkart.orders',
  STOCK_UPDATES:       'findkart.stock.updates',
  STOCK_NOTIFICATIONS: 'findkart.stock.notifications',
  CHAT_EVENTS:         'findkart.chat.events',
} as const;

export type KafkaTopic = (typeof TOPICS)[keyof typeof TOPICS];

// ─── Shared producer with circuit breaker ─────────────────────────────────────
let _kafkaClient: Kafka | null = null;
let _producer: Producer | null = null;
let _producerConnected = false;
let _unavailableUntil = 0;
const RETRY_COOLDOWN_MS = 60_000;

function probeBrokerReachable(broker: string): Promise<boolean> {
  const lastColon = broker.lastIndexOf(':');
  if (lastColon <= 0) return Promise.resolve(false);
  const host = broker.slice(0, lastColon).trim();
  const port = Number(broker.slice(lastColon + 1).trim());
  if (!host || !Number.isFinite(port) || port <= 0) return Promise.resolve(false);

  const ssl = buildSslConfig();
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ok);
    };

    const socket = ssl
      ? tls.connect({ host, port, ...ssl, timeout: 2000 }, () => finish(true))
      : net.createConnection({ host, port, timeout: 2000 }, () => finish(true));

    socket.setTimeout(2000, () => finish(false));
    socket.on('error', () => finish(false));
  });
}

export async function getProducer(): Promise<Producer | null> {
  const brokers = parseBrokers();
  if (brokers.length === 0) return null;
  if (Date.now() < _unavailableUntil) return null;

  if (_producer && _producerConnected) {
    return _producer;
  }

  const reachable = await probeBrokerReachable(brokers[0]);
  if (!reachable) {
    _unavailableUntil = Date.now() + RETRY_COOLDOWN_MS;
    return null;
  }

  try {
    if (!_kafkaClient) {
      _kafkaClient = createKafkaClient();
    }
    if (!_producer) {
      _producer = _kafkaClient.producer({
        createPartitioner: Partitioners.DefaultPartitioner,
      });
    }
    await _producer.connect();
    _producerConnected = true;
    console.log('[Kafka] Producer connected');
    return _producer;
  } catch {
    _unavailableUntil = Date.now() + RETRY_COOLDOWN_MS;
    _producerConnected = false;
    _producer = null;
    return null;
  }
}

export async function warmupKafkaProducer(): Promise<void> {
  if (!isKafkaConfigured()) {
    console.log('[Kafka] KAFKA_BROKERS unset — event streaming disabled cleanly.');
    return;
  }
  const producer = await getProducer();
  if (!producer) {
    console.log('[Kafka] Broker unreachable or missing TLS/SASL credentials — event streaming skipped cleanly.');
  }
}

export async function disconnectProducer(): Promise<void> {
  if (_producer && _producerConnected) {
    await _producer.disconnect();
    _producerConnected = false;
    _producer = null;
    console.log('[Kafka] Producer disconnected');
  }
}

// ─── Publish helper ───────────────────────────────────────────────────────────
export async function publishEvent(
  topic: KafkaTopic,
  key: string,
  value: Record<string, unknown>,
): Promise<boolean> {
  const producer = await getProducer();
  if (!producer) return false;

  try {
    await producer.send({
      topic,
      messages: [
        {
          key,
          value: JSON.stringify({ ...value, _publishedAt: new Date().toISOString() }),
        },
      ],
    });
    return true;
  } catch {
    _unavailableUntil = Date.now() + RETRY_COOLDOWN_MS;
    _producerConnected = false;
    return false;
  }
}

// ─── Consumer factory ─────────────────────────────────────────────────────────
export function createConsumer(groupId: string): Consumer {
  if (!_kafkaClient) {
    _kafkaClient = createKafkaClient();
  }
  return _kafkaClient.consumer({ groupId });
}
