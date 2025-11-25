import { IsNotEmpty, IsString, IsNumber, Min, IsOptional, IsBoolean } from 'class-validator';

export class CreatePackageDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  messagesLimit: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  charactersLimit: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  durationDays: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
