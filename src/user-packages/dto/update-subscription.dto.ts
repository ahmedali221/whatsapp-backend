import { IsOptional, IsEnum } from 'class-validator';
import { SubscriptionStatus, PaymentStatus } from '../../packages/entities/subscription.entity';

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;
}

