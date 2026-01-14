import React, { useState, useEffect } from 'react';
import { UserSettings, CustomCommand } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (newSettings: UserSettings) => void;
  username: string;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave, username }) => {
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [newCmdTrigger, setNewCmdTrigger] = useState('');
  const [newCmdAction, setNewCmdAction] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'audio' | 'commands' | 'privacy'>('general');

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
      const loadVoices = () => {
        // Filter primarily for Portuguese, but allow others in case of misconfiguration
        const allVoices = window.speechSynthesis.getVoices();
        const ptVoices = allVoices.filter(v => v.lang.toLowerCase().includes('pt'));
        
        // If we have PT voices, just show those (cleaner UI). If not, show all.
        setAvailableVoices(ptVoices.length > 0 ? ptVoices : allVoices);
      };
      
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [isOpen, settings]);

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const addCommand = () => {
    if (newCmdTrigger && newCmdAction) {
      const newCmd: CustomCommand = {
        id: Date.now().toString(),
        trigger: newCmdTrigger.toLowerCase(),
        action: newCmdAction
      };
      setLocalSettings(prev => ({
        ...prev,
        customCommands: [...prev.customCommands, newCmd]
      }));
      setNewCmdTrigger('');
      setNewCmdAction('');
    }
  };

  const removeCommand = (id: string) => {
    setLocalSettings(prev => ({
      ...prev,
      customCommands: prev.customCommands.filter(c => c.id !== id)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-[0_0_50px_rgba(0,210,255,0.15)] flex flex-col overflow-hidden max-h-[85vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
          <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            CONFIGURAÇÕES DO SISTEMA
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 overflow-x-auto">
          {[
            { id: 'general', label: 'Perfil' },
            { id: 'audio', label: 'Áudio' },
            { id: 'commands', label: 'Comandos' },
            { id: 'privacy', label: 'Privacidade' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-4 px-2 text-sm font-medium tracking-wide transition-colors whitespace-nowrap ${
                activeTab === tab.id 
                ? 'text-cyan-400 border-b-2 border-cyan-500 bg-cyan-900/10' 
                : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.label.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-grow bg-slate-950/50">
          
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-cyan-400 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                  {username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">{username}</h3>
                  <p className="text-sm text-gray-500">Administrador Nível 1</p>
                </div>
              </div>
              
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300">Ativação por Voz</h4>
                    <p className="text-xs text-gray-500">O assistente escuta "Martins" continuamente.</p>
                  </div>
                  <button 
                    onClick={() => setLocalSettings({...localSettings, wakeWordEnabled: !localSettings.wakeWordEnabled})}
                    className={`w-12 h-6 rounded-full transition-colors relative ${localSettings.wakeWordEnabled ? 'bg-cyan-600' : 'bg-slate-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${localSettings.wakeWordEnabled ? 'left-7' : 'left-1'}`}></div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Audio Tab */}
          {activeTab === 'audio' && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Voz do Sistema (Português)</label>
                <div className="relative">
                  <select 
                    value={localSettings.voiceURI || ''}
                    onChange={(e) => setLocalSettings({...localSettings, voiceURI: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none appearance-none"
                  >
                    <option value="">Automático (Preferência Masculina)</option>
                    {availableVoices.map(v => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name.replace('Google', '').replace('Microsoft', '').replace('Portuguese', 'PT').trim()}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                   Dica: No Android, vozes nomeadas como "Voz 2" ou "Voz 3" costumam ser masculinas.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">
                  Velocidade da Fala ({localSettings.speechRate}x)
                </label>
                <input 
                  type="range" 
                  min="0.5" 
                  max="2" 
                  step="0.1"
                  value={localSettings.speechRate}
                  onChange={(e) => setLocalSettings({...localSettings, speechRate: parseFloat(e.target.value)})}
                  className="w-full accent-cyan-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">
                  Sensibilidade do Microfone ({Math.round(localSettings.micSensitivity * 100)}%)
                </label>
                <input 
                  type="range" 
                  min="0.1" 
                  max="1" 
                  step="0.1"
                  value={localSettings.micSensitivity}
                  onChange={(e) => setLocalSettings({...localSettings, micSensitivity: parseFloat(e.target.value)})}
                  className="w-full accent-blue-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div className="bg-red-900/20 p-4 rounded-xl border border-red-500/30 mb-4">
                <div className="flex gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-400 flex-shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    <div>
                        <h4 className="text-sm font-bold text-red-200">Zona de Controle de Acesso</h4>
                        <p className="text-xs text-red-200/70 mt-1">
                            Revogar permissões impedirá que o assistente execute certas tarefas, mesmo se solicitado.
                        </p>
                    </div>
                </div>
              </div>

              {/* Permission Toggles */}
              {[
                { 
                  label: "Abrir Aplicativos e Música", 
                  desc: "Permite abrir Spotify, YouTube e outros sites.",
                  key: 'allowAppControl'
                },
                { 
                  label: "Acesso à Localização (Clima)", 
                  desc: "Permite usar dados simulados de localização para clima.",
                  key: 'allowLocation'
                },
                { 
                  label: "Conteúdo Externo (Notícias)", 
                  desc: "Permite buscar e ler manchetes de notícias.",
                  key: 'allowExternalContent'
                },
              ].map((perm) => (
                <div key={perm.key} className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-300">{perm.label}</h4>
                      <p className="text-xs text-gray-500">{perm.desc}</p>
                    </div>
                    <button 
                      onClick={() => setLocalSettings(prev => ({
                        ...prev, 
                        permissions: { 
                          ...prev.permissions, 
                          [perm.key]: !prev.permissions[perm.key as keyof typeof prev.permissions] 
                        }
                      }))}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        localSettings.permissions[perm.key as keyof typeof localSettings.permissions] 
                        ? 'bg-green-600' 
                        : 'bg-slate-700'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                        localSettings.permissions[perm.key as keyof typeof localSettings.permissions] 
                        ? 'left-7' 
                        : 'left-1'
                      }`}></div>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Commands Tab */}
          {activeTab === 'commands' && (
            <div className="space-y-6">
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">Novo Comando</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <input 
                    type="text" 
                    placeholder="Gatilho (ex: Protocolo X)" 
                    value={newCmdTrigger}
                    onChange={(e) => setNewCmdTrigger(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none"
                  />
                  <input 
                    type="text" 
                    placeholder="Ação (ex: Ligar luzes)" 
                    value={newCmdAction}
                    onChange={(e) => setNewCmdAction(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none"
                  />
                </div>
                <button 
                  onClick={addCommand}
                  disabled={!newCmdTrigger || !newCmdAction}
                  className="w-full py-2 bg-slate-800 hover:bg-cyan-900/50 text-cyan-400 text-sm font-bold rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
                >
                  ADICIONAR COMANDO
                </button>
              </div>

              <div className="space-y-2">
                {localSettings.customCommands.map(cmd => (
                  <div key={cmd.id} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                    <div>
                      <p className="text-sm text-cyan-300 font-medium">"{cmd.trigger}"</p>
                      <p className="text-xs text-gray-500">→ {cmd.action}</p>
                    </div>
                    <button onClick={() => removeCommand(cmd.id)} className="text-red-500 hover:text-red-400 p-1">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors">
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg hover:scale-105 transition-all"
          >
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;