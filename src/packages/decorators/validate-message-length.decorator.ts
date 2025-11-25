import { SetMetadata } from '@nestjs/common';

export const VALIDATE_MESSAGE_LENGTH_KEY = 'validateMessageLength';
export const ValidateMessageLength = () => SetMetadata(VALIDATE_MESSAGE_LENGTH_KEY, true);
