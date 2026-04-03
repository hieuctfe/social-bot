export class SocialPublisherError extends Error {
  constructor(
    message: string,
    public readonly platform: string,
    public readonly statusCode?: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'SocialPublisherError';
  }
}

export class OAuthError extends SocialPublisherError {
  constructor(platform: string, detail: string) {
    super(`OAuth error for ${platform}: ${detail}`, platform, 401);
    this.name = 'OAuthError';
  }
}

export class TokenExpiredError extends SocialPublisherError {
  constructor(platform: string) {
    super(`Access token expired for ${platform}`, platform, 401);
    this.name = 'TokenExpiredError';
  }
}

export class PublishError extends SocialPublisherError {
  constructor(platform: string, detail: string, statusCode?: number, body?: unknown) {
    super(`Publish failed for ${platform}: ${detail}`, platform, statusCode, body);
    this.name = 'PublishError';
  }
}
