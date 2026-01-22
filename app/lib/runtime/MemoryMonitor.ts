import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('MemoryMonitor');

const MEMORY_CHECK_INTERVAL_MS = 5000;
const MEMORY_USAGE_THRESHOLD_MB = 500; // 500 MB

export class MemoryMonitor {
  #isSupported = false;
  #isMonitoring = false;
  #memoryUsage = 0;

  constructor() {
    if (
      typeof window !== 'undefined' &&
      window.crossOriginIsolated &&
      'measureUserAgentSpecificMemory' in performance
    ) {
      this.#isSupported = true;
    }
  }

  startMonitoring() {
    if (!this.#isSupported || this.#isMonitoring) {
      return;
    }

    this.#isMonitoring = true;
    this.#scheduleMemoryCheck();
    logger.info('Memory monitoring started.');
  }

  stopMonitoring() {
    this.#isMonitoring = false;
    logger.info('Memory monitoring stopped.');
  }

  isMemoryUsageExceeded(): boolean {
    if (!this.#isSupported) {
      return false;
    }

    return this.#memoryUsage / (1024 * 1024) > MEMORY_USAGE_THRESHOLD_MB;
  }

  async #measureMemory() {
    if (!this.#isMonitoring) {
      return;
    }

    try {
      const memorySample = await (performance as any).measureUserAgentSpecificMemory();
      this.#memoryUsage = memorySample.bytes;
      logger.debug(`Current memory usage: ${(this.#memoryUsage / (1024 * 1024)).toFixed(2)} MB`);
    } catch (error) {
      logger.error('Failed to measure memory:', error);
      this.stopMonitoring(); // Stop if there's an error
    }

    this.#scheduleMemoryCheck();
  }

  #scheduleMemoryCheck() {
    if (this.#isMonitoring) {
      setTimeout(() => this.#measureMemory(), MEMORY_CHECK_INTERVAL_MS);
    }
  }
}
