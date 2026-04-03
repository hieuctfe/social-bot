import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import * as path from 'path';
import * as fs from 'fs';
import type { Response } from 'express';

/**
 * Simple media serving for local dev.
 * In production, serve static files from nginx or a CDN.
 */
@ApiTags('Media')
@Controller('media')
export class MediaController {
  private readonly uploadRoot: string;

  constructor() {
    this.uploadRoot = process.env['UPLOAD_ROOT'] ?? '/data/uploads';
  }

  @Get(':filename')
  async serve(@Param('filename') filename: string, @Res() res: Response) {
    const safeName = path.basename(filename);
    const filePath = path.join(this.uploadRoot, safeName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.sendFile(filePath);
  }
}
