import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrivyClient } from '@privy-io/server-auth';
import { ConfigVariables } from 'src/common/constants/app.constants';

@Injectable()
export class PrivyService {
  public readonly client: PrivyClient;
  public readonly jwksEndpoint?: string;
  public readonly applicationId: string;
  private readonly secret: string;

  constructor(private configService: ConfigService) {
    this.applicationId = this.configService.get<string>(ConfigVariables.PRIVY_APP_ID, 'your-app-id');
    this.secret = this.configService.get<string>(ConfigVariables.PRIVY_API_KEY, 'your-app-secret');

    this.client = new PrivyClient(this.applicationId, this.secret);
  }
}