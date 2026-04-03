export class PostizError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'PostizError';
  }
}

export class PostizAuthError extends PostizError {
  constructor() {
    super('Postiz API authentication failed. Check POSTIZ_API_KEY.', 401);
    this.name = 'PostizAuthError';
  }
}

export class PostizNotFoundError extends PostizError {
  constructor(resource: string) {
    super(`Postiz resource not found: ${resource}`, 404);
    this.name = 'PostizNotFoundError';
  }
}
