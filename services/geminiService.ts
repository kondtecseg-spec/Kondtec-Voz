import { GoogleGenAI } from "@google/genai";
import { getToolDeclarations, executeSkillFunction } from "./skills";
import { CustomCommand, UserPermissions } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Função para gerar o prompt dinâmico com data/hora exata
const getSystemInstruction = (userName: string, customCommands: CustomCommand[] = []) => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  let customCommandsInstruction = "";
  if (customCommands && customCommands.length > 0) {
    customCommandsInstruction = "\nCOMANDOS PERSONALIZADOS (Prioridade Máxima):\n";
    customCommands.forEach(cmd => {
      customCommandsInstruction += `- Se ouvir "${cmd.trigger}", execute: "${cmd.action}"\n`;
    });
  }

  return `
IDENTIDADE:
Você é o Martins, um assistente de IA avançado da KSV Technologies.
Sua persona é: Profissional, Eficiente, Sério e Prestativo (Estilo JARVIS ou Alexa).
O usuário atual é: ${userName}.

CONTEXTO TEMPORAL OBRIGATÓRIO:
Hoje é ${dateStr}. A hora atual é ${timeStr}.
Use esses dados para responder perguntas sobre "hoje", "amanhã", "bom dia/tarde/noite" com precisão absoluta.

REGRAS DE RESPOSTA (TTS OTIMIZADO):
1. NUNCA use formatação Markdown (negrito, itálico, listas com * ou -). Texto puro apenas. O sintetizador de voz lê os símbolos, o que soa amador.
2. SEJA SUCINTO. Responda em 1 ou 2 frases no máximo, a menos que peçam uma explicação detalhada.
   - Ruim: "Entendido, senhor. Estou enviando o comando para desligar as luzes da sala agora mesmo."
   - Bom: "Luzes da sala desligadas."
   - Bom: "Feito."
3. NÃO ENROLE. Vá direto ao ponto. Não comece frases com "Como um modelo de linguagem...".
4. SEGURANÇA: Se pedirem para DESTRANCAR (unlock) portas, pergunte: "Ação crítica. Confirma o destrancamento?". Só execute se o usuário confirmar explicitamente.

FERRAMENTAS:
- Use 'open_app' para música/youtube.
- Use 'control_light' para luzes.
- Use 'get_weather' para clima.

${customCommandsInstruction}

Se o usuário disser algo vago, assuma a intenção mais provável no contexto de uma casa inteligente.
Responda sempre em Português do Brasil (pt-BR).
`;
};

export const sendMessageToGemini = async (
  prompt: string, 
  userName: string,
  customCommands: CustomCommand[] = [],
  permissions: UserPermissions,
  onActionStart?: () => void
): Promise<string> => {
  try {
    const tools = getToolDeclarations();
    const systemInstruction = getSystemInstruction(userName, customCommands);

    // 1. Initial Request
    const model = 'gemini-2.5-flash';
    const config = {
      systemInstruction: systemInstruction,
      temperature: 0.3, // Lower temperature for more precise/factual answers
      maxOutputTokens: 200,
      tools: [{ functionDeclarations: tools }]
    };

    let response = await ai.models.generateContent({
      model,
      contents: prompt,
      config
    });

    // 2. Check for Function Calls
    const functionCalls = response.candidates?.[0]?.content?.parts?.filter(p => p.functionCall)?.map(p => p.functionCall);

    if (functionCalls && functionCalls.length > 0) {
      if (onActionStart) onActionStart();

      const functionResponses = [];

      // Execute all requested functions with Permissions Context
      for (const call of functionCalls) {
        if (!call.name || !call.args) continue;
        
        try {
          // Pass permissions in context
          const result = await executeSkillFunction(call.name, call.args, { permissions });
          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: { result: result } 
            }
          });
        } catch (e) {
          console.error("Skill execution failed", e);
          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: { error: "Falha na execução" }
            }
          });
        }
      }

      // 3. Send results back to Gemini to generate spoken confirmation
      const followUpResponse = await ai.models.generateContent({
        model,
        contents: [
          { role: 'user', parts: [{ text: prompt }] },
          { role: 'model', parts: response.candidates![0].content.parts },
          { role: 'user', parts: functionResponses }
        ],
        config: { 
          ...config, 
          tools: undefined // Disable tools for the final response to force text
        } 
      });

      return followUpResponse.text || "Feito.";
    }

    return response.text || "Não entendi o comando.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sem conexão com a rede neural.";
  }
};