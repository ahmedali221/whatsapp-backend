import { IsArray, IsNotEmpty, ValidateNested, IsOptional, IsString, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';

class ContactItemDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

export class UploadContactsDto {
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ContactItemDto)
  contacts: ContactItemDto[];

  @IsOptional()
  @IsString()
  groupName?: string;
}

