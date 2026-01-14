import React, { useState } from 'react';
import KsvLogo from './KsvLogo';

interface LoginProps {
  onLogin: (username: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setIsLoading(true);
    // Simulate API call/Auth delay
    setTimeout(() => {
      onLogin(username);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-900 rounded-full blur-[120px] opacity-20"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-cyan-900 rounded-full blur-[120px] opacity-20"></div>
      </div>

      <div className="z-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-10 animate-breathing">
          <KsvLogo className="w-24 h-24 mb-6 shadow-[0_0_30px_rgba(29,114,184,0.5)] rounded-2xl" />
          <h1 className="text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            MARTINS
          </h1>
          <p className="text-gray-500 text-sm tracking-widest mt-2 uppercase">Sistema de Controle de Voz</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-3xl border border-slate-800 shadow-2xl flex flex-col gap-5">
          <div>
            <label className="text-xs font-semibold text-gray-400 ml-2 mb-1 block uppercase">Usuário</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-cyan-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder-slate-600"
              placeholder="Digite seu nome..."
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 ml-2 mb-1 block uppercase">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-cyan-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder-slate-600"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={!username || !password || isLoading}
            className={`mt-4 py-4 rounded-xl font-bold tracking-wide transition-all duration-300 flex items-center justify-center ${
              !username || !password 
                ? 'bg-slate-800 text-gray-500 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-900/50 hover:scale-[1.02]'
            }`}
          >
            {isLoading ? (
              <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              "ENTRAR"
            )}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-8">
          &copy; 2024 KSV Technologies. Acesso Restrito.
        </p>
      </div>
    </div>
  );
};

export default Login;