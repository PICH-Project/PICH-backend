import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { PlanCode, BillingCycle } from '../subscriptions/subscriptions.enums';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async createCheckoutSession(
    @GetUser() user: User,
    @Body() body: { planCode: PlanCode; billingCycle: BillingCycle },
  ) {
    this.logger.log(
      `User ${user.id} creating checkout for ${body.planCode} (${body.billingCycle})`,
    );

    const result = await this.paymentsService.generatePaymentLink(
      user.id,
      body.planCode,
      body.billingCycle,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleKiraPayWebhook(@Body() payload: any) {
    this.logger.log(`Webhook received from KiraPay`);

    await this.paymentsService.processWebhook(payload);

    return { received: true };
  }
}
