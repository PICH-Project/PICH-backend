import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
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
  private readonly logger = new Logger(FilesService.name);
  private supabase: SupabaseClient | null = null;
  private readonly bucketName: string = 'images';

  constructor(private configService: ConfigService) {
    // Lazy init: бек стартує навіть якщо SUPABASE_URL/KEY ще не задані.
    // Помилка кинеться тільки при першій спробі завантажити файл.
  }

  /** Lazy getter — створює client при першому запиті. */
  private getClient(): SupabaseClient {
    if (this.supabase) return this.supabase;

    const url = this.configService.get<string>('SUPABASE_URL');
    const key = this.configService.get<string>('SUPABASE_KEY');

    if (!url || !key) {
      this.logger.error('SUPABASE_URL or SUPABASE_KEY not configured in .env');
      throw new InternalServerErrorException(
        'File uploads not configured (SUPABASE_URL/KEY missing on server).',
      );
    }

    this.supabase = createClient(url, key);
    return this.supabase;
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: 'avatars' | 'cards',
  ): Promise<UploadResponse> {
    const supabase = this.getClient();
    // Валідація типу файлу
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Тільки зображення дозволені для завантаження');
    }

    const fileExt = file.originalname.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new BadRequestException(`Supabase upload error: ${error.message}`);
    }

    const { data: publicData } = supabase.storage
      .from(this.bucketName)
      .getPublicUrl(data.path);

    return {
      success: true,
      url: publicData.publicUrl,
      path: data.path,
    };
  }
}
