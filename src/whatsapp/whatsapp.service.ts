import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client, LocalAuth } from 'whatsapp-web.js';
import * as QRCode from 'qrcode';
import { WhatsappConnection } from './entities/whatsapp-connection.entity';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class WhatsappService {
  private clients: Map<string, Client> = new Map();
  private qrCodes: Map<string, string> = new Map();
  private pairingCodes: Map<string, string> = new Map();

  constructor(
    @InjectRepository(WhatsappConnection)
    private whatsappConnectionRepository: Repository<WhatsappConnection>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async initializeClient(userId: string): Promise<void> {
    // Check if client already exists
    if (this.clients.has(userId)) {
      const client = this.clients.get(userId);
      if (client) {
        const state = await client.getState();
        if (state === 'CONNECTED') {
          return;
        }
        // Destroy old client if not connected
        await client.destroy();
      }
      this.clients.delete(userId);
    }

    // Create new client
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: userId }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      },
    });

    // Handle QR code generation
    client.on('qr', async (qr) => {
      try {
        const qrCodeDataUrl = await QRCode.toDataURL(qr);
        this.qrCodes.set(userId, qrCodeDataUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    });

    // Handle ready event
    client.on('ready', async () => {
      console.log(`WhatsApp client ready for user ${userId}`);
      await this.handleClientReady(userId, client);
    });

    // Handle authenticated event
    client.on('authenticated', () => {
      console.log(`WhatsApp client authenticated for user ${userId}`);
    });

    // Handle disconnected event
    client.on('disconnected', async (reason) => {
      console.log(`WhatsApp client disconnected for user ${userId}:`, reason);
      await this.handleClientDisconnected(userId);
    });

    // Handle authentication failure
    client.on('auth_failure', (message) => {
      console.error(`Authentication failed for user ${userId}:`, message);
      this.clients.delete(userId);
      this.qrCodes.delete(userId);
      this.pairingCodes.delete(userId);
    });

    // Store client and initialize
    this.clients.set(userId, client);
    await client.initialize();
  }

  async getQRCode(userId: string): Promise<string | null> {
    // Initialize client if not exists
    if (!this.clients.has(userId)) {
      await this.initializeClient(userId);
      // Wait a bit for QR code to be generated
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return this.qrCodes.get(userId) || null;
  }

  async requestPairingCode(userId: string, phoneNumber: string): Promise<string> {
    try {
      // Initialize client if not exists
      if (!this.clients.has(userId)) {
        await this.initializeClient(userId);
      }

      const client = this.clients.get(userId);
      if (!client) {
        throw new BadRequestException('Failed to initialize WhatsApp client');
      }
      
      // Wait for client to be ready for pairing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Request pairing code
      const pairingCode = await client.requestPairingCode(phoneNumber);
      this.pairingCodes.set(userId, pairingCode);
      
      return pairingCode;
    } catch (error) {
      console.error('Error requesting pairing code:', error);
      throw new BadRequestException('Failed to request pairing code. Please try again.');
    }
  }

  async getConnectionStatus(userId: string): Promise<{
    isConnected: boolean;
    phoneNumber: string | null;
  }> {
    const connection = await this.whatsappConnectionRepository.findOne({
      where: { userId, isConnected: true },
    });

    if (connection) {
      return {
        isConnected: true,
        phoneNumber: connection.phoneNumber,
      };
    }

    // Check if client is connected but not saved yet
    const client = this.clients.get(userId);
    if (client) {
      try {
        const state = await client.getState();
        if (state === 'CONNECTED') {
          const info = await client.info;
          return {
            isConnected: true,
            phoneNumber: info.wid.user,
          };
        }
      } catch (error) {
        console.error('Error getting client state:', error);
      }
    }

    return {
      isConnected: false,
      phoneNumber: null,
    };
  }

  async disconnect(userId: string): Promise<void> {
    const client = this.clients.get(userId);
    if (client) {
      await client.destroy();
      this.clients.delete(userId);
    }

    this.qrCodes.delete(userId);
    this.pairingCodes.delete(userId);

    // Update database
    await this.whatsappConnectionRepository.update(
      { userId },
      { isConnected: false },
    );
  }

  private async handleClientReady(userId: string, client: Client): Promise<void> {
    try {
      const info = await client.info;
      const phoneNumber = info.wid.user;

      // Update or create connection record
      let connection = await this.whatsappConnectionRepository.findOne({
        where: { userId },
      });

      if (connection) {
        connection.phoneNumber = phoneNumber;
        connection.isConnected = true;
        connection.lastConnectedAt = new Date();
      } else {
        connection = this.whatsappConnectionRepository.create({
          userId,
          phoneNumber,
          isConnected: true,
          lastConnectedAt: new Date(),
        });
      }

      await this.whatsappConnectionRepository.save(connection);

      // Update user's phone number
      await this.userRepository.update(userId, { phoneNumber });

      // Clean up temporary data
      this.qrCodes.delete(userId);
      this.pairingCodes.delete(userId);
    } catch (error) {
      console.error('Error handling client ready:', error);
    }
  }

  private async handleClientDisconnected(userId: string): Promise<void> {
    this.clients.delete(userId);
    this.qrCodes.delete(userId);
    this.pairingCodes.delete(userId);

    await this.whatsappConnectionRepository.update(
      { userId },
      { isConnected: false },
    );
  }

  // Get client for sending messages (will be used later)
  getClient(userId: string): Client | undefined {
    return this.clients.get(userId);
  }
}

