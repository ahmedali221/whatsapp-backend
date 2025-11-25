import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { VALIDATE_MESSAGE_LENGTH_KEY } from '../decorators/validate-message-length.decorator';

@Injectable()
export class MessageLengthInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const shouldValidate = this.reflector.getAllAndOverride<boolean>(
      VALIDATE_MESSAGE_LENGTH_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!shouldValidate) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const subscription = request.subscription;
    const messageContent = request.body?.content || request.body?.message || '';

    if (!subscription) {
      throw new BadRequestException('Subscription information not found');
    }

    const messageLength = messageContent.length;
    const maxLength = subscription.charactersLimit;

    if (messageLength > maxLength) {
      throw new BadRequestException(
        `Message length (${messageLength} characters) exceeds your subscription limit of ${maxLength} characters. Please shorten your message or upgrade your package.`
      );
    }

    request.messageLength = messageLength;

    return next.handle();
  }
}
