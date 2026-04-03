import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { LocalStorageDriver } from './drivers/local-storage.driver';
import { MediaController } from './media.controller';

@Module({
  controllers: [MediaController],
  providers: [
    LocalStorageDriver,
    {
      provide: StorageService,
      useClass: StorageService,
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
