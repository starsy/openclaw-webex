/**
 * Tests for WebexChannel
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebexChannel, createWebexChannel, createAndInitialize } from './channel';
import { WebexSender } from './send';
import { WebexWebhookHandler } from './webhook';
import type {
  WebexChannelConfig,
  WebexMessage,
  WebexWebhookPayload,
  OpenClawEnvelope,
} from './types';

// Mock the sender and webhook handler
vi.mock('./send', () => {
  const MockWebexSender = vi.fn().mockImplementation(function(this: unknown) {
    (this as Record<string, unknown>).send = vi.fn();
    return this;
  });
  return { WebexSender: MockWebexSender };
});

vi.mock('./webhook', () => {
  const MockWebexWebhookHandler = vi.fn().mockImplementation(function(this: unknown) {
    (this as Record<string, unknown>).initialize = vi.fn().mockResolvedValue(undefined);
    (this as Record<string, unknown>).handleWebhook = vi.fn();
    (this as Record<string, unknown>).registerWebhooks = vi.fn();
    (this as Record<string, unknown>).getBotId = vi.fn().mockReturnValue('bot-123');
    return this;
  });
  return { WebexWebhookHandler: MockWebexWebhookHandler };
});

describe('WebexChannel', () => {
  let channel: WebexChannel;
  let config: WebexChannelConfig;

  const mockMessage: WebexMessage = {
    id: 'message-123',
    roomId: 'room-123',
    roomType: 'group',
    text: 'Hello!',
    personId: 'person-123',
    personEmail: 'person@example.com',
    created: '2024-01-01T00:00:00.000Z',
  };

  const mockEnvelope: OpenClawEnvelope = {
    id: 'message-123',
    channel: 'webex',
    conversationId: 'room-123',
    author: {
      id: 'person-123',
      email: 'person@example.com',
      isBot: false,
    },
    content: {
      text: 'Hello!',
    },
    metadata: {
      roomType: 'group',
      roomId: 'room-123',
      timestamp: '2024-01-01T00:00:00.000Z',
      raw: mockMessage,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    channel = new WebexChannel();
    config = {
      token: 'test-token',
      webhookUrl: 'https://example.com/webhook',
      dmPolicy: 'allow',
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor and properties', () => {
    it('should have correct name', () => {
      expect(channel.name).toBe('webex');
    });

    it('should have correct version', () => {
      expect(channel.version).toBe('1.0.0');
    });

    it('should not be initialized by default', () => {
      expect(channel.isInitialized()).toBe(false);
    });

    it('should have null config before initialization', () => {
      expect(channel.getConfig()).toBeNull();
    });
  });

  describe('initialize', () => {
    it('should initialize with valid config', async () => {
      await channel.initialize(config);

      expect(channel.isInitialized()).toBe(true);
      expect(channel.getConfig()).not.toBeNull();
      expect(WebexSender).toHaveBeenCalledWith(expect.objectContaining({
        token: 'test-token',
        webhookUrl: 'https://example.com/webhook',
        dmPolicy: 'allow',
      }));
      expect(WebexWebhookHandler).toHaveBeenCalled();
    });

    it('should merge with default config', async () => {
      await channel.initialize(config);

      const mergedConfig = channel.getConfig();
      expect(mergedConfig?.maxRetries).toBe(3);
      expect(mergedConfig?.retryDelayMs).toBe(1000);
      expect(mergedConfig?.apiBaseUrl).toBe('https://webexapis.com/v1');
    });

    it('should override defaults with provided values', async () => {
      const customConfig = {
        ...config,
        maxRetries: 5,
        retryDelayMs: 2000,
        apiBaseUrl: 'https://custom.api.com/v1',
      };

      await channel.initialize(customConfig);

      const mergedConfig = channel.getConfig();
      expect(mergedConfig?.maxRetries).toBe(5);
      expect(mergedConfig?.retryDelayMs).toBe(2000);
      expect(mergedConfig?.apiBaseUrl).toBe('https://custom.api.com/v1');
    });

    describe('validation', () => {
      it('should throw error when token is missing', async () => {
        const invalidConfig = { ...config, token: '' };

        await expect(channel.initialize(invalidConfig)).rejects.toThrow('requires a token');
      });

      it('should throw error when webhookUrl is missing', async () => {
        const invalidConfig = { ...config, webhookUrl: '' };

        await expect(channel.initialize(invalidConfig)).rejects.toThrow('requires a webhookUrl');
      });

      it('should throw error when dmPolicy is missing', async () => {
        const invalidConfig = { ...config, dmPolicy: undefined as unknown as 'allow' };

        await expect(channel.initialize(invalidConfig)).rejects.toThrow('requires a dmPolicy');
      });

      it('should throw error when dmPolicy is allowlisted but allowFrom is empty', async () => {
        const invalidConfig = { ...config, dmPolicy: 'allowlisted' as const, allowFrom: [] };

        await expect(channel.initialize(invalidConfig)).rejects.toThrow(
          'requires allowFrom when dmPolicy is "allowlisted"'
        );
      });

      it('should throw error when dmPolicy is allowlisted but allowFrom is undefined', async () => {
        const invalidConfig = { ...config, dmPolicy: 'allowlisted' as const };

        await expect(channel.initialize(invalidConfig)).rejects.toThrow(
          'requires allowFrom when dmPolicy is "allowlisted"'
        );
      });

      it('should accept valid allowlisted config', async () => {
        const validConfig = {
          ...config,
          dmPolicy: 'allowlisted' as const,
          allowFrom: ['user@example.com'],
        };

        await channel.initialize(validConfig);

        expect(channel.isInitialized()).toBe(true);
      });

      it('should throw error for invalid webhookUrl', async () => {
        const invalidConfig = { ...config, webhookUrl: 'not-a-valid-url' };

        await expect(channel.initialize(invalidConfig)).rejects.toThrow(
          'webhookUrl must be a valid URL'
        );
      });
    });
  });

  describe('send', () => {
    it('should throw error when not initialized', async () => {
      await expect(
        channel.send({ to: 'room-123', content: { text: 'Hello!' } })
      ).rejects.toThrow('not initialized');
    });

    it('should send message when initialized', async () => {
      await channel.initialize(config);
      const sender = channel.getSender();
      (sender.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockMessage);

      const result = await channel.send({ to: 'room-123', content: { text: 'Hello!' } });

      expect(result).toEqual(mockMessage);
      expect(sender.send).toHaveBeenCalled();
    });
  });

  describe('sendText', () => {
    it('should send text message', async () => {
      await channel.initialize(config);
      const sender = channel.getSender();
      (sender.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockMessage);

      const result = await channel.sendText('room-123', 'Hello!');

      expect(result).toEqual(mockMessage);
      expect(sender.send).toHaveBeenCalledWith({
        to: 'room-123',
        content: { text: 'Hello!' },
      });
    });
  });

  describe('sendMarkdown', () => {
    it('should send markdown message', async () => {
      await channel.initialize(config);
      const sender = channel.getSender();
      (sender.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockMessage);

      const result = await channel.sendMarkdown('room-123', '**Bold**');

      expect(result).toEqual(mockMessage);
      expect(sender.send).toHaveBeenCalledWith({
        to: 'room-123',
        content: { markdown: '**Bold**' },
      });
    });
  });

  describe('sendDirect', () => {
    it('should send direct message', async () => {
      await channel.initialize(config);
      const sender = channel.getSender();
      (sender.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockMessage);

      const result = await channel.sendDirect('user@example.com', 'Hello!');

      expect(result).toEqual(mockMessage);
      expect(sender.send).toHaveBeenCalledWith({
        to: 'user@example.com',
        content: { text: 'Hello!' },
      });
    });
  });

  describe('reply', () => {
    it('should send threaded reply', async () => {
      await channel.initialize(config);
      const sender = channel.getSender();
      (sender.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockMessage);

      const result = await channel.reply('room-123', 'parent-123', 'Reply text');

      expect(result).toEqual(mockMessage);
      expect(sender.send).toHaveBeenCalledWith({
        to: 'room-123',
        content: { text: 'Reply text' },
        parentId: 'parent-123',
      });
    });
  });

  describe('handleWebhook', () => {
    const mockPayload: WebexWebhookPayload = {
      id: 'webhook-id',
      name: 'Test',
      targetUrl: 'https://example.com/webhook',
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
        id: 'message-123',
        roomId: 'room-123',
        roomType: 'group',
        personId: 'person-123',
        personEmail: 'person@example.com',
        created: '2024-01-01T00:00:00.000Z',
      },
    };

    it('should throw error when not initialized', async () => {
      await expect(channel.handleWebhook(mockPayload)).rejects.toThrow('not initialized');
    });

    it('should handle webhook and return envelope', async () => {
      await channel.initialize(config);
      const webhookHandler = channel.getWebhookHandler();
      (webhookHandler.handleWebhook as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockEnvelope);

      const result = await channel.handleWebhook(mockPayload);

      expect(result).toEqual(mockEnvelope);
    });

    it('should handle webhook with signature', async () => {
      await channel.initialize(config);
      const webhookHandler = channel.getWebhookHandler();
      (webhookHandler.handleWebhook as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockEnvelope);

      await channel.handleWebhook(mockPayload, 'signature-123');

      expect(webhookHandler.handleWebhook).toHaveBeenCalledWith(mockPayload, 'signature-123');
    });

    it('should return null when webhook handler returns null', async () => {
      await channel.initialize(config);
      const webhookHandler = channel.getWebhookHandler();
      (webhookHandler.handleWebhook as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      const result = await channel.handleWebhook(mockPayload);

      expect(result).toBeNull();
    });

    it('should notify message handlers when envelope is returned', async () => {
      await channel.initialize(config);
      const webhookHandler = channel.getWebhookHandler();
      (webhookHandler.handleWebhook as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockEnvelope);

      const handler = vi.fn();
      channel.onMessage(handler);

      await channel.handleWebhook(mockPayload);

      expect(handler).toHaveBeenCalledWith(mockEnvelope);
    });

    it('should not notify handlers when envelope is null', async () => {
      await channel.initialize(config);
      const webhookHandler = channel.getWebhookHandler();
      (webhookHandler.handleWebhook as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      const handler = vi.fn();
      channel.onMessage(handler);

      await channel.handleWebhook(mockPayload);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should continue notifying handlers even if one throws', async () => {
      await channel.initialize(config);
      const webhookHandler = channel.getWebhookHandler();
      (webhookHandler.handleWebhook as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockEnvelope);

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorHandler = vi.fn().mockRejectedValue(new Error('Handler error'));
      const successHandler = vi.fn();

      channel.onMessage(errorHandler);
      channel.onMessage(successHandler);

      await channel.handleWebhook(mockPayload);

      expect(errorHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalledWith('Error in message handler:', expect.any(Error));

      consoleError.mockRestore();
    });
  });

  describe('onMessage / offMessage', () => {
    it('should register message handler', async () => {
      await channel.initialize(config);
      const webhookHandler = channel.getWebhookHandler();
      (webhookHandler.handleWebhook as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockEnvelope);

      const handler = vi.fn();
      channel.onMessage(handler);

      await channel.handleWebhook({
        id: 'webhook-id',
        name: 'Test',
        targetUrl: 'https://example.com',
        resource: 'messages',
        event: 'created',
        orgId: 'org',
        createdBy: 'user',
        appId: 'app',
        ownedBy: 'creator',
        status: 'active',
        created: '2024-01-01T00:00:00.000Z',
        actorId: 'actor',
        data: {
          id: 'msg',
          roomId: 'room',
          roomType: 'group',
          personId: 'person',
          personEmail: 'person@example.com',
          created: '2024-01-01T00:00:00.000Z',
        },
      });

      expect(handler).toHaveBeenCalledWith(mockEnvelope);
    });

    it('should unregister message handler', async () => {
      await channel.initialize(config);
      const webhookHandler = channel.getWebhookHandler();
      (webhookHandler.handleWebhook as ReturnType<typeof vi.fn>).mockResolvedValue(mockEnvelope);

      const handler = vi.fn();
      channel.onMessage(handler);
      channel.offMessage(handler);

      await channel.handleWebhook({
        id: 'webhook-id',
        name: 'Test',
        targetUrl: 'https://example.com',
        resource: 'messages',
        event: 'created',
        orgId: 'org',
        createdBy: 'user',
        appId: 'app',
        ownedBy: 'creator',
        status: 'active',
        created: '2024-01-01T00:00:00.000Z',
        actorId: 'actor',
        data: {
          id: 'msg',
          roomId: 'room',
          roomType: 'group',
          personId: 'person',
          personEmail: 'person@example.com',
          created: '2024-01-01T00:00:00.000Z',
        },
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle removing non-existent handler gracefully', () => {
      const handler = vi.fn();
      expect(() => channel.offMessage(handler)).not.toThrow();
    });
  });

  describe('registerWebhooks', () => {
    it('should throw error when not initialized', async () => {
      await expect(channel.registerWebhooks()).rejects.toThrow('not initialized');
    });

    it('should register webhooks when initialized', async () => {
      await channel.initialize(config);
      const webhookHandler = channel.getWebhookHandler();
      const mockWebhooks = [{ id: 'webhook-1', name: 'Test' }];
      (webhookHandler.registerWebhooks as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockWebhooks);

      const result = await channel.registerWebhooks();

      expect(result).toEqual(mockWebhooks);
    });
  });

  describe('getSender', () => {
    it('should throw error when not initialized', () => {
      expect(() => channel.getSender()).toThrow('not initialized');
    });

    it('should return sender when initialized', async () => {
      await channel.initialize(config);

      const sender = channel.getSender();

      expect(sender).toBeDefined();
    });
  });

  describe('getWebhookHandler', () => {
    it('should throw error when not initialized', () => {
      expect(() => channel.getWebhookHandler()).toThrow('not initialized');
    });

    it('should return webhook handler when initialized', async () => {
      await channel.initialize(config);

      const handler = channel.getWebhookHandler();

      expect(handler).toBeDefined();
    });
  });

  describe('shutdown', () => {
    it('should reset all state', async () => {
      await channel.initialize(config);
      expect(channel.isInitialized()).toBe(true);

      await channel.shutdown();

      expect(channel.isInitialized()).toBe(false);
      expect(channel.getConfig()).toBeNull();
    });

    it('should clear message handlers', async () => {
      await channel.initialize(config);
      const handler = vi.fn();
      channel.onMessage(handler);

      await channel.shutdown();

      // Re-initialize and trigger webhook
      await channel.initialize(config);
      const webhookHandler = channel.getWebhookHandler();
      (webhookHandler.handleWebhook as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockEnvelope);

      await channel.handleWebhook({
        id: 'webhook-id',
        name: 'Test',
        targetUrl: 'https://example.com',
        resource: 'messages',
        event: 'created',
        orgId: 'org',
        createdBy: 'user',
        appId: 'app',
        ownedBy: 'creator',
        status: 'active',
        created: '2024-01-01T00:00:00.000Z',
        actorId: 'actor',
        data: {
          id: 'msg',
          roomId: 'room',
          roomType: 'group',
          personId: 'person',
          personEmail: 'person@example.com',
          created: '2024-01-01T00:00:00.000Z',
        },
      });

      // Handler should not have been called because it was cleared on shutdown
      expect(handler).not.toHaveBeenCalled();
    });
  });
});

describe('createWebexChannel', () => {
  it('should create a new WebexChannel instance', () => {
    const channel = createWebexChannel();

    expect(channel).toBeInstanceOf(WebexChannel);
    expect(channel.isInitialized()).toBe(false);
  });
});

describe('createAndInitialize', () => {
  it('should create and initialize channel', async () => {
    const config: WebexChannelConfig = {
      token: 'test-token',
      webhookUrl: 'https://example.com/webhook',
      dmPolicy: 'allow',
    };

    const channel = await createAndInitialize(config);

    expect(channel).toBeInstanceOf(WebexChannel);
    expect(channel.isInitialized()).toBe(true);
  });
});
