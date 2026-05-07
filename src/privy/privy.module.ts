import {
  DynamicModule,
  Global,
  InternalServerErrorException,
  Module,
  Provider,
} from '@nestjs/common';
import { PrivyService } from '../privy/privy.service';

@Global()
@Module({
  providers: [PrivyService],
  exports: [PrivyService],
})
export class PrivyModule {}
