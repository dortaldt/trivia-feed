import { Platform } from 'react-native';

interface PerformanceMetric {
  label: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private isEnabled: boolean = __DEV__; // Only enable in development

  start(label: string): void {
    if (!this.isEnabled) return;
    
    this.metrics.set(label, {
      label,
      startTime: performance.now(),
    });
  }

  end(label: string): number | null {
    if (!this.isEnabled) return null;
    
    const metric = this.metrics.get(label);
    if (!metric) {
      console.warn(`Performance metric "${label}" not found`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;
    
    metric.endTime = endTime;
    metric.duration = duration;

    // Log performance metrics
    if (duration > 100) {
      console.warn(`🐌 Slow operation: ${label} took ${duration.toFixed(2)}ms`);
    } else if (duration > 50) {
      console.log(`⚠️ ${label} took ${duration.toFixed(2)}ms`);
    } else {
      console.log(`✅ ${label} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  measure<T>(label: string, fn: () => T): T {
    if (!this.isEnabled) return fn();
    
    this.start(label);
    const result = fn();
    this.end(label);
    return result;
  }

  async measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    if (!this.isEnabled) return fn();
    
    this.start(label);
    const result = await fn();
    this.end(label);
    return result;
  }

  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values()).filter(m => m.duration !== undefined);
  }

  clear(): void {
    this.metrics.clear();
  }

  // iOS-specific tap response time monitoring
  monitorTapResponse(componentName: string, callback: () => void): () => void {
    if (!this.isEnabled || Platform.OS !== 'ios') return callback;
    
    return () => {
      this.start(`${componentName}_tap_response`);
      callback();
      // End measurement after next frame
      requestAnimationFrame(() => {
        this.end(`${componentName}_tap_response`);
      });
    };
  }

  // Report performance summary
  reportSummary(): void {
    if (!this.isEnabled) return;
    
    const metrics = this.getMetrics();
    if (metrics.length === 0) return;

    console.group('📊 Performance Summary');
    
    const slowOperations = metrics.filter(m => m.duration! > 100);
    const moderateOperations = metrics.filter(m => m.duration! > 50 && m.duration! <= 100);
    const fastOperations = metrics.filter(m => m.duration! <= 50);

    if (slowOperations.length > 0) {
      console.group('🐌 Slow Operations (>100ms)');
      slowOperations.forEach(m => console.log(`${m.label}: ${m.duration!.toFixed(2)}ms`));
      console.groupEnd();
    }

    if (moderateOperations.length > 0) {
      console.group('⚠️ Moderate Operations (50-100ms)');
      moderateOperations.forEach(m => console.log(`${m.label}: ${m.duration!.toFixed(2)}ms`));
      console.groupEnd();
    }

    console.log(`✅ Fast Operations: ${fastOperations.length}`);
    console.log(`Total Operations: ${metrics.length}`);
    
    const avgDuration = metrics.reduce((sum, m) => sum + m.duration!, 0) / metrics.length;
    console.log(`Average Duration: ${avgDuration.toFixed(2)}ms`);
    
    console.groupEnd();
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Convenience functions
export const measurePerformance = <T>(label: string, fn: () => T): T => {
  return performanceMonitor.measure(label, fn);
};

export const measurePerformanceAsync = <T>(label: string, fn: () => Promise<T>): Promise<T> => {
  return performanceMonitor.measureAsync(label, fn);
};

export const monitorTapResponse = (componentName: string, callback: () => void): () => void => {
  return performanceMonitor.monitorTapResponse(componentName, callback);
}; 