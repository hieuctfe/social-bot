import { Injectable } from '@nestjs/common';
import { LocalStorageDriver } from './drivers/local-storage.driver';
import { UploadResult } from '@social-bot/domain';

/**
 * StorageService delegates to the configured driver.
 * To add S3: create S3StorageDriver implementing IStorageDriver,
 * then swap the driver in StorageModule based on STORAGE_DRIVER env var.
 */
@Injectable()
export class StorageService {
  constructor(private readonly driver: LocalStorageDriver) {}

  save(buffer: Buffer, originalName: string, mimeType: string): Promise<UploadResult> {
    return this.driver.save(buffer, originalName, mimeType);
  }

  delete(storagePath: string): Promise<void> {
    return this.driver.delete(storagePath);
  }

  getPublicUrl(storagePath: string): string {
    return this.driver.getPublicUrl(storagePath);
  }
}
