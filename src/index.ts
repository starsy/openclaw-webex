/**
 * OpenClaw Webex Channel Plugin
 *
 * A channel plugin for integrating Cisco Webex messaging with OpenClaw.
 *
 * @packageDocumentation
 */

// Re-export the plugin registration function as default
export { default } from "./plugin";
export { id } from "./plugin";

// Re-export existing classes for backwards compatibility and advanced usage
export { WebexSender, WebexApiRequestError } from "./send";
export { WebexWebhookHandler, WebhookValidationError } from "./webhook";
export { WebexChannel, createWebexChannel, createAndInitialize } from "./channel";
export { webexPlugin } from "./channel-plugin";

// Re-export types
export type {
  WebexChannelConfig,
  DmPolicy,
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
} from "./types";

export type { ResolvedWebexAccount } from "./channel-plugin";
