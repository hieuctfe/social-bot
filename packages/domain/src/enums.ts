export enum MemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

export enum ContentDraftStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SCHEDULED = 'SCHEDULED',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
}

export enum SocialProvider {
  INSTAGRAM = 'INSTAGRAM',
  FACEBOOK = 'FACEBOOK',
  TIKTOK = 'TIKTOK',
  TWITTER = 'TWITTER',
  LINKEDIN = 'LINKEDIN',
  YOUTUBE = 'YOUTUBE',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum AssetType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
  OTHER = 'OTHER',
}

export enum ActionLogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export enum AutomationStatus {
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum AIPolicyAction {
  GENERATE_CAPTION = 'GENERATE_CAPTION',
  SUGGEST_HASHTAGS = 'SUGGEST_HASHTAGS',
  TRANSLATE = 'TRANSLATE',
  REVIEW_CONTENT = 'REVIEW_CONTENT',
  PLAN_ACTIONS = 'PLAN_ACTIONS',
}

export enum StorageDriver {
  LOCAL = 'local',
  S3 = 's3',
}
