import { GatewayError, generateResponse, generateMessage } from "@lovable.dev/ai-gateway";
import { z } from "zod";
import type { CallTool } from "./pipeline";

/** Adapt the existing schemas to each model's native forced-tool surface, without changing prompts. */
export const callGenerationTool: CallTool = async (role, messages, tool) => {
  const parameters = z.record(z.string(), z.unknown()).parse(JSON.parse(JSON.stringify(tool.function.parameters)));
  try {
    if (role === "creator") {
      const response = await generateResponse({
        model: "openai/gpt-6-astra",
        input: messages,
        tools: [{ type: "function", name: tool.function.name, description: tool.function.description, parameters, strict: false }],
        tool_choice: { type: "function", name: tool.function.name },
        parallel_tool_calls: false,
      });
      const calls = response.output.filter((item) => item.type === "function_call" && item.name === tool.function.name);
      const call = calls[0];
      if (response.status !== "completed" || calls.length !== 1 || !call || call.type !== "function_call") {
        throw new Error("DI nepateikė uždavinio. Pabandykite dar kartą.");
      }
      return JSON.parse(call.arguments);
    }
    const response = await generateMessage({
      model: "anthropic/claude-fable-5-1",
      max_tokens: 16384,
      system: messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n"),
      messages: messages.filter((m) => m.role === "user").map((m) => ({ role: "user" as const, content: m.content })),
      tools: [{ name: tool.function.name, description: tool.function.description, input_schema: { ...parameters, type: "object" } }],
      tool_choice: { type: "tool", name: tool.function.name, disable_parallel_tool_use: true },
    });
    const calls = response.content.filter((item) => item.type === "tool_use" && item.name === tool.function.name);
    const call = calls[0];
    if (response.stop_reason !== "tool_use" || calls.length !== 1 || !call || call.type !== "tool_use") {
      throw new Error("Nepavyko patikrinti atsakymo. Pabandykite dar kartą.");
    }
    return call.input;
  } catch (error) {
    if (error instanceof GatewayError) {
      console.error("Task generation gateway failure", { code: error.code, ids: error.ids, outcome: error.outcome, recovery: error.recovery });
      if (error.code === "payment_required") throw new Error("DI kreditai išnaudoti. Papildykite kreditus ir bandykite dar kartą.");
      if (error.code === "rate_limit") throw new Error("DI šiuo metu užimtas. Pabandykite vėliau.");
      if (error.code === "permission_denied") throw new Error("DI prieiga neleidžiama. Patikrinkite projekto DI nustatymus.");
      throw new Error("Nepavyko gauti DI atsakymo. Pabandykite vėliau.");
    }
    throw error;
  }
};
