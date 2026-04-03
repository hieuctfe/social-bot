import {
  Controller, Get, Post, Delete, Param, UseGuards,
  UseInterceptors, UploadedFile, Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AssetService } from './asset.service';

@ApiTags('Assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces/:wsId/assets')
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('wsId') wsId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: { user: { id: string } },
  ) {
    return this.assetService.upload(wsId, req.user.id, file);
  }

  @Get()
  findAll(@Param('wsId') wsId: string) {
    return this.assetService.findAll(wsId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assetService.remove(id);
  }
}
