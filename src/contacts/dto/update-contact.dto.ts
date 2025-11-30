import { IsString, IsOptional, IsEmail } from 'class-validator';

export class UpdateContactDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  groupName?: string;
}

