// TODO: Implement Telegram bot client when Telegram integration is required.
// This package will wrap the Telegram Bot API or grammy/telegraf library.
// For now it exports placeholder types.

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramMessage {
  message_id: number;
  chat: { id: number; type: string };
  text?: string;
  date: number;
}

export interface TelegramCallbackQuery {
  id: string;
  data?: string;
  message?: TelegramMessage;
}

export interface TelegramClientConfig {
  botToken: string;
  webhookSecret?: string;
}

/**
 * Placeholder Telegram client.
 * TODO: Implement sendMessage, sendPhoto, answerCallbackQuery, etc.
 */
export class TelegramClient {
  constructor(private readonly config: TelegramClientConfig) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async sendMessage(_chatId: number, _text: string): Promise<void> {
    throw new Error('TelegramClient.sendMessage not implemented yet');
  }
}
