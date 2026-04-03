import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { UploadResult } from '@social-bot/domain';
import { IStorageDriver } from '../storage.interface';

@Injectable()
export class LocalStorageDriver implements IStorageDriver {
  private readonly uploadRoot: string;
  private readonly publicMediaUrl: string;

  constructor() {
    this.uploadRoot = process.env['UPLOAD_ROOT'] ?? '/data/uploads';
    this.publicMediaUrl = process.env['PUBLIC_MEDIA_URL'] ?? 'http://localhost:4000/media';
    fs.mkdirSync(this.uploadRoot, { recursive: true });
  }

  async save(buffer: Buffer, originalName: string, mimeType: string): Promise<UploadResult> {
    const ext = path.extname(originalName);
    const hash = crypto.randomBytes(16).toString('hex');
    const filename = `${hash}${ext}`;
    const storagePath = path.join(this.uploadRoot, filename);

    await fs.promises.writeFile(storagePath, buffer);

    return {
      storagePath,
      publicUrl: this.getPublicUrl(filename),
      filename,
      size: buffer.length,
      mimeType,
    };
  }

  async delete(storagePath: string): Promise<void> {
    try {
      await fs.promises.unlink(storagePath);
    } catch {
      // File may already be deleted; ignore ENOENT
    }
  }

  getPublicUrl(storagePath: string): string {
    const filename = path.basename(storagePath);
    return `${this.publicMediaUrl}/${filename}`;
  }
}
