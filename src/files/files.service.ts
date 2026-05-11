import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'multer';

export interface UploadResponse {
  success: boolean;
  url: string;
  path: string;
}

@Injectable()
export class FilesService {
  private readonly supabase: SupabaseClient;
  private readonly bucketName: string = 'images';

  constructor(private configService: ConfigService) {
    const url = this.configService.get<string>('SUPABASE_URL');
    const key = this.configService.get<string>('SUPABASE_KEY');

    if (!url || !key) {
      throw new Error('SUPABASE_URL or SUPABASE_KEY is not defined in .env');
    }

    this.supabase = createClient(url, key);
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: 'avatars' | 'cards',
  ): Promise<UploadResponse> {
    // Валідація типу файлу
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Тільки зображення дозволені для завантаження');
    }

    const fileExt = file.originalname.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.${fileExt}`;

    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new BadRequestException(`Supabase upload error: ${error.message}`);
    }

    const { data: publicData } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(data.path);

    return {
      success: true,
      url: publicData.publicUrl,
      path: data.path,
    };
  }
}
