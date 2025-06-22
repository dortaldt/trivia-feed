import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_COUNT_KEY = 'user_session_count';
const LAST_SESSION_DATE_KEY = 'last_session_date';

export class SessionManager {
  private static instance: SessionManager;
  private currentSessionCount: number = 0;
  private sessionInitialized: boolean = false;

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  async initializeSession(): Promise<number> {
    if (this.sessionInitialized) {
      return this.currentSessionCount;
    }

    try {
      const today = new Date().toDateString();
      const lastSessionDate = await AsyncStorage.getItem(LAST_SESSION_DATE_KEY);
      const storedSessionCount = await AsyncStorage.getItem(SESSION_COUNT_KEY);
      
      let sessionCount = storedSessionCount ? parseInt(storedSessionCount, 10) : 0;

      // If it's a new day or first time, increment session count
      if (lastSessionDate !== today) {
        sessionCount += 1;
        await AsyncStorage.setItem(SESSION_COUNT_KEY, sessionCount.toString());
        await AsyncStorage.setItem(LAST_SESSION_DATE_KEY, today);
        
        console.log('New session started:', sessionCount);
      } else {
        console.log('Continuing existing session:', sessionCount);
      }

      this.currentSessionCount = sessionCount;
      this.sessionInitialized = true;
      
      return sessionCount;
    } catch (error) {
      console.error('Error initializing session:', error);
      return 0;
    }
  }

  async getCurrentSessionCount(): Promise<number> {
    if (!this.sessionInitialized) {
      return await this.initializeSession();
    }
    return this.currentSessionCount;
  }

  // Method to reset session count (for testing or user reset)
  async resetSessions(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SESSION_COUNT_KEY);
      await AsyncStorage.removeItem(LAST_SESSION_DATE_KEY);
      this.currentSessionCount = 0;
      this.sessionInitialized = false;
      console.log('Sessions reset');
    } catch (error) {
      console.error('Error resetting sessions:', error);
    }
  }

  // Check if user is eligible for session-based features
  isEarlyUser(): boolean {
    return this.currentSessionCount <= 2; // First or second session
  }
}

export const sessionManager = SessionManager.getInstance(); 