import { UploadResult } from '@social-bot/domain';

export interface IStorageDriver {
  save(buffer: Buffer, originalName: string, mimeType: string): Promise<UploadResult>;
  delete(storagePath: string): Promise<void>;
  getPublicUrl(storagePath: string): string;
}

export const STORAGE_DRIVER = 'STORAGE_DRIVER';
