# Spec: PageProfile API

**Status:** Ready for Implementation  
**Author:** SA (Solution Architect)  
**Assignee:** BE (Backend Engineer)

---

## Overview

Implement CRUD API for PageProfile management. PageProfile represents a social media page that will be automatically farmed with content.

---

## Database Schema

Already migrated ✅ (migration: `20260404013848_add_page_profile_content_archive`)

```prisma
model PageProfile {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  workspaceId String
  name        String
  niche       String
  description String?
  
  contentStrategy     Json // { type, sources?, keywords?, topics?, style }
  socialConnectionIds String[] @default([])
  schedule            Json // { frequency, times[], timezone }
  aiConfig            Json // { generationModel, qaEnabled, minQualityScore, maxRetries }
  
  status     PageProfileStatus @default(ACTIVE)
  lastPostAt DateTime?
  stats      Json @default("{\"totalPosts\": 0, \"avgQualityScore\": 0, \"failedGenerations\": 0}")
  
  workspace       Workspace        @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  contentArchives ContentArchive[]
  
  @@map("page_profiles")
}
```

---

## API Endpoints

### 1. Create PageProfile

```
POST /api/v1/workspaces/:workspaceId/page-profiles
```

**Request Body:**
```json
{
  "name": "Tech News Daily",
  "niche": "tech",
  "description": "Daily tech news and insights",
  "contentStrategy": {
    "type": "ai-generated",
    "topics": ["AI", "startups", "productivity"],
    "style": "professional"
  },
  "socialConnectionIds": ["conn_123", "conn_456"],
  "schedule": {
    "frequency": 2,
    "times": ["09:00", "18:00"],
    "timezone": "Asia/Saigon"
  },
  "aiConfig": {
    "generationModel": "gpt-4o-mini",
    "qaEnabled": true,
    "minQualityScore": 75,
    "maxRetries": 3
  }
}
```

**Response:** `201 Created`
```json
{
  "id": "pp_abc123",
  "workspaceId": "ws_xyz",
  "name": "Tech News Daily",
  "niche": "tech",
  "description": "Daily tech news and insights",
  "contentStrategy": { ... },
  "socialConnectionIds": ["conn_123", "conn_456"],
  "schedule": { ... },
  "aiConfig": { ... },
  "status": "ACTIVE",
  "lastPostAt": null,
  "stats": {
    "totalPosts": 0,
    "avgQualityScore": 0,
    "failedGenerations": 0
  },
  "createdAt": "2026-04-04T08:00:00Z",
  "updatedAt": "2026-04-04T08:00:00Z"
}
```

---

### 2. List PageProfiles

```
GET /api/v1/workspaces/:workspaceId/page-profiles
```

**Query Params:**
- `status` (optional): `active`, `paused`, `archived`
- `niche` (optional): filter by niche

**Response:** `200 OK`
```json
{
  "data": [
    { ... },
    { ... }
  ],
  "total": 5
}
```

---

### 3. Get PageProfile by ID

```
GET /api/v1/workspaces/:workspaceId/page-profiles/:id
```

**Response:** `200 OK`
```json
{
  "id": "pp_abc123",
  "workspaceId": "ws_xyz",
  ...
}
```

---

### 4. Update PageProfile

```
PATCH /api/v1/workspaces/:workspaceId/page-profiles/:id
```

**Request Body:** (all fields optional)
```json
{
  "name": "Tech News Daily Updated",
  "status": "paused",
  "schedule": {
    "frequency": 3,
    "times": ["09:00", "15:00", "21:00"],
    "timezone": "Asia/Saigon"
  }
}
```

**Response:** `200 OK` (updated PageProfile)

---

### 5. Delete PageProfile

```
DELETE /api/v1/workspaces/:workspaceId/page-profiles/:id
```

**Response:** `204 No Content`

---

### 6. Get Due for Content (for n8n automation)

```
GET /api/v1/page-profiles/due-for-content
```

**Logic:**
- Return PageProfiles where:
  - `status = ACTIVE`
  - Current time matches one of the scheduled times
  - OR `lastPostAt` is null/old enough for next post

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "pp_abc123",
      "workspaceId": "ws_xyz",
      "name": "Tech News Daily",
      "niche": "tech",
      "nextPostTime": "2026-04-04T09:00:00Z"
    }
  ]
}
```

---

## DTOs (Validation)

### CreatePageProfileDto
```typescript
class CreatePageProfileDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  niche: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  @ValidateNested()
  contentStrategy: ContentStrategyDto;

  @IsArray()
  @IsString({ each: true })
  socialConnectionIds: string[];

  @IsObject()
  @ValidateNested()
  schedule: ScheduleDto;

  @IsObject()
  @ValidateNested()
  aiConfig: AIConfigDto;
}

class ContentStrategyDto {
  @IsEnum(['repost', 'news', 'ai-generated', 'mixed'])
  type: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sources?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topics?: string[];

  @IsEnum(['professional', 'funny', 'educational', 'viral'])
  style: string;
}

class ScheduleDto {
  @IsInt()
  @Min(1)
  @Max(10)
  frequency: number;

  @IsArray()
  @IsString({ each: true })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { each: true })
  times: string[];

  @IsString()
  timezone: string;
}

class AIConfigDto {
  @IsString()
  generationModel: string;

  @IsBoolean()
  qaEnabled: boolean;

  @IsInt()
  @Min(0)
  @Max(100)
  minQualityScore: number;

  @IsInt()
  @Min(1)
  @Max(5)
  maxRetries: number;
}
```

### UpdatePageProfileDto
```typescript
class UpdatePageProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  niche?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  contentStrategy?: ContentStrategyDto;

  @IsOptional()
  @IsArray()
  socialConnectionIds?: string[];

  @IsOptional()
  @IsObject()
  schedule?: ScheduleDto;

  @IsOptional()
  @IsObject()
  aiConfig?: AIConfigDto;

  @IsOptional()
  @IsEnum(['active', 'paused', 'archived'])
  status?: string;
}
```

---

## Implementation Checklist

- [ ] Create `apps/control-api/src/modules/page-profile/` directory
- [ ] Create `page-profile.module.ts`
- [ ] Create `page-profile.controller.ts` (all endpoints)
- [ ] Create `page-profile.service.ts` (business logic)
- [ ] Create `dto/create-page-profile.dto.ts`
- [ ] Create `dto/update-page-profile.dto.ts`
- [ ] Create `entities/page-profile.entity.ts`
- [ ] Add to `app.module.ts`
- [ ] Add Swagger decorators
- [ ] Write unit tests for service
- [ ] Manual test with curl

---

## Testing

### Create test
```bash
curl -X POST http://localhost:4000/api/v1/workspaces/ws_test/page-profiles \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tech News Daily",
    "niche": "tech",
    "contentStrategy": {
      "type": "ai-generated",
      "topics": ["AI", "startups"],
      "style": "professional"
    },
    "socialConnectionIds": [],
    "schedule": {
      "frequency": 2,
      "times": ["09:00", "18:00"],
      "timezone": "Asia/Saigon"
    },
    "aiConfig": {
      "generationModel": "gpt-4o-mini",
      "qaEnabled": true,
      "minQualityScore": 75,
      "maxRetries": 3
    }
  }'
```

### List test
```bash
curl http://localhost:4000/api/v1/workspaces/ws_test/page-profiles
```

---

## Notes

- Workspace must exist before creating PageProfile
- SocialConnection IDs must be valid (can be empty array for now)
- Use existing auth middleware (JwtAuthGuard)
- Log all actions to ActionLog
- Return proper error codes (404, 400, etc.)

---

**Ready for BE implementation!** 🚀
