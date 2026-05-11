import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  ParseEnumPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService, UploadResponse } from './files.service';

@Controller('upload')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  // @Post('image')
  // @UseInterceptors(FileInterceptor('file'))
  // async uploadImage(
  //   @UploadedFile() file: Express.Multer.File,
  //   @Body('folder') folder: 'avatars' | 'cards',
  // ): Promise<UploadResponse> {
  //   return this.filesService.uploadImage(file, folder);
  // }
}
