/**
 * Tests for types module
 *
 * Since types.ts only contains TypeScript type definitions,
 * these tests verify the types work correctly at compile time
 * and document the expected structure of each type.
 */

import { describe, it, expect } from 'vitest';
import type {
  DmPolicy,
  WebexChannelConfig,
  WebexPerson,
  WebexRoom,
  WebexMessage,
  WebexAttachment,
  AdaptiveCard,
  WebexWebhook,
  WebexWebhookResource,
  WebexWebhookEvent,
  WebexWebhookPayload,
  WebexWebhookData,
  CreateMessageRequest,
  CreateWebhookRequest,
  WebexApiError,
  PaginatedResponse,
  OpenClawEnvelope,
  OpenClawAttachment,
  OpenClawOutboundMessage,
  WebexChannelPlugin,
  WebhookHandler,
  RetryOptions,
  RequestOptions,
} from './types';

describe('types', () => {
  describe('DmPolicy', () => {
    it('should accept allow value', () => {
      const policy: DmPolicy = 'allow';
      expect(policy).toBe('allow');
    });

    it('should accept deny value', () => {
      const policy: DmPolicy = 'deny';
      expect(policy).toBe('deny');
    });

    it('should accept allowlisted value', () => {
      const policy: DmPolicy = 'allowlisted';
      expect(policy).toBe('allowlisted');
    });
  });

  describe('WebexChannelConfig', () => {
    it('should create minimal valid config', () => {
      const config: WebexChannelConfig = {
        token: 'test-token',
        webhookUrl: 'https://example.com/webhook',
        dmPolicy: 'allow',
      };
      expect(config.token).toBe('test-token');
      expect(config.webhookUrl).toBe('https://example.com/webhook');
      expect(config.dmPolicy).toBe('allow');
    });

    it('should create full config with all options', () => {
      const config: WebexChannelConfig = {
        token: 'test-token',
        webhookUrl: 'https://example.com/webhook',
        dmPolicy: 'allowlisted',
        allowFrom: ['user1@example.com', 'user2@example.com'],
        webhookSecret: 'secret-key',
        apiBaseUrl: 'https://custom.api.com/v1',
        maxRetries: 5,
        retryDelayMs: 2000,
      };
      expect(config.allowFrom).toHaveLength(2);
      expect(config.webhookSecret).toBe('secret-key');
      expect(config.maxRetries).toBe(5);
    });
  });

  describe('WebexPerson', () => {
    it('should create person object', () => {
      const person: WebexPerson = {
        id: 'person-123',
        emails: ['person@example.com'],
        displayName: 'Test Person',
        orgId: 'org-123',
        created: '2024-01-01T00:00:00.000Z',
        type: 'person',
      };
      expect(person.id).toBe('person-123');
      expect(person.type).toBe('person');
    });

    it('should create bot object', () => {
      const bot: WebexPerson = {
        id: 'bot-123',
        emails: ['bot@example.com'],
        displayName: 'Test Bot',
        orgId: 'org-123',
        created: '2024-01-01T00:00:00.000Z',
        type: 'bot',
      };
      expect(bot.type).toBe('bot');
    });
  });

  describe('WebexRoom', () => {
    it('should create direct room', () => {
      const room: WebexRoom = {
        id: 'room-123',
        title: 'Direct Room',
        type: 'direct',
        isLocked: false,
        lastActivity: '2024-01-01T00:00:00.000Z',
        creatorId: 'person-123',
        created: '2024-01-01T00:00:00.000Z',
      };
      expect(room.type).toBe('direct');
    });

    it('should create group room', () => {
      const room: WebexRoom = {
        id: 'room-123',
        title: 'Group Room',
        type: 'group',
        isLocked: true,
        teamId: 'team-123',
        lastActivity: '2024-01-01T00:00:00.000Z',
        creatorId: 'person-123',
        created: '2024-01-01T00:00:00.000Z',
        ownerId: 'owner-123',
      };
      expect(room.type).toBe('group');
      expect(room.teamId).toBe('team-123');
    });
  });

  describe('WebexMessage', () => {
    it('should create minimal message', () => {
      const message: WebexMessage = {
        id: 'msg-123',
        roomId: 'room-123',
        roomType: 'group',
        personId: 'person-123',
        personEmail: 'person@example.com',
        created: '2024-01-01T00:00:00.000Z',
      };
      expect(message.id).toBe('msg-123');
    });

    it('should create full message with all fields', () => {
      const message: WebexMessage = {
        id: 'msg-123',
        roomId: 'room-123',
        roomType: 'direct',
        toPersonId: 'recipient-123',
        toPersonEmail: 'recipient@example.com',
        text: 'Hello',
        markdown: '**Hello**',
        html: '<b>Hello</b>',
        files: ['https://example.com/file.pdf'],
        personId: 'person-123',
        personEmail: 'person@example.com',
        mentionedPeople: ['user-1', 'user-2'],
        mentionedGroups: ['group-1'],
        attachments: [
          {
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: { type: 'AdaptiveCard', version: '1.3', body: [] },
          },
        ],
        created: '2024-01-01T00:00:00.000Z',
        updated: '2024-01-01T01:00:00.000Z',
        parentId: 'parent-msg-123',
      };
      expect(message.text).toBe('Hello');
      expect(message.attachments).toHaveLength(1);
    });
  });

  describe('WebexAttachment', () => {
    it('should create adaptive card attachment', () => {
      const attachment: WebexAttachment = {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          type: 'AdaptiveCard',
          version: '1.3',
          body: [{ type: 'TextBlock', text: 'Hello' }],
          actions: [{ type: 'Action.Submit', title: 'Submit' }],
        },
      };
      expect(attachment.contentType).toBe('application/vnd.microsoft.card.adaptive');
      expect(attachment.content.type).toBe('AdaptiveCard');
    });
  });

  describe('AdaptiveCard', () => {
    it('should create adaptive card', () => {
      const card: AdaptiveCard = {
        type: 'AdaptiveCard',
        version: '1.3',
        body: [{ type: 'TextBlock', text: 'Hello' }],
      };
      expect(card.type).toBe('AdaptiveCard');
    });
  });

  describe('WebexWebhook', () => {
    it('should create webhook object', () => {
      const webhook: WebexWebhook = {
        id: 'webhook-123',
        name: 'Test Webhook',
        targetUrl: 'https://example.com/webhook',
        resource: 'messages',
        event: 'created',
        status: 'active',
        created: '2024-01-01T00:00:00.000Z',
        orgId: 'org-123',
        createdBy: 'person-123',
        appId: 'app-123',
        ownedBy: 'creator',
      };
      expect(webhook.id).toBe('webhook-123');
    });
  });

  describe('WebexWebhookResource', () => {
    it('should accept valid resources', () => {
      const resources: WebexWebhookResource[] = [
        'messages',
        'memberships',
        'rooms',
        'attachmentActions',
        'meetings',
        'recordings',
      ];
      expect(resources).toHaveLength(6);
    });
  });

  describe('WebexWebhookEvent', () => {
    it('should accept valid events', () => {
      const events: WebexWebhookEvent[] = [
        'created',
        'updated',
        'deleted',
        'started',
        'ended',
      ];
      expect(events).toHaveLength(5);
    });
  });

  describe('WebexWebhookPayload', () => {
    it('should create webhook payload', () => {
      const payload: WebexWebhookPayload = {
        id: 'payload-123',
        name: 'Test',
        targetUrl: 'https://example.com',
        resource: 'messages',
        event: 'created',
        orgId: 'org-123',
        createdBy: 'user-123',
        appId: 'app-123',
        ownedBy: 'creator',
        status: 'active',
        created: '2024-01-01T00:00:00.000Z',
        actorId: 'actor-123',
        data: {
          id: 'msg-123',
          roomId: 'room-123',
          roomType: 'group',
          personId: 'person-123',
          personEmail: 'person@example.com',
          created: '2024-01-01T00:00:00.000Z',
        },
      };
      expect(payload.resource).toBe('messages');
    });
  });

  describe('WebexWebhookData', () => {
    it('should create webhook data', () => {
      const data: WebexWebhookData = {
        id: 'msg-123',
        roomId: 'room-123',
        roomType: 'direct',
        personId: 'person-123',
        personEmail: 'person@example.com',
        created: '2024-01-01T00:00:00.000Z',
        mentionedPeople: ['user-1'],
        mentionedGroups: ['group-1'],
        files: ['https://example.com/file.pdf'],
      };
      expect(data.roomType).toBe('direct');
    });
  });

  describe('CreateMessageRequest', () => {
    it('should create room message request', () => {
      const request: CreateMessageRequest = {
        roomId: 'room-123',
        text: 'Hello',
        markdown: '**Hello**',
      };
      expect(request.roomId).toBe('room-123');
    });

    it('should create direct message request by person ID', () => {
      const request: CreateMessageRequest = {
        toPersonId: 'person-123',
        text: 'Hello',
      };
      expect(request.toPersonId).toBe('person-123');
    });

    it('should create direct message request by email', () => {
      const request: CreateMessageRequest = {
        toPersonEmail: 'person@example.com',
        text: 'Hello',
      };
      expect(request.toPersonEmail).toBe('person@example.com');
    });
  });

  describe('CreateWebhookRequest', () => {
    it('should create webhook request', () => {
      const request: CreateWebhookRequest = {
        name: 'Test Webhook',
        targetUrl: 'https://example.com/webhook',
        resource: 'messages',
        event: 'created',
        filter: 'roomId=abc123',
        secret: 'webhook-secret',
      };
      expect(request.name).toBe('Test Webhook');
    });
  });

  describe('WebexApiError', () => {
    it('should create API error', () => {
      const error: WebexApiError = {
        message: 'Invalid request',
        trackingId: 'tracking-123',
        errors: [
          { description: 'roomId is required' },
          { description: 'text is required' },
        ],
      };
      expect(error.message).toBe('Invalid request');
      expect(error.errors).toHaveLength(2);
    });
  });

  describe('PaginatedResponse', () => {
    it('should create paginated response', () => {
      const response: PaginatedResponse<WebexMessage> = {
        items: [
          {
            id: 'msg-1',
            roomId: 'room-123',
            roomType: 'group',
            personId: 'person-123',
            personEmail: 'person@example.com',
            created: '2024-01-01T00:00:00.000Z',
          },
          {
            id: 'msg-2',
            roomId: 'room-123',
            roomType: 'group',
            personId: 'person-123',
            personEmail: 'person@example.com',
            created: '2024-01-01T00:00:00.000Z',
          },
        ],
      };
      expect(response.items).toHaveLength(2);
    });
  });

  describe('OpenClawEnvelope', () => {
    it('should create envelope', () => {
      const envelope: OpenClawEnvelope = {
        id: 'msg-123',
        channel: 'webex',
        conversationId: 'room-123',
        author: {
          id: 'person-123',
          email: 'person@example.com',
          displayName: 'Test User',
          isBot: false,
        },
        content: {
          text: 'Hello',
          markdown: '**Hello**',
          attachments: [
            { type: 'file', url: 'https://example.com/file.pdf' },
            { type: 'card', content: { type: 'AdaptiveCard' } },
          ],
        },
        metadata: {
          roomType: 'group',
          roomId: 'room-123',
          timestamp: '2024-01-01T00:00:00.000Z',
          mentions: ['user-1', 'user-2'],
          parentId: 'parent-123',
          raw: {
            id: 'msg-123',
            roomId: 'room-123',
            roomType: 'group',
            personId: 'person-123',
            personEmail: 'person@example.com',
            created: '2024-01-01T00:00:00.000Z',
          },
        },
      };
      expect(envelope.channel).toBe('webex');
    });
  });

  describe('OpenClawAttachment', () => {
    it('should create file attachment', () => {
      const attachment: OpenClawAttachment = {
        type: 'file',
        url: 'https://example.com/file.pdf',
      };
      expect(attachment.type).toBe('file');
    });

    it('should create card attachment', () => {
      const attachment: OpenClawAttachment = {
        type: 'card',
        content: { type: 'AdaptiveCard', version: '1.3', body: [] },
      };
      expect(attachment.type).toBe('card');
    });
  });

  describe('OpenClawOutboundMessage', () => {
    it('should create outbound message', () => {
      const message: OpenClawOutboundMessage = {
        to: 'room-123',
        content: {
          text: 'Hello',
          markdown: '**Hello**',
          files: ['https://example.com/file.pdf'],
          card: { type: 'AdaptiveCard', version: '1.3', body: [] },
        },
        parentId: 'parent-123',
      };
      expect(message.to).toBe('room-123');
    });
  });

  describe('WebexChannelPlugin', () => {
    it('should define plugin interface', () => {
      // This is a compile-time check - the interface exists
      const mockPlugin: WebexChannelPlugin = {
        name: 'webex',
        version: '1.0.0',
        initialize: async () => {},
        send: async () => ({
          id: 'msg-123',
          roomId: 'room-123',
          roomType: 'group',
          personId: 'person-123',
          personEmail: 'person@example.com',
          created: '2024-01-01T00:00:00.000Z',
        }),
        handleWebhook: async () => null,
        registerWebhooks: async () => [],
        shutdown: async () => {},
      };
      expect(mockPlugin.name).toBe('webex');
    });
  });

  describe('WebhookHandler', () => {
    it('should accept sync handler', () => {
      const handler: WebhookHandler = (envelope) => {
        console.log(envelope.id);
      };
      expect(typeof handler).toBe('function');
    });

    it('should accept async handler', () => {
      const handler: WebhookHandler = async (envelope) => {
        await Promise.resolve();
        console.log(envelope.id);
      };
      expect(typeof handler).toBe('function');
    });
  });

  describe('RetryOptions', () => {
    it('should create retry options', () => {
      const options: RetryOptions = {
        maxRetries: 3,
        retryDelayMs: 1000,
        shouldRetry: (error, attempt) => attempt < 3,
      };
      expect(options.maxRetries).toBe(3);
    });
  });

  describe('RequestOptions', () => {
    it('should create GET request options', () => {
      const options: RequestOptions = {
        method: 'GET',
        path: '/messages/123',
      };
      expect(options.method).toBe('GET');
    });

    it('should create POST request options', () => {
      const options: RequestOptions = {
        method: 'POST',
        path: '/messages',
        body: { roomId: 'room-123', text: 'Hello' },
        headers: { 'X-Custom-Header': 'value' },
      };
      expect(options.method).toBe('POST');
      expect(options.body).toBeDefined();
    });

    it('should support all HTTP methods', () => {
      const methods: RequestOptions['method'][] = ['GET', 'POST', 'PUT', 'DELETE'];
      expect(methods).toHaveLength(4);
    });
  });
});
