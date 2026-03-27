// ═══════════════════════════════════════════
//  META-GYPSI → TELEGRAM BOT
//  Notificações e relatórios diários
// ═══════════════════════════════════════════

let Telegraf;
try {
  Telegraf = require('telegraf').Telegraf;
} catch (e) {
  // Gracefully handle missing module in Electron context
}

class TelegramService {
  constructor() {
    this.bot = null;
    this.chatId = null;
    this.enabled = false;
  }
  
  // Initialize with bot token from env
  init() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (!token) {
      console.log('📱 Telegram: No TELEGRAM_BOT_TOKEN set, notifications disabled');
      return false;
    }
    
    if (!Telegraf) {
      console.log('📱 Telegram: Telegraf module not found, notifications disabled');
      return false;
    }
    
    try {
      this.bot = new Telegraf(token);
      this.chatId = chatId;
      this.enabled = true;
      
      // Setup commands
      this._setupCommands();
      
      // Start bot
      this.bot.launch();
      console.log('📱 Telegram Bot initialized');
      
      return true;
    } catch (error) {
      console.error('📱 Telegram init error:', error.message);
      return false;
    }
  }
  
  _setupCommands() {
    // /start command
    this.bot.command('start', (ctx) => {
      const welcome = `
🦊 **Meta-Gypsi Office Bot**

Bem-vindo ao seu escritório 3D de IAs!

Comandos disponíveis:
/status - Ver status do escritório
/relatorio - Gerar relatório do dia
/agentes - Listar agentes ativos
/tarefas - Ver tarefas pendentes

Seu chat ID: \`${ctx.chat.id}\`
      `;
      ctx.replyWithMarkdownV2(welcome);
    });
    
    // /status command
    this.bot.command('status', async (ctx) => {
      // This will be populated with real data
      ctx.reply('🏢 Escritório: *Online*\n🧠 Ollama: Conectado\n👥 Agentes: 2 ativos', { parse_mode: 'Markdown' });
    });
    
    // /relatorio command
    this.bot.command('relatorio', (ctx) => {
      ctx.reply('📊 Gerando relatório do dia... (em breve)');
    });
    
    // Handle text messages
    this.bot.on('text', (ctx) => {
      const text = ctx.message.text;
      
      // Check if this is a command to the office
      if (text.startsWith('@')) {
        // This is a task delegation via Telegram
        this._handleTelegramTask(ctx, text);
      } else {
        ctx.reply('🦊 Mensagem recebida! Use /start para ver os comandos disponíveis.');
      }
    });
  }
  
  _handleTelegramTask(ctx, text) {
    // Parse @agente tarefa
    const match = text.match(/@(\w+)\s+(.+)/);
    if (match) {
      const [, agente, tarefa] = match;
      ctx.reply(`📝 Tarefa recebida:\nAgente: ${agente}\nTarefa: ${tarefa}\n\nDelegando no escritório 3D...`);
      
      // TODO: Send to Meta-Gypsi backend
    } else {
      ctx.reply('❌ Formato inválido. Use: @agente descrição da tarefa');
    }
  }
  
  // Send daily report
  async sendDailyReport(stats) {
    if (!this.enabled || !this.chatId) return;
    
    const { date, tasksCompleted, agents, revenue } = stats;
    
    const report = `
📊 **Relatório Diário - Meta-Gypsi**
📅 ${date}

✅ Tarefas Concluídas: ${tasksCompleted}
👥 Agentes Ativos: ${agents}
💰 Receita Simulada: $${revenue.toFixed(2)}

🏆 Destaques do dia:
${stats.highlights?.map(h => `• ${h}`).join('\n') || 'Nenhum destaque registrado'}

🦊 *Meta-Gypsi Autonomous AI Corps*
    `;
    
    try {
      await this.bot.telegram.sendMessage(this.chatId, report, { parse_mode: 'Markdown' });
      console.log('📱 Daily report sent to Telegram');
    } catch (error) {
      console.error('📱 Failed to send report:', error.message);
    }
  }
  
  // Send task completion notification
  async sendTaskComplete(agentName, taskDesc, result) {
    if (!this.enabled || !this.chatId) return;
    
    const message = `
✅ **Tarefa Concluída**

👤 Agente: ${agentName}
📝 ${taskDesc.substring(0, 100)}${taskDesc.length > 100 ? '...' : ''}

${result.substring(0, 200)}${result.length > 200 ? '...' : ''}
    `;
    
    try {
      await this.bot.telegram.sendMessage(this.chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('📱 Failed to send notification:', error.message);
    }
  }
  
  // Send error notification
  async sendError(agentName, error) {
    if (!this.enabled || !this.chatId) return;
    
    const message = `
❌ **Erro no Escritório**

👤 Agente: ${agentName}
⚠️ ${error.substring(0, 200)}
    `;
    
    try {
      await this.bot.telegram.sendMessage(this.chatId, message, { parse_mode: 'Markdown' });
    } catch (e) {
      console.error('📱 Failed to send error:', e.message);
    }
  }
  
  stop() {
    if (this.bot) {
      this.bot.stop();
      console.log('📱 Telegram Bot stopped');
    }
  }
}

module.exports = { TelegramService };
