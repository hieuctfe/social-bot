import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PostizService } from './postiz.service';

/**
 * PostizController - Admin endpoints for testing Postiz integration.
 * NOT for public use - internal testing only.
 */
@ApiTags('Postiz')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('postiz')
export class PostizController {
  constructor(private readonly postizService: PostizService) {}

  @Get('integrations')
  @ApiOperation({
    summary: 'List Postiz integrations',
    description: 'Fetches all social integrations from Postiz. Use this to verify API connectivity and get integration IDs for creating SocialConnections.'
  })
  async listIntegrations() {
    const integrations = await this.postizService.listIntegrations();
    return {
      count: integrations.length,
      integrations,
    };
  }

  @Get('health')
  @ApiOperation({
    summary: 'Test Postiz API connectivity',
    description: 'Verifies that the Postiz API is reachable and the API key is valid.'
  })
  async healthCheck() {
    try {
      const integrations = await this.postizService.listIntegrations();
      return {
        status: 'connected',
        integrationsCount: integrations.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
