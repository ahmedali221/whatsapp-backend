import { IsOptional, IsString } from 'class-validator';

export class UploadExcelDto {
  @IsOptional()
  @IsString()
  groupName?: string;
}
