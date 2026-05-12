import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService, UploadResponse } from './files.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

const ALLOWED_FOLDERS = ['avatars', 'cards'] as const;
type AllowedFolder = (typeof ALLOWED_FOLDERS)[number];

@Controller('upload')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  /**
   * POST /upload/image
   *
   * multipart/form-data:
   *   - file:   image (binary)
   *   - folder: 'avatars' | 'cards'
   *
   * Повертає { success, url, path }, де `url` — публічна Supabase-лінка
   * яку фронт зберігає у `user.avatar` чи `card.avatar`.
   */
  @Post('image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder: string,
  ): Promise<UploadResponse> {
    if (!file) {
      throw new BadRequestException('No file provided. Use "file" field in multipart form-data.');
    }
    if (!ALLOWED_FOLDERS.includes(folder as AllowedFolder)) {
      throw new BadRequestException(
        `Invalid folder "${folder}". Expected one of: ${ALLOWED_FOLDERS.join(', ')}`,
      );
    }
    return this.filesService.uploadImage(file, folder as AllowedFolder);
  }
}
