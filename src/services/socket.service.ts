import { SocketGateway } from '../gateway/socket.gateway';

export class SocketService {
  private static gateway: SocketGateway | null = null;

  static setGateway(gateway: SocketGateway) {
    this.gateway = gateway;
  }

  static getGateway(): SocketGateway | null {
    return this.gateway;
  }

  static emitToUser(userId: string, event: string, data: any) {
    this.gateway?.emitToUser(userId, event, data);
  }

  static emitToConversation(conversationId: string, event: string, data: any) {
    this.gateway?.emitToConversation(conversationId, event, data);
  }

  static isUserOnline(userId: string): boolean {
    return this.gateway?.isUserOnline(userId) || false;
  }
}

