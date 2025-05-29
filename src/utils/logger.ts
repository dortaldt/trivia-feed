export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LoggerConfig {
  debugMode: boolean;
  enabledLevels: LogLevel[];
}

class Logger {
  private config: LoggerConfig = {
    debugMode: false,
    enabledLevels: ['WARN', 'ERROR']
  };

  setDebugMode(enabled: boolean) {
    this.config.debugMode = enabled;
    this.config.enabledLevels = enabled 
      ? ['DEBUG', 'INFO', 'WARN', 'ERROR'] 
      : ['WARN', 'ERROR'];
  }

  private shouldLog(level: LogLevel): boolean {
    return this.config.enabledLevels.includes(level);
  }

  private formatMessage(level: LogLevel, tag: string, message: string): string {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    return `[${timestamp}] [${level}] [${tag}] ${message}`;
  }

  debug(tag: string, message: string, data?: any) {
    if (!this.shouldLog('DEBUG')) return;
    console.log(this.formatMessage('DEBUG', tag, message), data || '');
  }

  info(tag: string, message: string, data?: any) {
    if (!this.shouldLog('INFO')) return;
    console.log(this.formatMessage('INFO', tag, message), data || '');
  }

  warn(tag: string, message: string, data?: any) {
    if (!this.shouldLog('WARN')) return;
    console.warn(this.formatMessage('WARN', tag, message), data || '');
  }

  error(tag: string, message: string, data?: any) {
    if (!this.shouldLog('ERROR')) return;
    console.error(this.formatMessage('ERROR', tag, message), data || '');
  }

  // Convenience methods for common logging patterns
  fastScroll(message: string, data?: any) {
    this.debug('FastScroll', message, data);
  }

  feed(message: string, data?: any) {
    this.debug('Feed', message, data);
  }

  feedState() {
    if (!this.shouldLog('DEBUG')) return { inColdStart: false, totalInteractions: 0, totalQuestionsAnswered: 0 };
    console.log(this.formatMessage('DEBUG', 'Feed', '===== CURRENT FEED STATE ====='));
    return { inColdStart: false, totalInteractions: 0, totalQuestionsAnswered: 0 };
  }
}

// Export singleton instance
export const logger = new Logger();

// Export a function to set debug mode
export const setLoggerDebugMode = (enabled: boolean) => {
  logger.setDebugMode(enabled);
}; 