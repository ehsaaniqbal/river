import { generateText } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { ActionType, BotDifficulty } from '@river/engine';

type BotPersona = {
  name: string;
  brief: string;
};

const personas: Record<BotDifficulty, BotPersona> = {
  BEGINNER: {
    name: 'Fish Freddy',
    brief: "A retired accountant who plays too many hands and can't believe his luck.",
  },
  INTERMEDIATE: {
    name: 'TAG Terry',
    brief: 'A young professional who read one poker book and talks constantly about position.',
  },
  ADVANCED: {
    name: 'GTO Gary',
    brief: 'A solver-minded regular who speaks in percentages, ranges, and pot fractions.',
  },
};

const openrouter = createOpenAICompatible({
  name: 'openrouter',
  apiKey: process.env.OPENROUTER_API_KEY ?? 'missing',
  baseURL: process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
});

function modelName(): string {
  return process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini';
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timeoutId: Timer | undefined;
  const timeout = new Promise<null>((resolve) => {
    timeoutId = setTimeout(() => resolve(null), ms);
  });
  const result = await Promise.race([promise, timeout]);

  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  return result;
}

async function generateWithTimeout(input: Parameters<typeof generateText>[0]): Promise<string | null> {
  try {
    const result = await withTimeout(generateText(input), 1200);
    return result ? compact(result.text) : null;
  } catch {
    return null;
  }
}

function compact(text: string): string {
  return text
    .replaceAll('"', '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 12)
    .join(' ');
}

export async function generateBotTableTalk(input: {
  difficulty: BotDifficulty;
  action: ActionType;
  amount: number;
  street: string;
  pot: number;
}): Promise<string | null> {
  if (!process.env.OPENROUTER_API_KEY || Math.random() > 0.7) {
    return null;
  }

  const persona = personas[input.difficulty];
  return generateWithTimeout({
    model: openrouter(modelName()),
    system: `You write poker table banter. Character: ${persona.name}. ${persona.brief} Max 12 words. No markdown.`,
    prompt: `${persona.name} just chose ${input.action} ${input.amount} on ${input.street}. Pot is ${input.pot}. Write one short in-character table comment.`,
    temperature: 0.9,
  });
}

export async function generateBotShowdownTalk(input: {
  difficulty: BotDifficulty;
  won: boolean;
  amount: number;
  handRank: string | null;
}): Promise<string | null> {
  if (!process.env.OPENROUTER_API_KEY) {
    return null;
  }

  const persona = personas[input.difficulty];
  const result = input.won
    ? `won ${input.amount} with ${input.handRank ?? 'no showdown'}`
    : `lost the hand`;

  return generateWithTimeout({
    model: openrouter(modelName()),
    system: `You write poker showdown reactions. Character: ${persona.name}. ${persona.brief} Max 12 words. No markdown.`,
    prompt: `${persona.name} ${result}. Write one brief in-character reaction.`,
    temperature: 0.85,
  });
}
