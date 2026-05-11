import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { UmbraService } from '../umbra/umbra.service';

@Controller('donations')
export class DonationsController {
  constructor(private readonly umbraService: UmbraService) {}

  @Post('prepare')
  async prepareDonation(
    @Body()
    body: {
      senderAddress: string; 
      recipientAddress: string;
      amount: string;
    },
  ) {
    try {
      const amount = BigInt(body.amount);

      console.log('P2P PREPARE START');
      console.log('Sender:', body.senderAddress);
      console.log('Recipient:', body.recipientAddress);

      const result = await this.umbraService.prepareP2PDonation({
        senderAddress: body.senderAddress,
        recipientAddress: body.recipientAddress,
        amount,
      });

      return {
        success: true,
        message: 'Unsigned transaction built successfully',
        data: {
          transaction: result.transactionBase64,
        },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('P2P PREPARE FAILED:', errorMsg);

      throw new BadRequestException({
        success: false,
        error: errorMsg,
      });
    }
  }
}
