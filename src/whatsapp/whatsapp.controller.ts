import { Controller, Post, Get, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { RequestPairingCodeDto } from './dto/pairing-code.dto';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private whatsappService: WhatsappService) {}

  @Post('initialize')
  @HttpCode(HttpStatus.OK)
  async initialize(@Req() req: any) {
    const userId = req.user.userId;
    await this.whatsappService.initializeClient(userId);
    return {
      message: 'WhatsApp client initialized successfully',
    };
  }

  @Get('qr-code')
  async getQRCode(@Req() req: any) {
    const userId = req.user.userId;
    const qrCode = await this.whatsappService.getQRCode(userId);
    
    return {
      qrCode,
      message: qrCode ? 'QR code generated' : 'QR code not ready yet. Please try again.',
    };
  }

  @Post('request-pairing-code')
  async requestPairingCode(
    @Req() req: any,
    @Body() requestPairingCodeDto: RequestPairingCodeDto,
  ) {
    const userId = req.user.userId;
    const pairingCode = await this.whatsappService.requestPairingCode(
      userId,
      requestPairingCodeDto.phoneNumber,
    );

    return {
      pairingCode,
      message: 'Pairing code generated successfully',
    };
  }

  @Get('status')
  async getStatus(@Req() req: any) {
    const userId = req.user.userId;
    const status = await this.whatsappService.getConnectionStatus(userId);

    return {
      ...status,
      message: status.isConnected
        ? 'WhatsApp is connected'
        : 'WhatsApp is not connected',
    };
  }

  @Post('disconnect')
  @HttpCode(HttpStatus.OK)
  async disconnect(@Req() req: any) {
    const userId = req.user.userId;
    await this.whatsappService.disconnect(userId);

    return {
      message: 'WhatsApp disconnected successfully',
    };
  }

  @Post('send-messages')
  async sendMessages(@Req() req: any, @Body() body: { messages: Array<{ phone: string; message: string; name?: string }> }) {
    const userId = req.user.userId;
    const results = await this.whatsappService.sendBulkMessages(userId, body.messages);
    return {
      message: 'Messages sent',
      results,
    };
  }
}


