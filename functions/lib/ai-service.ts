/**
 * AI Service Helper - Unified interface for Google Gemini and OpenRouter
 */

import { GoogleGenAI, Type, Schema } from "@google/genai";

export type AIProvider = 'google' | 'openrouter';

export interface AIConfig {
  provider: AIProvider;
  googleApiKey?: string;
  openrouterApiKey?: string;
  googleModel?: string;
  openrouterModel?: string;
}

export interface GenerateContentOptions {
  prompt: string;
  schema?: Schema;
  temperature?: number;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Generate content using the configured AI provider
 */
export async function generateContent(
  config: AIConfig,
  options: GenerateContentOptions
): Promise<string> {
  const { prompt, schema, temperature = 0.3, maxRetries = 3, retryDelay = 2000 } = options;

  if (config.provider === 'google') {
    return generateWithGoogle(config, prompt, schema, temperature, maxRetries, retryDelay);
  } else {
    return generateWithOpenRouter(config, prompt, schema, temperature, maxRetries, retryDelay);
  }
}

/**
 * Generate content using Google Gemini
 */
async function generateWithGoogle(
  config: AIConfig,
  prompt: string,
  schema: Schema | undefined,
  temperature: number,
  maxRetries: number,
  retryDelay: number
): Promise<string> {
  if (!config.googleApiKey) {
    throw new Error('Google API key not configured');
  }

  const ai = new GoogleGenAI({ apiKey: config.googleApiKey });
  const model = config.googleModel || 'gemini-2.0-flash-exp';

  let text: string | undefined;
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          ...(schema && {
            responseMimeType: "application/json",
            responseSchema: schema,
          }),
          ...(temperature !== undefined && { temperature }),
        },
      });

      text = response.text;
      break;
    } catch (error: any) {
      lastError = error;
      const errorMessage = error?.message || JSON.stringify(error);
      const isOverloadError = errorMessage.includes('overloaded') || 
                              errorMessage.includes('503') || 
                              errorMessage.includes('UNAVAILABLE') ||
                              errorMessage.includes('rate limit');

      if (isOverloadError && attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }

  if (!text) {
    throw lastError || new Error('No response from Google AI after retries');
  }

  return text;
}

/**
 * Generate content using OpenRouter
 */
async function generateWithOpenRouter(
  config: AIConfig,
  prompt: string,
  schema: Schema | undefined,
  temperature: number,
  maxRetries: number,
  retryDelay: number
): Promise<string> {
  if (!config.openrouterApiKey) {
    throw new Error('OpenRouter API key not configured');
  }

  const model = config.openrouterModel || 'anthropic/claude-3.5-sonnet';

  // Convert schema to OpenRouter format (JSON Schema)
  const jsonSchema = schema ? convertToJSONSchema(schema) : undefined;

  let text: string | undefined;
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Build request body
      const requestBody: any = {
        model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature,
      };

      // Add JSON schema if provided (only for models that support it)
      // Note: Not all models support structured output, so we'll try with schema first
      // and fall back to regular generation if needed
      if (jsonSchema) {
        // For Claude models, use response_format
        if (model.includes('claude') || model.includes('anthropic')) {
          requestBody.response_format = {
            type: 'json_schema',
            json_schema: {
              name: 'response',
              schema: jsonSchema,
              strict: true,
            },
          };
        } else {
          // For other models, add schema instruction to prompt
          requestBody.messages[0].content = `${prompt}\n\nIMPORTANT: You must respond with valid JSON matching this schema:\n${JSON.stringify(jsonSchema, null, 2)}`;
        }
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.openrouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://japanvarietyprivate.knox-thought.com',
          'X-Title': 'Japan Variety Private',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(JSON.stringify(errorData));
      }

      const data = await response.json();
      let rawText = data.choices?.[0]?.message?.content;

      if (!rawText) {
        throw new Error('No content in OpenRouter response');
      }

      // Clean the response text
      text = cleanJsonResponse(rawText);

      break;
    } catch (error: any) {
      lastError = error;
      const errorMessage = error?.message || JSON.stringify(error);
      const isOverloadError = errorMessage.includes('overloaded') || 
                              errorMessage.includes('503') || 
                              errorMessage.includes('rate limit') ||
                              errorMessage.includes('429');

      if (isOverloadError && attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }

  if (!text) {
    throw lastError || new Error('No response from OpenRouter after retries');
  }

  return text;
}

/**
 * Clean JSON response from AI - remove control characters and extract from markdown
 */
function cleanJsonResponse(text: string): string {
  let cleaned = text;

  // Extract JSON from markdown code blocks if present
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    cleaned = jsonMatch[1];
  }

  // Remove control characters except valid whitespace (space, tab, newline, carriage return)
  // Control characters are 0x00-0x1F except 0x09 (tab), 0x0A (newline), 0x0D (carriage return)
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Fix common issues with escaped characters in JSON strings
  // Replace literal newlines inside JSON string values with escaped newlines
  // This is tricky - we need to handle newlines that are inside string values
  try {
    // First, try to parse as-is
    JSON.parse(cleaned);
    return cleaned;
  } catch (e) {
    // If parsing fails, try to fix common issues
    
    // Replace unescaped newlines within strings
    // Look for strings and escape their internal newlines
    cleaned = cleaned.replace(/"([^"\\]|\\.)*"/g, (match) => {
      // Replace actual newlines with escaped newlines inside the string
      return match
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
    });

    // Try parsing again
    try {
      JSON.parse(cleaned);
      return cleaned;
    } catch (e2) {
      // Last resort - aggressive cleanup
      // Remove all newlines and extra spaces, keeping the structure
      const aggressive = cleaned
        .replace(/\n/g, ' ')
        .replace(/\r/g, ' ')
        .replace(/\t/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      return aggressive;
    }
  }
}

/**
 * Convert Google GenAI Schema to JSON Schema format
 */
function convertToJSONSchema(schema: Schema): any {
  if (schema.type === Type.OBJECT) {
    const jsonSchema: any = {
      type: 'object',
      properties: {},
      required: [],
    };

    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        jsonSchema.properties[key] = convertPropertyToJSONSchema(prop as Schema);
        if ((prop as Schema).required) {
          jsonSchema.required.push(key);
        }
      }
    }

    if (schema.required && Array.isArray(schema.required)) {
      jsonSchema.required = [...new Set([...jsonSchema.required, ...schema.required])];
    }

    return jsonSchema;
  }

  return convertPropertyToJSONSchema(schema);
}

function convertPropertyToJSONSchema(prop: Schema): any {
  switch (prop.type) {
    case Type.STRING:
      return {
        type: 'string',
        ...(prop.description && { description: prop.description }),
      };
    case Type.NUMBER:
    case Type.INTEGER:
      return {
        type: prop.type === Type.INTEGER ? 'integer' : 'number',
        ...(prop.description && { description: prop.description }),
      };
    case Type.BOOLEAN:
      return {
        type: 'boolean',
        ...(prop.description && { description: prop.description }),
      };
    case Type.ARRAY:
      if (prop.items) {
        return {
          type: 'array',
          items: convertPropertyToJSONSchema(prop.items as Schema),
          ...(prop.description && { description: prop.description }),
        };
      }
      return {
        type: 'array',
        ...(prop.description && { description: prop.description }),
      };
    case Type.OBJECT:
      return convertToJSONSchema(prop);
    default:
      return {
        type: 'string',
        ...(prop.description && { description: prop.description }),
      };
  }
}

/**
 * Load AI configuration from database and environment variables
 * API Keys are stored in Cloudflare Environment Variables (not in database)
 */
export async function loadAIConfig(env: { DB: D1Database; GEMINI_API_KEY?: string; OPENROUTER_API_KEY?: string }): Promise<AIConfig> {
  // API Keys always come from environment variables (Cloudflare settings)
  const googleApiKey = env.GEMINI_API_KEY || '';
  const openrouterApiKey = env.OPENROUTER_API_KEY || '';

  // Provider and model selection come from database (if available)
  let provider: AIProvider = 'google';
  let googleModel = 'gemini-2.0-flash-exp';
  let openrouterModel = 'anthropic/claude-3.5-sonnet';

  try {
    const { results } = await env.DB.prepare(`
      SELECT key, value FROM settings WHERE key IN ('ai_provider', 'openrouter_model', 'google_model')
    `).all();

    const settings: Record<string, string> = {};
    (results || []).forEach((row: any) => {
      settings[row.key] = row.value;
    });

    if (settings.ai_provider) {
      provider = settings.ai_provider as AIProvider;
    }
    if (settings.google_model) {
      googleModel = settings.google_model;
    }
    if (settings.openrouter_model) {
      openrouterModel = settings.openrouter_model;
    }
  } catch (error) {
    // Settings table might not exist yet, use defaults
  }

  return {
    provider,
    googleApiKey,
    openrouterApiKey,
    googleModel,
    openrouterModel,
  };
}
