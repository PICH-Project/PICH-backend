/**
 * One-off maintenance script — видаляє ВСІ підписки конкретного юзера
 * (за email'ом) + лінковані payment_transactions, щоб можна було чисто
 * перетестити onboarding flow.
 *
 * Запустити:
 *   docker compose exec api npx ts-node delete-user-subscriptions.ts
 *
 * За замовчуванням видаляє юзера за email TARGET_EMAIL — поміняй якщо треба.
 * Якщо хочеш re-create FREE підписку автоматом — постав CREATE_FREE_AFTER = true.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';
import { User } from './src/users/entities/user.entity';
import { Subscription } from './src/subscriptions/entities/subscription.entity';
import { PaymentTransaction } from './src/payments/entities/playment-transaction.entity';
import { SubscriptionsService } from './src/subscriptions/subscriptions.service';

const TARGET_EMAIL = 'chotkiypaca1@gmail.com';
const CREATE_FREE_AFTER = false; // постав true якщо потрібна свіжа FREE підписка

async function main() {
  console.log('───────────────────────────────────────────────────');
  console.log(` Delete subscriptions for: ${TARGET_EMAIL}`);
  console.log('───────────────────────────────────────────────────');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    const userRepo = dataSource.getRepository(User);
    const subRepo = dataSource.getRepository(Subscription);
    const txRepo = dataSource.getRepository(PaymentTransaction);

    // 1. Знайти юзера
    const user = await userRepo.findOne({ where: { email: TARGET_EMAIL } });
    if (!user) {
      console.log(`✗ User with email "${TARGET_EMAIL}" not found — nothing to delete.`);
      return;
    }
    console.log(`✓ Found user:        ${user.id}`);

    // 2. Знайти підписки
    const subs = await subRepo.find({
      where: { userId: user.id },
      relations: ['plan'],
    });
    console.log(`✓ Active+inactive subscriptions: ${subs.length}`);
    for (const s of subs) {
      console.log(
        `    - ${s.plan?.code ?? '?'}  type=${s.subscriptionType}  status=${s.status}  id=${s.id}`,
      );
    }

    if (subs.length === 0) {
      console.log('Nothing to delete.');
      return;
    }

    // 3. Розбираємось з payment_transactions, які лінковані на ці підписки.
    //    subscriptionId у PaymentTransaction nullable — ставимо null щоб
    //    не падали FK constraints.
    const subIds = subs.map((s) => s.id);
    const linkedTxs = await txRepo
      .createQueryBuilder('tx')
      .where('tx.subscriptionId IN (:...ids)', { ids: subIds })
      .getMany();

    console.log(`✓ Payment transactions linked: ${linkedTxs.length}`);
    if (linkedTxs.length > 0) {
      await txRepo
        .createQueryBuilder()
        .update(PaymentTransaction)
        .set({ subscriptionId: null })
        .where('subscriptionId IN (:...ids)', { ids: subIds })
        .execute();
      console.log(`  → nullified subscriptionId on ${linkedTxs.length} rows`);
    }

    // 4. Видалити підписки
    const deleteResult = await subRepo.delete(subIds);
    console.log(`✓ Subscriptions deleted: ${deleteResult.affected ?? 0}`);

    // 5. Опційно — створити свіжу FREE
    if (CREATE_FREE_AFTER) {
      const subsService = app.get(SubscriptionsService);
      const freeSub = await (subsService as any).createFreeSubscription(user.id);
      console.log(`✓ FREE subscription re-created: ${freeSub.id}`);
    } else {
      console.log(
        'Note: FREE subscription NOT created. Юзер залишився без підписки —\n' +
          'апка сама створить FREE при наступному логіні (через AuthService),\n' +
          'або постав CREATE_FREE_AFTER=true і запусти ще раз.',
      );
    }

    console.log('───────────────────────────────────────────────────');
    console.log(' ✓ DONE');
    console.log('───────────────────────────────────────────────────');
  } catch (err) {
    console.error('✗ Failed:', err);
    process.exit(1);
  } finally {
    await app.close();
  }
}

main();
