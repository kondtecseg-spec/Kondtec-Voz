import { FunctionDeclaration, Type } from "@google/genai";
import { UserPermissions } from "../types";

// --- SKILL FRAMEWORK ---

export interface SkillContext {
  permissions: UserPermissions;
}

export interface Skill {
  name: string;
  description: string;
  tools: FunctionDeclaration[];
  execute: (functionName: string, args: any, context: SkillContext) => Promise<any>;
}

// --- STATE MANAGEMENT ---
export const smartHomeState = {
  kitchenLight: { state: 'off', brightness: 100 },
  livingRoomLight: { state: 'off', brightness: 100 },
  thermostat: { temperature: 22, mode: 'cool' },
  frontDoor: { locked: true }
};

// Event listener for scheduled tasks
type TaskListener = (task: string, delay: number) => void;
let onTaskScheduled: TaskListener | null = null;

export const setTaskSchedulerListener = (listener: TaskListener) => {
  onTaskScheduled = listener;
};

// --- 1. SMART HOME SKILL ---

const smartHomeSkill: Skill = {
  name: "SmartHome",
  description: "Controle de dispositivos IoT e automação residencial.",
  tools: [
    {
      name: "control_light",
      description: "Ligar, desligar ou alterar brilho de luzes da casa.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          location: { type: Type.STRING, description: "O local da luz (ex: 'cozinha', 'sala', 'quarto')." },
          action: { type: Type.STRING, description: "Ação a realizar: 'on' (ligar), 'off' (desligar)." },
          brightness: { type: Type.NUMBER, description: "Opcional. Nível de brilho de 0 a 100." }
        },
        required: ["location", "action"]
      }
    },
    {
      name: "set_thermostat",
      description: "Ajustar a temperatura do termostato.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          temperature: { type: Type.NUMBER, description: "A temperatura desejada em graus Celsius." }
        },
        required: ["temperature"]
      }
    },
    {
      name: "control_lock",
      description: "CRÍTICO: Trancar ou destrancar portas. Requer confirmação explícita do usuário se a ação for 'unlock'.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING, description: "'lock' (trancar) ou 'unlock' (destrancar)." }
        },
        required: ["action"]
      }
    }
  ],
  execute: async (name, args) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    switch (name) {
      case 'control_light':
        const loc = args.location.toLowerCase().includes('cozinha') ? 'kitchenLight' : 'livingRoomLight';
        if (args.action === 'on') smartHomeState[loc].state = 'on';
        if (args.action === 'off') smartHomeState[loc].state = 'off';
        if (args.brightness) smartHomeState[loc].brightness = args.brightness;
        return { status: "success", message: `Luz da ${args.location} agora está ${args.action === 'on' ? 'ligada' : 'desligada'}.` };
      case 'set_thermostat':
        smartHomeState.thermostat.temperature = args.temperature;
        return { status: "success", message: `Termostato definido para ${args.temperature} graus.` };
      case 'control_lock':
        smartHomeState.frontDoor.locked = (args.action === 'lock');
        return { status: "success", message: `Porta da frente foi ${args.action === 'lock' ? 'trancada' : 'destrancada com sucesso'}.` };
      default:
        throw new Error("Function not found");
    }
  }
};

// --- 2. SCHEDULER SKILL ---

const schedulerSkill: Skill = {
  name: "Scheduler",
  description: "Agendamento de tarefas para execução futura.",
  tools: [
    {
      name: "schedule_task",
      description: "Agendar uma ação para o futuro.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          task_description: { type: Type.STRING, description: "Descrição verbal da tarefa (ex: 'desligar as luzes')." },
          delay_seconds: { type: Type.NUMBER, description: "Tempo de espera em segundos." }
        },
        required: ["task_description", "delay_seconds"]
      }
    }
  ],
  execute: async (name, args) => {
    if (name === 'schedule_task') {
      if (onTaskScheduled) onTaskScheduled(args.task_description, args.delay_seconds);
      setTimeout(() => { console.log(`[Scheduler] EXECUTING: ${args.task_description}`); }, args.delay_seconds * 1000);
      return { status: "success", message: `Tarefa "${args.task_description}" agendada para daqui a ${args.delay_seconds} segundos.` };
    }
    return { error: "Unknown tool" };
  }
};

// --- 3. INFORMATION SKILL (Time, Weather, News) ---

const informationSkill: Skill = {
  name: "Information",
  description: "Fornece informações gerais como hora, clima e notícias.",
  tools: [
    {
      name: "get_current_time",
      description: "Obter a data e hora atual do sistema.",
      parameters: { type: Type.OBJECT, properties: {} }
    },
    {
      name: "get_weather",
      description: "Obter a previsão do tempo atual.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          city: { type: Type.STRING, description: "Cidade para verificar o clima." }
        },
        required: ["city"]
      }
    },
    {
      name: "get_news",
      description: "Obter as últimas notícias ou manchetes.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, description: "Categoria (tecnologia, mundo, esportes)." }
        }
      }
    }
  ],
  execute: async (name, args, context) => {
    switch (name) {
      case 'get_current_time':
        const now = new Date();
        return { 
          time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          date: now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
        };

      case 'get_weather':
        if (!context.permissions.allowLocation) {
          return { error: "Permissão de localização negada nas configurações." };
        }
        // Mock Weather Data
        const conditions = ['Ensolarado', 'Nublado', 'Chuvoso', 'Tempestade'];
        const temp = Math.floor(Math.random() * (32 - 18) + 18);
        const condition = conditions[Math.floor(Math.random() * conditions.length)];
        return { 
          city: args.city,
          temperature: `${temp}°C`,
          condition: condition,
          humidity: "65%"
        };

      case 'get_news':
        if (!context.permissions.allowExternalContent) {
          return { error: "Permissão de conteúdo externo negada." };
        }
        // Mock News Data
        return {
          headlines: [
            "KSV lança nova IA revolucionária.",
            "Mercado de tecnologia sobe 5% hoje.",
            "Descoberta nova liga metálica para exploração espacial."
          ]
        };
        
      default:
        return { error: "Unknown tool" };
    }
  }
};

// --- 4. DEVICE CONTROL SKILL (Apps, Music) ---

const deviceControlSkill: Skill = {
  name: "DeviceControl",
  description: "Controlar aplicativos e mídia no dispositivo.",
  tools: [
    {
      name: "open_app",
      description: "Abrir um site ou aplicativo web (ex: Youtube, Spotify, Google).",
      parameters: {
        type: Type.OBJECT,
        properties: {
          app_name: { type: Type.STRING, description: "Nome do app ou site." }
        },
        required: ["app_name"]
      }
    }
  ],
  execute: async (name, args, context) => {
    if (name === 'open_app') {
      if (!context.permissions.allowAppControl) {
        return { error: "Permissão para abrir aplicativos desativada. Verifique as configurações de segurança." };
      }

      const appMap: Record<string, string> = {
        'spotify': 'https://open.spotify.com',
        'youtube': 'https://www.youtube.com',
        'google': 'https://www.google.com',
        'whatsapp': 'https://web.whatsapp.com',
        'netflix': 'https://www.netflix.com',
        'email': 'https://gmail.com'
      };

      const key = Object.keys(appMap).find(k => args.app_name.toLowerCase().includes(k));
      const url = key ? appMap[key] : `https://www.google.com/search?q=${args.app_name}`;

      // Open in new tab
      window.open(url, '_blank');

      return { status: "success", message: `Abrindo ${args.app_name}...` };
    }
    return { error: "Unknown tool" };
  }
};

// --- REGISTRY ---

const registeredSkills: Skill[] = [
  smartHomeSkill, 
  schedulerSkill, 
  informationSkill, 
  deviceControlSkill
];

export const getToolDeclarations = (): FunctionDeclaration[] => {
  return registeredSkills.flatMap(s => s.tools);
};

export const executeSkillFunction = async (name: string, args: any, context: SkillContext): Promise<any> => {
  const skill = registeredSkills.find(s => s.tools.some(t => t.name === name));
  if (!skill) throw new Error(`Skill not found for tool: ${name}`);
  return skill.execute(name, args, context);
};