import {
  MemberRole,
  ContentDraftStatus,
  SocialProvider,
  ApprovalStatus,
  AssetType,
  ActionLogLevel,
  AutomationStatus,
  AIPolicyAction,
} from './enums';

// ─── Base ───────────────────────────────────────────────────

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Organization ───────────────────────────────────────────

export interface Organization extends BaseEntity {
  name: string;
  slug: string;
  logoUrl?: string | null;
  settings: Record<string, unknown>;
  workspaces?: Workspace[];
}

// ─── Workspace ──────────────────────────────────────────────

export interface Workspace extends BaseEntity {
  organizationId: string;
  name: string;
  slug: string;
  description?: string | null;
  organization?: Organization;
  members?: Member[];
  socialConnections?: SocialConnection[];
  contentDrafts?: ContentDraft[];
}

// ─── Member ─────────────────────────────────────────────────

export interface Member extends BaseEntity {
  organizationId: string;
  workspaceId?: string | null;
  userId: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  roleBindings?: RoleBinding[];
}

export interface RoleBinding extends BaseEntity {
  memberId: string;
  workspaceId: string;
  role: MemberRole;
  member?: Member;
}

// ─── Social Connection ──────────────────────────────────────

export interface SocialConnection extends BaseEntity {
  workspaceId: string;
  provider: SocialProvider;
  /** ID of the integration on the Postiz side */
  postizIntegrationId: string;
  displayName: string;
  profileUrl?: string | null;
  avatarUrl?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
  lastSyncAt?: Date | null;
  metadata: Record<string, unknown>;
  workspace?: Workspace;
}

// ─── Asset ──────────────────────────────────────────────────

export interface Asset extends BaseEntity {
  workspaceId: string;
  uploadedById: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  assetType: AssetType;
  storagePath: string;
  publicUrl?: string | null;
  /** Postiz media ID after upload, if applicable */
  postizMediaId?: string | null;
  metadata: Record<string, unknown>;
  workspace?: Workspace;
}

// ─── Content Draft ──────────────────────────────────────────

export interface ContentDraft extends BaseEntity {
  workspaceId: string;
  createdById: string;
  title: string;
  body: string;
  status: ContentDraftStatus;
  platformTargets: SocialProvider[];
  scheduledAt?: Date | null;
  publishedAt?: Date | null;
  metadata: Record<string, unknown>;
  publishTargets?: PublishTarget[];
  approvalRequests?: ApprovalRequest[];
}

// ─── Publish Target ─────────────────────────────────────────

export interface PublishTarget extends BaseEntity {
  contentDraftId: string;
  socialConnectionId: string;
  /** Task/post ID returned by Postiz after scheduling */
  postizPostId?: string | null;
  status: ContentDraftStatus;
  scheduledAt?: Date | null;
  publishedAt?: Date | null;
  errorMessage?: string | null;
  analyticsSnapshot: Record<string, unknown>;
  contentDraft?: ContentDraft;
  socialConnection?: SocialConnection;
}

// ─── Approval Request ───────────────────────────────────────

export interface ApprovalRequest extends BaseEntity {
  contentDraftId: string;
  requestedById: string;
  reviewedById?: string | null;
  status: ApprovalStatus;
  notes?: string | null;
  reviewedAt?: Date | null;
  contentDraft?: ContentDraft;
}

// ─── Action Log ─────────────────────────────────────────────

export interface ActionLog extends BaseEntity {
  organizationId?: string | null;
  workspaceId?: string | null;
  actorId?: string | null;
  level: ActionLogLevel;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  payload: Record<string, unknown>;
  outcome: 'SUCCESS' | 'FAILURE' | 'PENDING';
}

// ─── Automation Run ─────────────────────────────────────────

export interface AutomationRun extends BaseEntity {
  workspaceId: string;
  triggeredBy: string;
  n8nExecutionId?: string | null;
  workflowName: string;
  status: AutomationStatus;
  startedAt: Date;
  finishedAt?: Date | null;
  errorMessage?: string | null;
  payload: Record<string, unknown>;
}

// ─── AI Policy ──────────────────────────────────────────────

export interface AIPolicy extends BaseEntity {
  workspaceId: string;
  name: string;
  action: AIPolicyAction;
  prompt: string;
  model?: string | null;
  enabled: boolean;
  config: Record<string, unknown>;
}

// ─── Postiz Integration Types (normalized) ──────────────────

export interface PostizIntegration {
  id: string;
  name: string;
  provider: string;
  picture?: string;
  disabled: boolean;
}

export interface PostizScheduleResult {
  postizPostId: string;
  status: string;
  scheduledAt?: string;
}

// ─── Storage ─────────────────────────────────────────────────

export interface UploadResult {
  storagePath: string;
  publicUrl?: string;
  filename: string;
  size: number;
  mimeType: string;
}

// ─── API Responses ──────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
