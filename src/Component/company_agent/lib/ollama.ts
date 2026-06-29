export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatOptions {
  temperature?: number;
  num_predict?: number;
}

export interface OllamaStatus {
  connected: boolean;
  models: string[];
  hasQwen: boolean;
  qwenModelName: string | null;
}

/**
 * A highly resilient fetch wrapper for Ollama APIs.
 * It first attempts to fetch through the local Vite development proxy (/api/ollama).
 * If the proxy is offline, fails, or returns a 404 (indicating a static build without dev server),
 * it automatically falls back to a direct call to the local Ollama instance (http://127.0.0.1:11434).
 */
export async function ollamaFetch(
  endpoint: string, // e.g. '/api/tags', '/api/chat', '/api/generate'
  options?: RequestInit
): Promise<Response> {
  const proxyUrl = `/api/ollama${endpoint}`;
  try {
    const res = await fetch(proxyUrl, options);
    // If the proxy returns 404, it might be a static/production build where the dev server proxy does not exist
    if (res.status === 404) {
      console.warn(`[Ollama Proxy 404]: Dev proxy not found at ${proxyUrl}. Trying direct fallback...`);
    } else {
      return res;
    }
  } catch (err) {
    console.warn(`[Ollama Proxy Failure]: Failed to connect through Vite proxy at ${proxyUrl}. Trying direct fallback...`, err);
  }

  const directUrl = `http://127.0.0.1:11434${endpoint}`;
  try {
    return await fetch(directUrl, options);
  } catch (err) {
    console.error(`[Ollama Direct Failure]: Failed to connect directly to local Ollama at ${directUrl}`, err);
    throw new Error(
      `Could not reach local Ollama. Checked proxy (${proxyUrl}) and direct fallback (${directUrl}). ` +
      `Please ensure your Ollama application is running.`
    );
  }
}

/**
 * Checks connection to the local Ollama instance and verifies if the Qwen model is available.
 */
export async function checkConnection(): Promise<OllamaStatus> {
  try {
    const res = await ollamaFetch('/api/tags');
    if (!res.ok) throw new Error('Failed to fetch Ollama tags');
    
    const data = await res.json();
    const models: string[] = (data.models || []).map((m: any) => m.name);
    
    // Look for any model name containing "qwen" (case insensitive)
    const qwenModel = models.find(m => m.toLowerCase().includes('qwen')) || null;
    
    return {
      connected: true,
      models,
      hasQwen: !!qwenModel,
      qwenModelName: qwenModel,
    };
  } catch (err) {
    console.warn('Ollama offline or tags endpoint unreachable:', err);
    return {
      connected: false,
      models: [],
      hasQwen: false,
      qwenModelName: null,
    };
  }
}

/**
 * Sends messages to Ollama and streams response chunks in real-time.
 */
export async function chatStream(
  messages: OllamaMessage[],
  model: string,
  options: OllamaChatOptions,
  onChunk: (text: string) => void,
  onDone: (fullText: string, metrics: { prompt_eval_count?: number; eval_count?: number }) => void,
  onError: (err: any) => void
): Promise<void> {
  try {
    const response = await ollamaFetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        options: {
          temperature: options.temperature ?? 0.7,
          num_predict: options.num_predict ?? 2048,
        },
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama chat stream failed with HTTP ${response.status}`);
    }

    if (!response.body) {
      throw new Error('ReadableStream is not supported by the browser response.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullText = '';
    let finalMetrics: { prompt_eval_count?: number; eval_count?: number } = {};

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      // Keep the last incomplete block in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          if (json.message?.content) {
            const chunk = json.message.content;
            fullText += chunk;
            onChunk(chunk);
          }
          if (json.done) {
            finalMetrics = {
              prompt_eval_count: json.prompt_eval_count,
              eval_count: json.eval_count,
            };
          }
        } catch (e) {
          console.warn('Failed to parse NDJSON line:', line, e);
        }
      }
    }

    // Process any leftover text in the buffer
    if (buffer.trim()) {
      try {
        const json = JSON.parse(buffer);
        if (json.message?.content) {
          const chunk = json.message.content;
          fullText += chunk;
          onChunk(chunk);
        }
        if (json.done) {
          finalMetrics = {
            prompt_eval_count: json.prompt_eval_count,
            eval_count: json.eval_count,
          };
        }
      } catch (e) {
        // ignore
      }
    }

    onDone(fullText, finalMetrics);
  } catch (err) {
    onError(err);
  }
}

/**
 * Strips Qwen 3's <think>...</think> chain-of-thought blocks from the response.
 */
export function stripThinkBlocks(text: string): string {
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  cleaned = cleaned.replace(/<think>[\s\S]*$/gi, '');
  return cleaned.trim();
}

/**
 * Uses the local Ollama LLM to extract ALL email addresses from text.
 * Supports merged multi-resume documents.
 */
export async function extractEmailsWithLLM(text: string, model: string): Promise<string[]> {
  try {
    const systemInstruction = `You are a precise resume data extractor. Your task is to extract all candidate email addresses from the text provided by the user.

Rules:
1. Extract every distinct email address found in the text.
2. Output ONLY the email addresses, one per line.
3. Do NOT include any introductions, explanations, thoughts, notes, markdown formatting, or HTML tags.
4. If no email addresses are found, output exactly "NONE".`;

    const res = await ollamaFetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: `Text:\n${text}` }
        ],
        stream: false,
        options: {
          temperature: 0,
          num_predict: 512,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama chat generate failed with HTTP ${res.status}`);
    }

    const data = await res.json();
    const rawResult = (data.message?.content || '').trim();
    
    // Strip Qwen 3 think blocks
    const result = stripThinkBlocks(rawResult);
    
    if (result.toUpperCase() === 'NONE' || !result) {
      return [];
    }

    // Extract all email-like patterns from the response
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = result.match(emailRegex);
    
    if (!matches || matches.length === 0) {
      return [];
    }

    // Deduplicate (case-insensitive)
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const email of matches) {
      const lower = email.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        unique.push(email);
      }
    }

    return unique;
  } catch (err) {
    console.error('Failed to extract emails with local LLM:', err);
    throw err;
  }
}

/**
 * Backward-compatible wrapper: extracts the first (primary) email.
 */
export async function extractEmailWithLLM(text: string, model: string): Promise<string | null> {
  const emails = await extractEmailsWithLLM(text, model);
  return emails.length > 0 ? emails[0] : null;
}

