import { mistral } from "@ai-sdk/mistral";
import { frontendTools } from "@assistant-ui/ai-sdk";
import {
  streamText,
  convertToModelMessages,
  type UIMessage,
  type JSONSchema7,
} from "ai";
import { TORGE_SYSTEM_PROMPT } from "@/lib/torge-system-prompt";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const {
    messages,
    system,
    tools,
  }: {
    messages: UIMessage[];
    system?: string;
    tools?: Record<string, { description?: string; parameters: JSONSchema7 }>;
  } = await req.json();

  const result = streamText({
    model: mistral("ministral-8b-latest"),
    messages: await convertToModelMessages(messages),
    tools: {
      ...frontendTools(tools ?? {}),
    },
    system: system ?? TORGE_SYSTEM_PROMPT,
  });

  return result.toUIMessageStreamResponse();
}
