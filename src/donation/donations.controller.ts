import { Controller, Post, Get, Body, BadRequestException } from '@nestjs/common';
import { UmbraService } from '../umbra/umbra.service';
import { CHARITY_CARDS } from './charities.constant';

@Controller('donations')
export class DonationsController {
  constructor(private readonly umbraService: UmbraService) {}

  /**
   * Список benevolent BAC-карток на яких можна донатити крипту через Umbra.
   * Hardcoded — зміни в `charities.constant.ts`.
   */
  @Get('charities')
  getCharities() {
    return {
      success: true,
      data: CHARITY_CARDS,
    };
  }

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
