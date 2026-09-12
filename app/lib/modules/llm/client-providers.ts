import type { ProviderInfo } from '~/types/model';

export const DEFAULT_PROVIDER_NAME = 'Anthropic';

export const PROVIDER_LIST: ProviderInfo[] = [
  {
    name: 'Anthropic',
    staticModels: [],
    getApiKeyLink: 'https://console.anthropic.com/settings/keys',
  },
  {
    name: 'Cerebras',
    staticModels: [],
    getApiKeyLink: 'https://cloud.cerebras.ai/settings',
  },
  {
    name: 'Cohere',
    staticModels: [],
    getApiKeyLink: 'https://dashboard.cohere.com/api-keys',
  },
  {
    name: 'Deepseek',
    staticModels: [],
    getApiKeyLink: 'https://platform.deepseek.com/apiKeys',
  },
  {
    name: 'Fireworks',
    staticModels: [],
    getApiKeyLink: 'https://fireworks.ai/api-keys',
  },
  {
    name: 'Google',
    staticModels: [],
    getApiKeyLink: 'https://aistudio.google.com/app/apikey',
  },
  {
    name: 'Groq',
    staticModels: [],
    getApiKeyLink: 'https://console.groq.com/keys',
  },
  {
    name: 'HuggingFace',
    staticModels: [],
    getApiKeyLink: 'https://huggingface.co/settings/tokens',
  },
  {
    name: 'Hyperbolic',
    staticModels: [],
    getApiKeyLink: 'https://app.hyperbolic.xyz/settings',
  },
  {
    name: 'LMStudio',
    staticModels: [],
    getApiKeyLink: 'https://lmstudio.ai/',
    icon: 'i-ph:cloud-arrow-down',
  },
  {
    name: 'Mistral',
    staticModels: [],
    getApiKeyLink: 'https://console.mistral.ai/api-keys/',
  },
  {
    name: 'Moonshot',
    staticModels: [],
    getApiKeyLink: 'https://platform.moonshot.ai/console/api-keys',
  },
  {
    name: 'Ollama',
    staticModels: [],
    getApiKeyLink: 'https://ollama.com/download',
    icon: 'i-ph:cloud-arrow-down',
  },
  {
    name: 'OpenAI',
    staticModels: [],
    getApiKeyLink: 'https://platform.openai.com/api-keys',
  },
  {
    name: 'OpenAILike',
    staticModels: [],
  },
  {
    name: 'OpenRouter',
    staticModels: [],
    getApiKeyLink: 'https://openrouter.ai/settings/keys',
  },
  {
    name: 'Perplexity',
    staticModels: [],
    getApiKeyLink: 'https://www.perplexity.ai/settings/api',
  },
  {
    name: 'Together',
    staticModels: [],
    getApiKeyLink: 'https://api.together.xyz/settings/api-keys',
  },
  {
    name: 'xAI',
    staticModels: [],
    getApiKeyLink: 'https://docs.x.ai/docs/quickstart#creating-an-api-key',
  },
  {
    name: 'AmazonBedrock',
    staticModels: [],
    getApiKeyLink: 'https://console.aws.amazon.com/iam/home',
  },
  {
    name: 'Github',
    staticModels: [],
    getApiKeyLink: 'https://github.com/settings/personal-access-tokens',
  },
  {
    name: 'Z.ai',
    staticModels: [],
    getApiKeyLink: 'https://open.bigmodel.cn/usercenter/apikeys',
  },
];

export const DEFAULT_PROVIDER =
  PROVIDER_LIST.find((provider) => provider.name === DEFAULT_PROVIDER_NAME) ?? PROVIDER_LIST[0];
