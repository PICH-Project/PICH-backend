import { Controller, Post, Body, UploadedFile, UseInterceptors } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginWithPrivyDto } from './dto/login-with-privy.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseInterceptors(FileInterceptor('file'))
  async register(@Body() registerDto: RegisterDto, @UploadedFile() avatar?: Express.Multer.File) {
    return await this.authService.register(registerDto, avatar);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return await this.authService.login(loginDto);
  }

  @Post('login-privy')
  async loginWithPrivy(@Body() loginDto: LoginWithPrivyDto) {
    return await this.authService.loginWithPrivy(loginDto);
  }
}
