import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { LLMController } from '~/controllers/llm/LLMController';

export async function action(args: ActionFunctionArgs) {
  const controller = new LLMController();
  return controller.handleRequest(args);
}
