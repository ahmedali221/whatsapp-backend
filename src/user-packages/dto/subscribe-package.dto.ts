import { IsNotEmpty, IsUUID, IsOptional, IsEnum } from 'class-validator';
import { PaymentStatus } from '../../packages/entities/subscription.entity';

export class SubscribePackageDto {
  @IsNotEmpty()
  @IsUUID()
  packageId: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;
}

