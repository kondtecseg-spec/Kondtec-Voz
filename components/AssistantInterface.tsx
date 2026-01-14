import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AssistantState, Message, UserSettings } from '../types';
import { sendMessageToGemini } from '../services/geminiService';
import { setTaskSchedulerListener } from '../services/skills'; 
import Visualizer from './Visualizer';
import KsvLogo from './KsvLogo';
import SettingsModal from './SettingsModal';

// ATUALIZAÇÃO: Palavras de ativação alteradas para "Olá"
const WAKE_WORDS = ['olá', 'ola', 'oi'];

interface AssistantInterfaceProps {
  userName: string;
  onLogout: () => void;
}

interface ScheduledTask {
  id: string;
  description: string;
  timeLeft: number;
}

const DEFAULT_SETTINGS: UserSettings = {
  voiceURI: null,
  speechRate: 1.2, // Slightly faster for efficiency
  wakeWordEnabled: true,
  micSensitivity: 0.5,
  customCommands: [],
  permissions: {
    allowAppControl: true,
    allowLocation: true,
    allowExternalContent: true
  }
};

const AssistantInterface: React.FC<AssistantInterfaceProps> = ({ userName, onLogout }) => {
  const [state, setState] = useState<AssistantState>(AssistantState.IDLE);
  const [messages, setMessages] = useState<Message[]>([]);
  const [transcriptDisplay, setTranscriptDisplay] = useState('');
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  
  // Settings State
  const [userSettings, setUserSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);
  const silenceTimerRef = useRef<number | null>(null);
  const isMounted = useRef(true);

  // --- Load Settings on Mount ---
  useEffect(() => {
    const saved = localStorage.getItem(`ksv_settings_${userName}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUserSettings({...DEFAULT_SETTINGS, ...parsed, permissions: {...DEFAULT_SETTINGS.permissions, ...(parsed.permissions || {})}});
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
  }, [userName]);

  // --- Scheduler Listener Setup ---
  useEffect(() => {
    setTaskSchedulerListener((description, delaySeconds) => {
      const newTask: ScheduledTask = {
        id: Date.now().toString(),
        description,
        timeLeft: delaySeconds
      };
      setScheduledTasks(prev => [...prev, newTask]);
    });

    const interval = setInterval(() => {
      setScheduledTasks(prev => 
        prev.map(task => ({ ...task, timeLeft: task.timeLeft - 1 }))
            .filter(task => task.timeLeft > 0)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const saveSettings = (newSettings: UserSettings) => {
    setUserSettings(newSettings);
    localStorage.setItem(`ksv_settings_${userName}`, JSON.stringify(newSettings));
    
    // Apply immediate side effects
    if (!newSettings.wakeWordEnabled && state === AssistantState.LISTENING_WAKE) {
        setState(AssistantState.IDLE);
        stopListening();
    } else if (newSettings.wakeWordEnabled && state === AssistantState.IDLE) {
        // User enabled wake word, try to start listening immediately
        setState(AssistantState.LISTENING_WAKE);
        startListening();
    }
  };

  const addMessage = (role: 'user' | 'assistant', text: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role,
      text,
      timestamp: new Date()
    }]);
  };

  // 1. Text to Speech Function
  const speak = useCallback((text: string, onEndCallback?: () => void) => {
    if (!synthRef.current) return;
    
    // Stop listening while speaking to avoid hearing itself
    stopListening();
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = userSettings.speechRate; // Should be around 1.1 to 1.3 for professional speed
    utterance.pitch = 0.9; // Deep but natural

    // Apply User Voice Preference or Auto-Select Male Voice
    const voices = synthRef.current.getVoices();
    let selectedVoice = null;
    
    if (userSettings.voiceURI) {
      selectedVoice = voices.find(v => v.voiceURI === userSettings.voiceURI);
    }
    
    if (!selectedVoice) {
       // --- SMART MALE VOICE SELECTION ---
       const maleKeywords = ['daniel', 'felipe', 'luciano', 'joao', 'fabio', 'ricardo', 'male', 'homem'];
       
       // 1. Try to find a known male Portuguese voice
       selectedVoice = voices.find(v => 
          v.lang.includes('pt') && 
          maleKeywords.some(key => v.name.toLowerCase().includes(key))
       );

       // 2. On Android, sometimes voices are just "Voice 1", "Voice 2". "Voice 2" or "3" is often male.
       if (!selectedVoice) {
         selectedVoice = voices.find(v => v.lang.includes('pt') && (v.name.includes('Voice 2') || v.name.includes('Voice 3') || v.name.includes('Voice II')));
       }

       // 3. Fallback to Microsoft (Often Daniel on Desktop)
       if (!selectedVoice) {
          selectedVoice = voices.find(v => v.lang.includes('pt-BR') && v.name.includes('Microsoft'));
       }

       // 4. Final Fallback to any PT-BR
       if (!selectedVoice) {
          selectedVoice = voices.find(v => v.lang.includes('pt-BR'));
       }
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      // If we are forcing a fallback to a potentially female voice (Google PT-BR), lower pitch more to simulate neutral/male
      if (selectedVoice.name.includes("Google") && !selectedVoice.name.toLowerCase().includes('male')) {
        utterance.pitch = 0.7; 
      }
    }

    utterance.onstart = () => setState(AssistantState.SPEAKING);
    
    utterance.onend = () => {
      if (!isMounted.current) return;
      
      if (onEndCallback) {
        onEndCallback();
      } else {
        // Default behavior: Return to listening loop
        if (userSettings.wakeWordEnabled) {
           setState(AssistantState.LISTENING_WAKE);
           startListening();
        } else {
           setState(AssistantState.IDLE);
        }
      }
    };

    utterance.onerror = () => {
       if (!isMounted.current) return;
       if (userSettings.wakeWordEnabled) {
        setState(AssistantState.LISTENING_WAKE);
        startListening();
      } else {
        setState(AssistantState.IDLE);
      }
    };

    synthRef.current.speak(utterance);
  }, [userSettings.voiceURI, userSettings.speechRate, userSettings.wakeWordEnabled]);

  // 2. Process Command
  const processCommand = useCallback(async (command: string) => {
    setState(AssistantState.PROCESSING);
    stopListening(); // Ensure mic is off during processing
    addMessage('user', command);
    
    const reply = await sendMessageToGemini(
      command, 
      userName, 
      userSettings.customCommands,
      userSettings.permissions, 
      () => {
        setState(AssistantState.EXECUTING_ACTION);
      }
    );
    
    addMessage('assistant', reply);
    speak(reply);
  }, [speak, userName, userSettings.customCommands, userSettings.permissions]);

  // 3. Speech Recognition Setup
  const initRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'pt-BR';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const fullText = (finalTranscript || interimTranscript).toLowerCase().trim();
      setTranscriptDisplay(fullText);

      setState(currentState => {
        // Ignore input if we are speaking or processing
        if (currentState === AssistantState.SPEAKING || 
            currentState === AssistantState.EXECUTING_ACTION || 
            currentState === AssistantState.PROCESSING ||
            currentState === AssistantState.IDLE) {
            return currentState;
        }

        // --- WAKE WORD LOGIC ---
        if (currentState === AssistantState.LISTENING_WAKE) {
          const detectedWakeWord = WAKE_WORDS.find(w => fullText.includes(w));
          
          if (detectedWakeWord) {
            const parts = fullText.split(detectedWakeWord);
            const potentialCommand = parts[1]?.trim();

            if (potentialCommand && potentialCommand.length > 5) {
               // "Olá ligar a luz" (One shot command)
               recognition.stop();
               processCommand(potentialCommand);
               return AssistantState.PROCESSING;
            } else {
              // "Olá..." (Waiting for command)
              // Clear silence timer if it exists
              if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
              
              // Set a timeout to go back to wake mode if no command follows
              silenceTimerRef.current = window.setTimeout(() => {
                 setState(AssistantState.LISTENING_WAKE);
                 setTranscriptDisplay('');
              }, 5000);

              return AssistantState.LISTENING_CMD;
            }
          }
        } 
        
        // --- COMMAND LOGIC ---
        else if (currentState === AssistantState.LISTENING_CMD) {
           if (finalTranscript && finalTranscript.length > 2) {
             recognition.stop();
             processCommand(finalTranscript);
             return AssistantState.PROCESSING;
           }
           
           // Debounce silence for command
           if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
           silenceTimerRef.current = window.setTimeout(() => {
             const minLength = (1 - userSettings.micSensitivity) * 10; 

             if (fullText.length > minLength) {
               recognition.stop();
               processCommand(fullText);
             } else {
               // Back to wake listening if it was just noise or too short
               if (userSettings.wakeWordEnabled) {
                 setState(AssistantState.LISTENING_WAKE);
               } else {
                 setState(AssistantState.IDLE);
               }
             }
           }, 4000);
        }

        return currentState;
      });
    };

    // Robust Error Handling for "Always On"
    recognition.onerror = (event: any) => {
        console.warn("Speech Recognition Error:", event.error);
        if (event.error === 'no-speech') {
            // Ignore no-speech errors, just keep going
            return;
        }
        // For other errors, we might want to restart in onend
    };

    // The "Always Active" Loop Logic
    recognition.onend = () => {
      // Use timeout to prevent rapid-fire restart loops causing browser throttle
      setTimeout(() => {
        if (!isMounted.current) return;

        setState(curr => {
            // If we are supposed to be sleeping or busy, don't restart
            if (curr === AssistantState.IDLE || 
                curr === AssistantState.PROCESSING || 
                curr === AssistantState.SPEAKING || 
                curr === AssistantState.EXECUTING_ACTION) {
                return curr;
            }

            // If we are in listening mode (Wake or Cmd), RESTART immediately
            if (userSettings.wakeWordEnabled) {
                try {
                    // Check if already started to avoid errors
                    recognition.start();
                    console.log("Microphone loop restarted.");
                } catch (e) {
                    // Often throws if already started, safe to ignore
                }
                
                // If we were waiting for a command but timed out, go back to waiting for wake word
                if (curr === AssistantState.LISTENING_CMD) {
                    return AssistantState.LISTENING_WAKE;
                }
            } else {
                return AssistantState.IDLE;
            }
            return curr;
        });
      }, 200);
    };

    return recognition;
  }, [processCommand, userSettings.micSensitivity, userSettings.wakeWordEnabled]);

  const startListening = () => {
    if (recognitionRef.current) {
        try { recognitionRef.current.start(); } catch(e) {}
    } else {
        const rec = initRecognition();
        if (rec) {
            recognitionRef.current = rec;
            try { recognitionRef.current.start(); } catch(e) {}
        }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
    }
  };

  const togglePower = () => {
    if (state === AssistantState.IDLE) {
      // Power ON
      window.speechSynthesis.getVoices(); // Warm up voices
      speak(`Olá ${userName}. KSV Martins Online.`, () => {
         // Force start
         setState(AssistantState.LISTENING_WAKE); 
         startListening();
      });
    } else {
      // Power OFF
      stopListening();
      speak("Sistemas desligando.", () => {
         setState(AssistantState.IDLE);
      });
    }
  };

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (recognitionRef.current) recognitionRef.current.abort();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      window.speechSynthesis.cancel();
    };
  }, []);

  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col items-center justify-between p-6 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-900 rounded-full blur-[120px] opacity-20"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-cyan-900 rounded-full blur-[120px] opacity-20"></div>
      </div>

      <header className="z-10 w-full flex justify-between items-center max-w-4xl mx-auto pt-2">
        <div className="flex items-center gap-3">
          <KsvLogo className="w-12 h-12 shadow-lg rounded-xl" />
          <h1 className="text-2xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            MARTINS
          </h1>
        </div>
        <div className="flex items-center gap-4">
            <span className="hidden md:block text-sm text-gray-400 font-medium tracking-wide">
                Olá, <span className="text-cyan-400">{userName}</span>
            </span>
            
            {/* Settings Button */}
            <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="Configurações"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>

            <div className={`text-xs border px-3 py-1 rounded-full mr-2 transition-colors duration-500 ${state === AssistantState.IDLE ? "text-gray-500 border-gray-800" : "text-cyan-400 border-cyan-500 shadow-[0_0_10px_rgba(0,210,255,0.3)]"}`}>
                {state === AssistantState.IDLE ? "OFFLINE" : "ONLINE"}
            </div>
            <button 
                onClick={onLogout}
                className="text-xs bg-slate-800 hover:bg-red-900/50 text-gray-400 hover:text-red-200 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
            >
                SAIR
            </button>
        </div>
      </header>

      <main className="z-10 flex flex-col items-center justify-center flex-grow w-full">
        
        {/* Scheduled Tasks Indicator */}
        {scheduledTasks.length > 0 && (
          <div className="absolute top-20 right-4 md:right-20 flex flex-col gap-2 pointer-events-none">
            {scheduledTasks.map(task => (
              <div key={task.id} className="bg-slate-900/80 border border-orange-500/50 rounded-lg p-2 flex items-center gap-3 shadow-lg animate-pulse-fast">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <div className="text-xs">
                  <p className="text-orange-200">{task.description}</p>
                  <p className="font-mono text-orange-400">-{task.timeLeft}s</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <Visualizer state={state} />

        <div className="mt-12 h-16 flex items-center justify-center w-full max-w-2xl text-center px-4">
            <p className="text-xl md:text-2xl font-light text-cyan-100/90 leading-relaxed transition-all duration-300">
                {state === AssistantState.LISTENING_WAKE && <span className="text-gray-600 italic text-base">Diga "Olá" para começar...</span>}
                {(state === AssistantState.LISTENING_CMD || state === AssistantState.PROCESSING) && (transcriptDisplay ? `"${transcriptDisplay}"` : "...")}
                {state === AssistantState.EXECUTING_ACTION && <span className="text-purple-400 font-medium">Acessando dispositivos...</span>}
                {state === AssistantState.SPEAKING && <span className="animate-pulse">Respondendo...</span>}
            </p>
        </div>
      </main>

      <section className="z-10 w-full max-w-2xl flex flex-col gap-4">
        <div className="flex justify-center mb-6">
            <button
                onClick={togglePower}
                className={`p-4 rounded-full transition-all duration-300 shadow-xl border-2 ${
                    state === AssistantState.IDLE 
                    ? 'bg-gray-800 border-gray-700 hover:border-gray-500 text-gray-400 hover:scale-105' 
                    : 'bg-cyan-900/30 border-cyan-500/50 text-cyan-400 shadow-[0_0_20px_rgba(0,210,255,0.2)] hover:scale-105'
                }`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1 0 12.728 0M12 3v9" />
                </svg>
            </button>
        </div>

        <div className="w-full bg-slate-900/50 backdrop-blur-md rounded-t-2xl border-t border-slate-800 h-48 overflow-y-auto p-4 flex flex-col gap-3 mask-image-gradient">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 sticky top-0 bg-slate-900/90 p-1 w-full backdrop-blur-sm z-20">Histórico</h3>
            {messages.length === 0 && <p className="text-gray-600 text-sm text-center py-4">Nenhuma conversa recente.</p>}
            
            {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                        msg.role === 'user' 
                        ? 'bg-blue-600/20 text-blue-100 rounded-br-none border border-blue-500/20' 
                        : 'bg-slate-800/80 text-gray-200 rounded-bl-none border border-slate-700'
                    }`}>
                        {msg.text}
                    </div>
                </div>
            ))}
            <div ref={chatEndRef} />
        </div>
      </section>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={userSettings}
        onSave={saveSettings}
        username={userName}
      />

    </div>
  );
};

export default AssistantInterface;