import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AssetType } from '@social-bot/domain';
import { SUPPORTED_IMAGE_TYPES, SUPPORTED_VIDEO_TYPES } from '@social-bot/config';

@Injectable()
export class AssetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async upload(
    workspaceId: string,
    uploadedById: string,
    file: Express.Multer.File,
  ) {
    const result = await this.storage.save(file.buffer, file.originalname, file.mimetype);
    const assetType = this.resolveAssetType(file.mimetype);

    return this.prisma.asset.create({
      data: {
        workspaceId,
        uploadedById,
        filename: result.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        assetType,
        storagePath: result.storagePath,
        publicUrl: result.publicUrl,
      },
    });
  }

  async findAll(workspaceId: string) {
    return this.prisma.asset.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException(`Asset ${id} not found`);
    return asset;
  }

  async remove(id: string) {
    const asset = await this.findOne(id);
    await this.storage.delete(asset.storagePath);
    return this.prisma.asset.delete({ where: { id } });
  }

  private resolveAssetType(mimeType: string): AssetType {
    if (SUPPORTED_IMAGE_TYPES.includes(mimeType)) return AssetType.IMAGE;
    if (SUPPORTED_VIDEO_TYPES.includes(mimeType)) return AssetType.VIDEO;
    return AssetType.OTHER;
  }
}
