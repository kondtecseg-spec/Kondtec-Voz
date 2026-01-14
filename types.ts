export enum AssistantState {
  IDLE = 'IDLE',               // Microphone off
  LISTENING_WAKE = 'LISTENING_WAKE', // Microphone on, waiting for "Martins"
  LISTENING_CMD = 'LISTENING_CMD',   // Heard "Martins", listening for command
  PROCESSING = 'PROCESSING',   // Sending to Gemini
  EXECUTING_ACTION = 'EXECUTING_ACTION', // Running a skill/tool (IoT)
  SPEAKING = 'SPEAKING',       // TTS active
  ERROR = 'ERROR'
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export interface CustomCommand {
  id: string;
  trigger: string; // ex: "protocolo fantasma"
  action: string;  // ex: "apagar todas as luzes e trancar a porta"
}

export interface UserPermissions {
  allowAppControl: boolean; // Open tabs, play music
  allowLocation: boolean;   // Weather info
  allowExternalContent: boolean; // News
}

export interface UserSettings {
  voiceURI: string | null;
  speechRate: number; // 0.5 to 2
  wakeWordEnabled: boolean;
  micSensitivity: number; // 0 to 1 (simulated threshold)
  customCommands: CustomCommand[];
  permissions: UserPermissions;
}

export interface UserProfile {
  username: string;
  settings: UserSettings;
}

// Augment window for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}