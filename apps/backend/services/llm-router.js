// ═══════════════════════════════════════════
//  OPEN TYCOON — LLM Router
//  Roteador multi-provider: cada agente pode usar um LLM diferente
//  Suporta: OpenAI, Anthropic, Ollama (local)
// ═══════════════════════════════════════════

const PROVIDERS = ['openai', 'anthropic', 'ollama'];

// Modelos disponíveis por provider (referência — Ollama é dinâmico)
const KNOWN_MODELS = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
  anthropic: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
  ollama: [], // qualquer modelo local instalado
};

// ── Resolução de config ───────────────────────────────────────────────────────

function resolveProvider(agentConfig = {}) {
  return (
    agentConfig.llm_provider ||
    process.env.DEFAULT_LLM_PROVIDER ||
    'openai'
  );
}

function resolveModel(provider, agentConfig = {}) {
  if (agentConfig.llm_model) return agentConfig.llm_model;
  const defaults = {
    openai: 'gpt-4o-mini',
    anthropic: 'claude-sonnet-4-6',
    ollama: process.env.OLLAMA_DEFAULT_MODEL || 'qwen2.5-coder:7b',
  };
  return defaults[provider] || 'gpt-4o-mini';
}

// Se OpenAI key ausente, faz fallback automático para Ollama
async function resolveProviderWithFallback(provider) {
  if (provider === 'openai' && !process.env.OPENAI_API_KEY) {
    console.warn('⚠️  OPENAI_API_KEY não encontrada — fallback automático para Ollama');
    return 'ollama';
  }
  if (provider === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  ANTHROPIC_API_KEY não encontrada — fallback automático para Ollama');
    return 'ollama';
  }
  return provider;
}

function getOllamaUrl() {
  return (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/$/, '');
}

// ── OpenAI ───────────────────────────────────────────────────────────────────

async function chatOpenAI(messages, model, options = {}) {
  const fetch = require('cross-fetch');
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 2048,
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    model,
    provider: 'openai',
    tokens: data.usage?.total_tokens || 0,
  };
}

async function chatStreamOpenAI(messages, model, options = {}, onChunk) {
  const fetch = require('cross-fetch');
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 2048,
      stream: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI stream error ${res.status}: ${err}`);
  }

  return new Promise((resolve, reject) => {
    const decoder = new TextDecoder();
    res.body.on('data', (chunk) => {
      const text = decoder.decode(chunk, { stream: true });
      for (const line of text.split('\n')) {
        if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
        try {
          const json = JSON.parse(line.slice(6));
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) onChunk(delta);
        } catch (_) {}
      }
    });
    res.body.on('end', resolve);
    res.body.on('error', reject);
  });
}

// ── Anthropic ────────────────────────────────────────────────────────────────

async function chatAnthropic(messages, model, options = {}) {
  const fetch = require('cross-fetch');
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada');

  // Anthropic exige que system seja campo separado
  const systemMsg = messages.find(m => m.role === 'system');
  const userMessages = messages.filter(m => m.role !== 'system');

  const body = {
    model,
    max_tokens: options.max_tokens ?? 2048,
    messages: userMessages,
    ...(systemMsg ? { system: systemMsg.content } : {}),
  };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return {
    content: data.content?.[0]?.text || '',
    model,
    provider: 'anthropic',
    tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
  };
}

async function chatStreamAnthropic(messages, model, options = {}, onChunk) {
  const fetch = require('cross-fetch');
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada');

  const systemMsg = messages.find(m => m.role === 'system');
  const userMessages = messages.filter(m => m.role !== 'system');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: options.max_tokens ?? 2048,
      messages: userMessages,
      stream: true,
      ...(systemMsg ? { system: systemMsg.content } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic stream error ${res.status}: ${err}`);
  }

  return new Promise((resolve, reject) => {
    const decoder = new TextDecoder();
    res.body.on('data', (chunk) => {
      const text = decoder.decode(chunk, { stream: true });
      for (const line of text.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        try {
          const json = JSON.parse(line.slice(6));
          if (json.type === 'content_block_delta' && json.delta?.text) {
            onChunk(json.delta.text);
          }
        } catch (_) {}
      }
    });
    res.body.on('end', resolve);
    res.body.on('error', reject);
  });
}

// ── Ollama ───────────────────────────────────────────────────────────────────

async function chatOllama(messages, model, options = {}) {
  const fetch = require('cross-fetch');
  const url = getOllamaUrl();

  const res = await fetch(`${url}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.7,
        num_ctx: options.num_ctx ?? 4096,
        top_p: 0.9,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama error ${res.status}: ${err}`);
  }

  // Ollama retorna NDJSON mesmo com stream:false em algumas versões
  const text = await res.text();
  let content = '';
  for (const line of text.split('\n').filter(l => l.trim())) {
    try {
      const json = JSON.parse(line);
      content += json.message?.content || '';
    } catch (_) {}
  }

  return { content: content.trim(), model, provider: 'ollama', tokens: 0 };
}

async function chatStreamOllama(messages, model, options = {}, onChunk) {
  const fetch = require('cross-fetch');
  const url = getOllamaUrl();

  const res = await fetch(`${url}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      options: {
        temperature: options.temperature ?? 0.7,
        num_ctx: options.num_ctx ?? 4096,
        top_p: 0.9,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama stream error ${res.status}: ${err}`);
  }

  return new Promise((resolve, reject) => {
    const decoder = new TextDecoder();
    res.body.on('data', (chunk) => {
      const text = decoder.decode(chunk, { stream: true });
      for (const line of text.split('\n').filter(l => l.trim())) {
        try {
          const json = JSON.parse(line);
          if (json.message?.content) onChunk(json.message.content);
        } catch (_) {}
      }
    });
    res.body.on('end', resolve);
    res.body.on('error', reject);
  });
}

// ── Interface pública ────────────────────────────────────────────────────────

/**
 * Envia mensagens para o LLM do agente (sem streaming).
 * @param {Array<{role: string, content: string}>} messages
 * @param {Object} agentConfig - { llm_provider?, llm_model? }
 * @param {Object} options     - { temperature?, max_tokens?, num_ctx? }
 * @returns {Promise<{content: string, model: string, provider: string, tokens: number}>}
 */
async function chat(messages, agentConfig = {}, options = {}) {
  const requestedProvider = resolveProvider(agentConfig);
  const provider = await resolveProviderWithFallback(requestedProvider);
  const model = resolveModel(provider, agentConfig);

  console.log(`🧠 LLM Router → ${provider}/${model}`);

  try {
    let result;
    if (provider === 'openai') result = await chatOpenAI(messages, model, options);
    else if (provider === 'anthropic') result = await chatAnthropic(messages, model, options);
    else result = await chatOllama(messages, model, options);

    console.log(`✅ Resposta recebida (${result.tokens} tokens)`);
    return result;
  } catch (err) {
    console.error(`🔄 Erro no provider ${provider}: ${err.message}`);

    // Fallback de último recurso: tenta Ollama local
    if (provider !== 'ollama') {
      console.warn('🔄 Tentando fallback para Ollama...');
      const ollamaModel = resolveModel('ollama', {});
      return chatOllama(messages, ollamaModel, options);
    }
    throw err;
  }
}

/**
 * Versão streaming — chama onChunk para cada fragmento de texto recebido.
 * @param {Array<{role: string, content: string}>} messages
 * @param {Object} agentConfig - { llm_provider?, llm_model? }
 * @param {Object} options     - { temperature?, max_tokens?, num_ctx? }
 * @param {Function} onChunk   - callback(fragmento: string)
 * @returns {Promise<void>}
 */
async function chatStream(messages, agentConfig = {}, options = {}, onChunk) {
  const requestedProvider = resolveProvider(agentConfig);
  const provider = await resolveProviderWithFallback(requestedProvider);
  const model = resolveModel(provider, agentConfig);

  console.log(`🧠 LLM Router (stream) → ${provider}/${model}`);

  try {
    if (provider === 'openai') await chatStreamOpenAI(messages, model, options, onChunk);
    else if (provider === 'anthropic') await chatStreamAnthropic(messages, model, options, onChunk);
    else await chatStreamOllama(messages, model, options, onChunk);

    console.log('✅ Stream concluído');
  } catch (err) {
    console.error(`🔄 Erro no stream ${provider}: ${err.message}`);

    if (provider !== 'ollama') {
      console.warn('🔄 Tentando fallback stream para Ollama...');
      const ollamaModel = resolveModel('ollama', {});
      await chatStreamOllama(messages, ollamaModel, options, onChunk);
    } else {
      throw err;
    }
  }
}

/**
 * Retorna providers disponíveis com base nas variáveis de ambiente.
 * Ollama é sempre incluído — disponibilidade real verificada em runtime.
 * @returns {string[]}
 */
function getAvailableProviders() {
  const available = [];
  if (process.env.OPENAI_API_KEY) available.push('openai');
  if (process.env.ANTHROPIC_API_KEY) available.push('anthropic');
  available.push('ollama');
  return available;
}

module.exports = { chat, chatStream, getAvailableProviders, PROVIDERS, KNOWN_MODELS };
