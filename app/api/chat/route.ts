import { createMistral } from "@ai-sdk/mistral";
import { frontendTools } from "@assistant-ui/ai-sdk";
import { getCloudflareContext } from "@opennextjs/cloudflare";
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

  // On Workers the binding lives in the Cloudflare env; process.env is only
  // populated via nodejs_compat_populate_process_env, so read both.
  const cfEnv = (await getCloudflareContext({ async: true })).env as unknown as
    | Record<string, string | undefined>
    | undefined;
  const apiKey = cfEnv?.MISTRAL_API_KEY ?? process.env.MISTRAL_API_KEY;

  if (!apiKey) {
    console.error("MISTRAL_API_KEY is not set");
    return new Response("Server misconfigured: missing MISTRAL_API_KEY", {
      status: 500,
    });
  }

  const mistral = createMistral({ apiKey });

  const result = streamText({
    model: mistral("ministral-8b-latest"),
    messages: await convertToModelMessages(messages),
    tools: {
      ...frontendTools(tools ?? {}),
    },
    system: system ?? TORGE_SYSTEM_PROMPT,
    onError: ({ error }) => {
      console.error("streamText error:", error);
    },
  });

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      console.error("toUIMessageStreamResponse error:", error);
      if (error instanceof Error) return error.message;
      return String(error);
    },
  });
}
