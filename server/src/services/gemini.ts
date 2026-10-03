import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export interface GeminiConfig {
  modelName: string;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
}

export const defaultAiConfig: GeminiConfig = {
  modelName: 'gemini-1.5-flash',
  temperature: 0.1,
  maxOutputTokens: 2048,
  timeoutMs: 12000,
};

export function isGeminiConnected(): boolean {
  return Boolean(apiKey && apiKey.length > 10);
}

export function getAiConfig(): GeminiConfig & { isConnected: boolean } {
  return {
    ...defaultAiConfig,
    isConnected: isGeminiConnected(),
  };
}

export async function callGeminiStructured<T>(
  systemPrompt: string,
  userPrompt: string,
  config: Partial<GeminiConfig> = {}
): Promise<{ success: boolean; data?: T; rawText?: string; error?: string }> {
  if (!genAI || !apiKey) {
    return {
      success: false,
      error: 'GEMINI_API_KEY is not configured in environment.',
    };
  }

  const finalConfig: GeminiConfig = { ...defaultAiConfig, ...config };

  // Bounded retry policy (maximum 2 transient retries with exponential backoff)
  let lastError = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const model = genAI.getGenerativeModel({
        model: finalConfig.modelName,
        generationConfig: {
          temperature: finalConfig.temperature,
          maxOutputTokens: finalConfig.maxOutputTokens,
          responseMimeType: 'application/json',
        },
        systemInstruction: systemPrompt,
      });

      // Timeout promise
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Gemini API request timed out after ${finalConfig.timeoutMs}ms`)), finalConfig.timeoutMs)
      );

      const generatePromise = model.generateContent(userPrompt);
      const result = await Promise.race([generatePromise, timeoutPromise]);
      const rawText = result.response.text();

      try {
        const parsed = JSON.parse(rawText) as T;
        return { success: true, data: parsed, rawText };
      } catch (parseErr: any) {
        return {
          success: false,
          rawText,
          error: `Malformed JSON from model: ${parseErr?.message}`,
        };
      }
    } catch (err: any) {
      lastError = err?.message || 'Unknown Gemini API error';
      // Small exponential delay before attempt 2
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 600 * attempt));
      }
    }
  }

  return { success: false, error: lastError };
}
