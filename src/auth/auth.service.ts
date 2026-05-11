import { forwardRef, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './jwt-payload.interface';
import { PrivyService } from '../privy/privy.service';
import { LoginWithPrivyDto } from './dto/login-with-privy.dto';
import { User } from '../users/entities/user.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { FilesService } from 'src/files/files.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private readonly privyService: PrivyService,
    @Inject(forwardRef(() => SubscriptionsService))
    private subscriptionsService: SubscriptionsService,
    private readonly filesService: FilesService,
  ) {}

  private async createUserFromPrivyToken(userPrivyId: string): Promise<User> {
    const { linkedAccounts } = await this.privyService.client.getUserById(userPrivyId);
    const accountWithName: any = linkedAccounts?.find((account: any) => account?.name?.trim());
    const accountWithEmail: any = linkedAccounts?.find((account: any) => account?.email?.trim());

    console.log('linkedAccounts', linkedAccounts);

    const [firstName, lastName] = (accountWithName?.name || '').split(' ');
    const email = accountWithEmail?.email;
    const nickname = email.split('@')[0];

    const newUser = {
      email: email,
      privyId: userPrivyId,
      nickname,
      firstName,
      lastName,
    };
    const user = await this.usersService.create(newUser);
    await this.subscriptionsService.createFreeSubscription(user.id);

    return user;
  }

  public async loginWithPrivy(loginWithPrivyDto: LoginWithPrivyDto) {
    try {
      const { privyAccessToken } = loginWithPrivyDto;
      const { userId } = await this.privyService.client.verifyAuthToken(privyAccessToken);
      let user = await this.usersService.findByPrivyId(userId);
      // if user with email from token is not created then create one
      if (!user) {
        user = await this.createUserFromPrivyToken(userId);
      }

      console.log('userId', userId, 'privyAccessToken', privyAccessToken, 'user', user);

      const tokenPayload: JwtPayload = { sub: user.id, email: user.email };
      const accessToken = this.jwtService.sign(tokenPayload);

      const { password, ...userWithoutPassword } = user;

      return { user: userWithoutPassword, accessToken };
    } catch (error) {
      console.log(error);
      throw new UnauthorizedException('Cannot authorize the user with provided Privy token.');
    }
  }

  async register(registerDto: RegisterDto, avatar?: Express.Multer.File) {
    let avatarUrl: string | undefined = undefined;
    if (avatar) {
      const uploadResult = await this.filesService.uploadImage(avatar, 'avatars');
      avatarUrl = uploadResult.url;
    }

    // Create user (UsersService handles password hashing)
    const user = await this.usersService.create({
      ...registerDto,
      avatar: avatarUrl,
    });

    await this.subscriptionsService.createFreeSubscription(user.id);

    // Generate JWT token
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    // Create a new object without the password
    const { password: _unused, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, accessToken };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.usersService.findByEmail(email);

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    // Create a new object without the password
    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, accessToken };
  }
}
