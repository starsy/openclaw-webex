/**
 * Webex Webhook Handler Module
 */

import * as crypto from 'crypto';
import fetch from 'node-fetch';

import type {
  WebexChannelConfig,
  WebexWebhookPayload,
  WebexWebhookData,
  WebexMessage,
  WebexWebhook,
  CreateWebhookRequest,
  OpenClawEnvelope,
  OpenClawAttachment,
  PaginatedResponse,
} from './types';

const DEFAULT_API_BASE_URL = 'https://webexapis.com/v1';

export class WebexWebhookHandler {
  private config: WebexChannelConfig;
  private apiBaseUrl: string;
  private botId: string | null = null;

  constructor(config: WebexChannelConfig) {
    this.config = config;
    this.apiBaseUrl = config.apiBaseUrl || DEFAULT_API_BASE_URL;
  }

  /**
   * Initialize the webhook handler (fetch bot info)
   */
  async initialize(): Promise<void> {
    const botInfo = await this.getBotInfo();
    this.botId = botInfo.id;
  }

  getConfig(): WebexChannelConfig {
    return this.config;
  }

  /**
   * Handle an incoming webhook request
   */
  async handleWebhook(
    payload: WebexWebhookPayload,
  ): Promise<OpenClawEnvelope | null> {

    // Only handle message created events
    if (payload.resource !== 'messages' || payload.event !== 'created') {
      console.error('Invalid webhook resource or event:', payload.resource, payload.event);
      return null;
    }

    // Ignore messages from the bot itself
    if (payload.data.personId === this.botId) {
      console.error('Ignoring message from bot itself:', payload.data.personId, this.botId);
      return null;
    }

    // Check DM policy
    if (payload.data.roomType === 'direct') {
      if (!this.isAllowedSender(payload.data)) {
        console.error('Not allowed sender:', payload.data.personEmail);
        return null;
      }
    }

    // Fetch full message details (webhook only contains IDs)
    const message = await this.fetchMessage(payload.data.id);

    // Normalize to OpenClaw envelope
    return this.normalizeMessage(message);
  }

  /**
   * Verify webhook signature using HMAC-SHA1
   */
  verifySignature(payload: WebexWebhookPayload, signature: string, originalBody?: Buffer<ArrayBufferLike>): boolean {
    if (!this.config.webhookSecret) {
      return true;
    }

    const hmac = crypto.createHmac('sha1', this.config.webhookSecret);
    console.info('originalBody in verifySignature:', originalBody?.toString('utf-8'));
    hmac.update(originalBody ?? Buffer.from(JSON.stringify(payload)));
    const expectedSignature = hmac.digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Check if the sender is allowed based on DM policy
   */
  private isAllowedSender(data: WebexWebhookData): boolean {
    switch (this.config.dmPolicy) {
      case 'allow':
        return true;
      case 'deny':
        return false;
      case 'allowlisted':
        if (!this.config.allowFrom || this.config.allowFrom.length === 0) {
          return false;
        }
        return this.config.allowFrom.includes(data.personId) ||
          this.config.allowFrom.includes(data.personEmail);
      default:
        return false;
    }
  }

  /**
   * Fetch full message details from Webex API
   */
  private async fetchMessage(messageId: string): Promise<WebexMessage> {
    const response = await fetch(`${this.apiBaseUrl}/messages/${messageId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch message:', messageId, response.status, response.statusText);
      throw new Error(`Failed to fetch message: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<WebexMessage>;
  }

  /**
   * Normalize a Webex message to OpenClaw envelope format
   */
  private normalizeMessage(message: WebexMessage): OpenClawEnvelope {
    const attachments: OpenClawAttachment[] = [];

    // Convert file attachments
    if (message.files && message.files.length > 0) {
      for (const fileUrl of message.files) {
        attachments.push({
          type: 'file',
          url: fileUrl,
        });
      }
    }

    // Convert card attachments
    if (message.attachments && message.attachments.length > 0) {
      for (const attachment of message.attachments) {
        attachments.push({
          type: 'card',
          content: attachment.content,
        });
      }
    }

    return {
      id: message.id,
      channel: 'webex',
      conversationId: message.roomId,
      author: {
        id: message.personId,
        email: message.personEmail,
        displayName: undefined, // Would need additional API call to get
        isBot: false, // Messages from bot are filtered out earlier
      },
      content: {
        text: message.text,
        markdown: message.markdown,
        attachments: attachments.length > 0 ? attachments : undefined,
      },
      metadata: {
        roomType: message.roomType,
        roomId: message.roomId,
        timestamp: message.created,
        mentions: message.mentionedPeople,
        parentId: message.parentId,
        raw: message,
      },
    };
  }

  /**
   * Register webhooks with Webex
   */
  async registerWebhooks(): Promise<WebexWebhook[]> {
    // First, list existing webhooks and remove duplicates
    const existing = await this.listWebhooks();
    const targetUrl = this.config.webhookUrl;

    // Delete existing webhooks with the same target URL
    for (const webhook of existing) {
      if (webhook.targetUrl === targetUrl) {
        await this.deleteWebhook(webhook.id);
      }
    }

    // Create new webhooks for messages
    const webhooks: WebexWebhook[] = [];

    // Webhook for new messages
    const messageCreatedWebhook = await this.createWebhook({
      name: 'OpenClaw Message Handler',
      targetUrl,
      resource: 'messages',
      event: 'created',
      secret: this.config.webhookSecret,
    });
    console.info('secret:', this.config.webhookSecret);
    console.info('messageCreatedWebhook:', messageCreatedWebhook);
    webhooks.push(messageCreatedWebhook);

    return webhooks;
  }

  /**
   * List all webhooks
   */
  async listWebhooks(): Promise<WebexWebhook[]> {
    const response = await fetch(`${this.apiBaseUrl}/webhooks`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list webhooks: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as PaginatedResponse<WebexWebhook>;
    return data.items;
  }

  /**
   * Create a webhook
   */
  async createWebhook(request: CreateWebhookRequest): Promise<WebexWebhook> {
    const response = await fetch(`${this.apiBaseUrl}/webhooks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create webhook: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json() as Promise<WebexWebhook>;
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    const response = await fetch(`${this.apiBaseUrl}/webhooks/${webhookId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.config.token}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete webhook: ${response.status} ${response.statusText}`);
    }
    console.info('Deleted webhook:', webhookId);
  }

  /**
   * Get bot information
   */
  private async getBotInfo(): Promise<{ id: string; displayName: string; emails: string[] }> {
    const response = await fetch(`${this.apiBaseUrl}/people/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get bot info: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<{ id: string; displayName: string; emails: string[] }>;
  }

  /**
   * Get the bot ID (after initialization)
   */
  getBotId(): string | null {
    return this.botId;
  }
}

/**
 * Custom error for webhook validation failures
 */
export class WebhookValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookValidationError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WebhookValidationError);
    }
  }
}
