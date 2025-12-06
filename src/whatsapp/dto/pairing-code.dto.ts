import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class RequestPairingCodeDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be in international format (e.g., +201234567890)',
  })
  phoneNumber: string;
}





















