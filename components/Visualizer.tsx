import React from 'react';
import { AssistantState } from '../types';

interface VisualizerProps {
  state: AssistantState;
}

const Visualizer: React.FC<VisualizerProps> = ({ state }) => {
  let ringColor = 'border-gray-500';
  let glowColor = 'shadow-none';
  let animationClass = '';
  let icon = null;

  switch (state) {
    case AssistantState.IDLE:
      ringColor = 'border-gray-600 opacity-50';
      icon = <div className="w-4 h-4 rounded-full bg-red-500/50" />; // Muted red dot
      break;
    case AssistantState.LISTENING_WAKE:
      ringColor = 'border-martins-cyan';
      glowColor = 'shadow-[0_0_30px_rgba(0,210,255,0.3)]';
      animationClass = 'animate-breathing';
      break;
    case AssistantState.LISTENING_CMD:
      ringColor = 'border-martins-blue';
      glowColor = 'shadow-[0_0_50px_rgba(58,123,213,0.6)]';
      animationClass = 'scale-110 duration-200'; // Expanded
      break;
    case AssistantState.PROCESSING:
      ringColor = 'border-purple-500';
      glowColor = 'shadow-[0_0_40px_rgba(168,85,247,0.5)]';
      animationClass = 'animate-spin border-t-transparent border-l-transparent';
      break;
    case AssistantState.EXECUTING_ACTION:
      ringColor = 'border-orange-500';
      glowColor = 'shadow-[0_0_40px_rgba(249,115,22,0.6)]';
      animationClass = 'animate-pulse';
      break;
    case AssistantState.SPEAKING:
      ringColor = 'border-green-400';
      glowColor = 'shadow-[0_0_60px_rgba(74,222,128,0.6)]';
      animationClass = 'animate-talking';
      break;
    case AssistantState.ERROR:
      ringColor = 'border-red-600';
      glowColor = 'shadow-[0_0_30px_rgba(220,38,38,0.5)]';
      break;
  }

  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      {/* Outer Glow Ring */}
      <div 
        className={`absolute w-full h-full rounded-full border-4 ${ringColor} ${glowColor} ${animationClass} transition-all duration-500`}
      ></div>
      
      {/* Inner Core */}
      <div className={`relative z-10 w-48 h-48 rounded-full bg-slate-900 flex items-center justify-center border border-slate-700 shadow-inner`}>
         {state === AssistantState.IDLE ? (
           <span className="text-gray-500 font-medium">Desligado</span>
         ) : (
           <div className={`w-32 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80 ${state === AssistantState.SPEAKING ? 'animate-pulse' : ''} ${state === AssistantState.EXECUTING_ACTION ? 'bg-orange-500' : ''}`}></div>
         )}
      </div>

      {/* Status Text Overlay */}
      <div className="absolute -bottom-16 text-center w-full">
        <p className="text-slate-400 text-sm tracking-widest uppercase">
          {state === AssistantState.LISTENING_WAKE && "Ouvindo..."}
          {state === AssistantState.LISTENING_CMD && "Estou ouvindo"}
          {state === AssistantState.PROCESSING && "Pensando..."}
          {state === AssistantState.EXECUTING_ACTION && "Executando..."}
          {state === AssistantState.SPEAKING && "Falando..."}
        </p>
      </div>
    </div>
  );
};

export default Visualizer;