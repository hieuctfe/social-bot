import { Controller, Post, Body, Headers, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

/**
 * WebhookController — receives events from n8n and external services.
 * TODO: Add signature verification using CONTROL_API_WEBHOOK_SECRET.
 * TODO: Add handlers for Telegram-triggered events.
 * TODO: Add handler for Postiz publish status callbacks.
 */
@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  @Post('n8n')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'n8n workflow event receiver (TODO: implement fully)' })
  async n8nEvent(
    @Body() body: unknown,
    @Headers('x-webhook-secret') secret: string,
  ) {
    // TODO: validate secret === process.env.CONTROL_API_WEBHOOK_SECRET
    this.logger.log('Received n8n webhook', { body });
    return { received: true };
  }

  @Post('telegram')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Telegram update receiver (TODO: implement fully)' })
  async telegramUpdate(@Body() body: unknown) {
    // TODO: Parse TelegramUpdate, route to appropriate handler
    this.logger.log('Received Telegram webhook', { body });
    return { received: true };
  }
}
