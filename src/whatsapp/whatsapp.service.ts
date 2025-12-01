import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  ConnectionState,
} from '@whiskeysockets/baileys';
import * as QRCode from 'qrcode';
import * as path from 'path';
import * as fs from 'fs';
import { WhatsappConnection } from './entities/whatsapp-connection.entity';
import { User } from '../auth/entities/user.entity';
import { Subscription, SubscriptionStatus } from '../packages/entities/subscription.entity';
import { MessagesService } from './messages.service';
import { MessageStatus } from './entities/message.entity';

@Injectable()
export class WhatsappService {
  private sockets: Map<string, WASocket> = new Map();
  private qrCodes: Map<string, string> = new Map();
  private connectionStates: Map<string, boolean> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private isInitializing: Map<string, boolean> = new Map();
  private readonly MAX_RECONNECT_ATTEMPTS = 5;

  constructor(
    @InjectRepository(WhatsappConnection)
    private whatsappConnectionRepository: Repository<WhatsappConnection>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    private messagesService: MessagesService,
  ) {}

  async initializeClient(userId: string, isReconnect: boolean = false): Promise<void> {
    // Check if socket already exists and is connected
    if (this.sockets.has(userId) && this.connectionStates.get(userId)) {
      return;
    }

    // Prevent multiple simultaneous initialization attempts
    if (this.isInitializing.get(userId)) {
      console.log(`Initialization already in progress for user ${userId}`);
      return;
    }

    this.isInitializing.set(userId, true);

    try {
      // Check reconnect attempts limit
      const attempts = this.reconnectAttempts.get(userId) || 0;
      if (isReconnect && attempts >= this.MAX_RECONNECT_ATTEMPTS) {
        console.error(`Max reconnection attempts (${this.MAX_RECONNECT_ATTEMPTS}) reached for user ${userId}`);
        this.isInitializing.set(userId, false);
        this.reconnectAttempts.delete(userId);
        return;
      }

      // Close existing socket if any
      const existingSocket = this.sockets.get(userId);
      if (existingSocket) {
        try {
          existingSocket.end(undefined);
        } catch (error) {
          console.error(`Error closing existing socket for user ${userId}:`, error);
        }
        this.sockets.delete(userId);
      }

      // Create auth folder for this user
      // Use environment variable or default to app directory (works with Docker volume)
      let authBaseDir = process.env.WHATSAPP_AUTH_DIR || path.join(process.cwd(), '.wwebjs_auth');
      let authFolder = path.join(authBaseDir, userId);
      
      // Function to try creating directory with fallback
      const ensureAuthDirectory = (baseDir: string, userId: string): string => {
        const userFolder = path.join(baseDir, userId);
        
        // Ensure base directory exists
        if (!fs.existsSync(baseDir)) {
          try {
            fs.mkdirSync(baseDir, { recursive: true, mode: 0o755 });
          } catch (error: any) {
            if (error.code === 'EACCES') {
              throw error; // Re-throw to trigger fallback
            }
            throw new Error(`Failed to create auth base directory ${baseDir}: ${error.message}`);
          }
        }
        
        // Create user-specific auth folder
        if (!fs.existsSync(userFolder)) {
          try {
            fs.mkdirSync(userFolder, { recursive: true, mode: 0o755 });
          } catch (error: any) {
            if (error.code === 'EACCES') {
              throw error; // Re-throw to trigger fallback
            }
            throw new Error(`Failed to create auth folder for user: ${error.message}`);
          }
        }
        
        return userFolder;
      };
      
      // Try to create directory, fallback to /tmp if permission denied
      try {
        authFolder = ensureAuthDirectory(authBaseDir, userId);
      } catch (error: any) {
        if (error.code === 'EACCES' && authBaseDir !== '/tmp/.wwebjs_auth') {
          console.warn(`Permission denied for ${authBaseDir}, falling back to /tmp/.wwebjs_auth`);
          authBaseDir = '/tmp/.wwebjs_auth';
          authFolder = ensureAuthDirectory(authBaseDir, userId);
        } else {
          throw error;
        }
      }
      
      // CLEAR CORRUPTED AUTH STATE ON FRESH START (not reconnect)
      if (!isReconnect && fs.existsSync(authFolder)) {
        console.log(`Clearing old auth state for user ${userId}`);
        try {
          fs.rmSync(authFolder, { recursive: true, force: true });
        } catch (error: any) {
          console.warn(`Could not clear old auth state for user ${userId}:`, error.message);
        }
      }

      const { state, saveCreds } = await useMultiFileAuthState(authFolder);

      // Add random delay to avoid rate limiting
      const delay = Math.floor(Math.random() * 5000) + 1000; // 1-6 seconds
      await new Promise(resolve => setTimeout(resolve, delay));

      const socket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['Ubuntu', 'Chrome', '114.0.0.0'],  // Use simpler browser string
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        qrTimeout: 60000,
        syncFullHistory: false,
        markOnlineOnConnect: false,
      });

      // Handle connection updates
      socket.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          // Generate QR code as data URL
          try {
            const qrCodeDataUrl = await QRCode.toDataURL(qr);
            this.qrCodes.set(userId, qrCodeDataUrl);
            console.log(`QR code generated for user ${userId}`);
            // Reset reconnect attempts on successful QR generation
            this.reconnectAttempts.delete(userId);
          } catch (error) {
            console.error(`Error generating QR code for user ${userId}:`, error);
          }
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const error = lastDisconnect?.error;
          
          console.log(`Connection closed for user ${userId}`);
          console.log(`Status code: ${statusCode}, Error: ${error?.message || 'Unknown error'}`);
          
          this.connectionStates.set(userId, false);
          this.isInitializing.set(userId, false);
          
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          
          if (shouldReconnect) {
            const currentAttempts = this.reconnectAttempts.get(userId) || 0;
            this.reconnectAttempts.set(userId, currentAttempts + 1);
            
            // Exponential backoff: 5s, 10s, 20s, 40s, 60s
            const delay = Math.min(5000 * Math.pow(2, currentAttempts), 60000);
            console.log(`Reconnecting user ${userId} in ${delay}ms (attempt ${currentAttempts + 1}/${this.MAX_RECONNECT_ATTEMPTS})`);
            
            setTimeout(() => {
              this.initializeClient(userId, true);
            }, delay);
          } else {
            // User logged out, clean up
            console.log(`User ${userId} logged out, cleaning up`);
            this.reconnectAttempts.delete(userId);
            await this.handleClientDisconnected(userId);
          }
        } else if (connection === 'open') {
          console.log(`WhatsApp connected for user ${userId}`);
          this.connectionStates.set(userId, true);
          this.qrCodes.delete(userId);
          this.reconnectAttempts.delete(userId);
          this.isInitializing.set(userId, false);
          await this.handleClientReady(userId, socket);
        } else if (connection === 'connecting') {
          console.log(`Connecting to WhatsApp for user ${userId}...`);
        }
      });

      // Save credentials when updated
      socket.ev.on('creds.update', saveCreds);

      this.sockets.set(userId, socket);
    } catch (error) {
      console.error(`Error initializing WhatsApp client for user ${userId}:`, error);
      this.isInitializing.set(userId, false);
      
      // Retry initialization on error
      if (!isReconnect) {
        const currentAttempts = this.reconnectAttempts.get(userId) || 0;
        if (currentAttempts < this.MAX_RECONNECT_ATTEMPTS) {
          this.reconnectAttempts.set(userId, currentAttempts + 1);
          const delay = Math.min(5000 * Math.pow(2, currentAttempts), 60000);
          setTimeout(() => {
            this.initializeClient(userId, true);
          }, delay);
        }
      }
    }
  }

  async getQRCode(userId: string): Promise<string | null> {
    // Initialize client if not exists
    if (!this.sockets.has(userId)) {
      await this.initializeClient(userId);
      // Wait a bit for QR code to be generated
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    return this.qrCodes.get(userId) || null;
  }

  async requestPairingCode(userId: string, phoneNumber: string): Promise<string> {
    try {
      // Initialize client if not exists
      if (!this.sockets.has(userId)) {
        await this.initializeClient(userId);
      }

      // Wait for socket to be ready and QR to be generated (indicates connection is stable)
      let attempts = 0;
      const maxAttempts = 10;
      while (attempts < maxAttempts) {
        const socket = this.sockets.get(userId);
        const hasQr = this.qrCodes.has(userId);
        
        if (socket && hasQr) {
          break; // Socket is ready
        }
        
        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;
      }

      const socket = this.sockets.get(userId);
      if (!socket) {
        throw new BadRequestException('Failed to initialize WhatsApp client. Please try again.');
      }

      // Check if we have a QR code (means connection is in pairing mode)
      if (!this.qrCodes.has(userId)) {
        throw new BadRequestException('Connection not ready. Please wait and try again.');
      }

      // Format phone number (remove + and any spaces)
      const formattedPhone = phoneNumber.replace(/[^\d]/g, '');
      
      // Request pairing code
      const pairingCode = await socket.requestPairingCode(formattedPhone);
      
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

    // Check if socket is connected
    const isConnected = this.connectionStates.get(userId) || false;
    if (isConnected) {
      const socket = this.sockets.get(userId);
      if (socket?.user) {
        return {
          isConnected: true,
          phoneNumber: socket.user.id.split(':')[0],
        };
      }
    }

    return {
      isConnected: false,
      phoneNumber: null,
    };
  }

  async disconnect(userId: string): Promise<void> {
    const socket = this.sockets.get(userId);
    if (socket) {
      try {
        await socket.logout();
      } catch (error) {
        console.error(`Error logging out socket for user ${userId}:`, error);
      }
      try {
        socket.end(undefined);
      } catch (error) {
        console.error(`Error ending socket for user ${userId}:`, error);
      }
      this.sockets.delete(userId);
    }

    this.qrCodes.delete(userId);
    this.connectionStates.set(userId, false);
    this.isInitializing.set(userId, false);
    this.reconnectAttempts.delete(userId);

    // Delete auth folder
    const authBaseDir = process.env.WHATSAPP_AUTH_DIR || path.join(process.cwd(), '.wwebjs_auth');
    const authFolder = path.join(authBaseDir, userId);
    if (fs.existsSync(authFolder)) {
      try {
        fs.rmSync(authFolder, { recursive: true, force: true });
      } catch (error: any) {
        console.warn(`Could not delete auth folder for user ${userId}:`, error.message);
      }
    }

    // Update database
    await this.whatsappConnectionRepository.update(
      { userId },
      { isConnected: false },
    );
  }

  private async handleClientReady(userId: string, socket: WASocket): Promise<void> {
    try {
      const phoneNumber = socket.user?.id.split(':')[0] || null;

      if (!phoneNumber) {
        console.error('Could not get phone number from socket');
        return;
      }

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
    } catch (error) {
      console.error('Error handling client ready:', error);
    }
  }

  private async handleClientDisconnected(userId: string): Promise<void> {
    this.sockets.delete(userId);
    this.qrCodes.delete(userId);
    this.connectionStates.set(userId, false);
    this.isInitializing.set(userId, false);
    this.reconnectAttempts.delete(userId);

    await this.whatsappConnectionRepository.update(
      { userId },
      { isConnected: false },
    );
  }

  // Get socket for sending messages (will be used later)
  getSocket(userId: string): WASocket | undefined {
    return this.sockets.get(userId);
  }

  // Send a text message
  async sendMessage(userId: string, to: string, message: string): Promise<void> {
    const socket = this.sockets.get(userId);
    if (!socket || !this.connectionStates.get(userId)) {
      throw new BadRequestException('WhatsApp is not connected');
    }

    // Format the phone number to WhatsApp JID format
    const jid = to.replace(/[^\d]/g, '') + '@s.whatsapp.net';
    
    await socket.sendMessage(jid, { text: message });
  }

  // Send bulk messages
  async sendBulkMessages(
    userId: string,
    messages: Array<{ phone: string; message: string; name?: string }>,
  ): Promise<Array<{ phone: string; name?: string; status: 'success' | 'failed'; error?: string }>> {
    // Check connection status from database first
    const connection = await this.whatsappConnectionRepository.findOne({
      where: { userId, isConnected: true },
    });

    if (!connection) {
      throw new BadRequestException('WhatsApp is not connected. Please connect your WhatsApp account first.');
    }

    // Check subscription and package limits
    const subscription = await this.subscriptionRepository.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });

    if (!subscription) {
      throw new BadRequestException('No active subscription found. Please subscribe to a package first.');
    }

    // Check if subscription expired
    if (new Date() > subscription.endDate) {
      subscription.status = SubscriptionStatus.EXPIRED;
      await this.subscriptionRepository.save(subscription);
      throw new BadRequestException('Your subscription has expired. Please renew your subscription.');
    }

    // Check messages limit
    if (subscription.messagesRemaining < messages.length) {
      throw new BadRequestException(
        `You only have ${subscription.messagesRemaining} messages remaining, but you're trying to send ${messages.length} messages. Please select fewer contacts or upgrade your package.`
      );
    }

    // Check character limit for each message
    for (const msg of messages) {
      if (msg.message.length > subscription.charactersLimit) {
        throw new BadRequestException(
          `Message is too long. Maximum ${subscription.charactersLimit} characters allowed, but your message has ${msg.message.length} characters.`
        );
      }
    }

    // Check if socket exists and is connected
    let socket = this.sockets.get(userId);
    let isConnected = this.connectionStates.get(userId);
    
    if (!socket || !isConnected) {
      // Try to reinitialize if we have a connection in DB but no socket
      try {
        await this.initializeClient(userId, true);
        // Wait a bit for connection to establish
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        socket = this.sockets.get(userId);
        isConnected = this.connectionStates.get(userId);
        
        if (!socket || !isConnected) {
          throw new BadRequestException('WhatsApp connection is not active. Please reconnect your WhatsApp account.');
        }
      } catch (error) {
        throw new BadRequestException('WhatsApp is not connected. Please reconnect your WhatsApp account.');
      }
    }

    // Final check - socket must be defined at this point
    if (!socket) {
      throw new BadRequestException('WhatsApp socket is not available. Please reconnect your WhatsApp account.');
    }

    const results: Array<{ phone: string; name?: string; status: 'success' | 'failed'; error?: string }> = [];
    let successCount = 0;

    // Prepare messages for database saving
    const messagesToSave: Array<{ phone: string; message: string; name?: string; status: MessageStatus; error?: string }> = [];

    for (const msg of messages) {
      try {
        // Format the phone number to WhatsApp JID format
        const jid = msg.phone.replace(/[^\d]/g, '') + '@s.whatsapp.net';
        
        await socket.sendMessage(jid, { text: msg.message });
        
        results.push({
          phone: msg.phone,
          name: msg.name,
          status: 'success',
        });
        messagesToSave.push({
          phone: msg.phone,
          message: msg.message,
          name: msg.name,
          status: MessageStatus.SENT,
        });
        successCount++;
      } catch (error) {
        const errorMessage = error.message || 'Failed to send message';
        results.push({
          phone: msg.phone,
          name: msg.name,
          status: 'failed',
          error: errorMessage,
        });
        messagesToSave.push({
          phone: msg.phone,
          message: msg.message,
          name: msg.name,
          status: MessageStatus.FAILED,
          error: errorMessage,
        });
      }
    }

    // Save all messages to database
    try {
      await this.messagesService.createBulkMessages(userId, messagesToSave);
    } catch (error) {
      // Log error but don't fail the request
      console.error('Failed to save messages to database:', error);
    }

    // Update subscription: decrement messages for successfully sent messages
    if (successCount > 0) {
      subscription.messagesUsed += successCount;
      subscription.messagesRemaining -= successCount;
      await this.subscriptionRepository.save(subscription);
    }

    return results;
  }
}
