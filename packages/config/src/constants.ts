export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const MAX_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/mov', 'video/avi', 'video/webm'];
export const SUPPORTED_ASSET_TYPES = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES];
