import {
    WebSocketGateway,
    SubscribeMessage,
    MessageBody,
    WebSocketServer,
    ConnectedSocket,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { ChatService } from './chat.service';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private connectedUsers = new Map<string, string>(); // socketId -> userId

    constructor(
        private jwtService: JwtService,
        private usersService: UsersService,
        private chatService: ChatService,
    ) { }

    async handleConnection(client: Socket) {
        try {
            const token = client.handshake.auth.token;
            if (!token) {
                console.log('No token provided in handshake');
                client.disconnect();
                return;
            }

            const payload = this.jwtService.verify(token);
            const userId = payload.sub;

            this.connectedUsers.set(client.id, userId);
            await this.usersService.updateOnlineStatus(userId, true);

            this.server.emit('userStatusChanged', { userId, status: 'online' });
            console.log(`User connected: ${userId} (Socket: ${client.id})`);
        } catch (err) {
            console.error('WebSocket connection error:', err.message);
            client.disconnect();
        }
    }

    async handleDisconnect(client: Socket) {
        const userId = this.connectedUsers.get(client.id);
        if (userId) {
            this.connectedUsers.delete(client.id);
            await this.usersService.updateOnlineStatus(userId, false);

            this.server.emit('userStatusChanged', { userId, status: 'offline' });
            console.log(`User disconnected: ${userId} (Socket: ${client.id})`);
        }
    }

    @SubscribeMessage('sendMessage')
    async handleMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { receiverId: string; content: string },
    ) {
        const senderId = this.connectedUsers.get(client.id);
        if (!senderId) {
            console.log('Message attempt from unauthenticated socket:', client.id);
            return;
        }

        console.log(`Message from ${senderId} to ${data.receiverId}: ${data.content}`);

        try {
            const message = await this.chatService.create(senderId, data.receiverId, data.content);

            const receiverSocketIds = Array.from(this.connectedUsers.entries())
                .filter(([_, userId]) => String(userId) === String(data.receiverId))
                .map(([socketId]) => socketId);

            receiverSocketIds.forEach(id => {
                this.server.to(id).emit('receiveMessage', message);
            });

            client.emit('receiveMessage', message);
        } catch (err) {
            console.error('Error saving/sending message:', err);
        }
    }

    @SubscribeMessage('markAsRead')
    async handleMarkAsRead(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { senderId: string },
    ) {
        const receiverId = this.connectedUsers.get(client.id);
        if (!receiverId) return;

        try {
            await this.chatService.markAllAsRead(data.senderId, receiverId);

            const senderSocketIds = Array.from(this.connectedUsers.entries())
                .filter(([_, userId]) => String(userId) === String(data.senderId))
                .map(([socketId]) => socketId);

            senderSocketIds.forEach(id => {
                this.server.to(id).emit('messagesRead', {
                    readerId: receiverId,
                    senderId: data.senderId
                });
            });
        } catch (err) {
            console.error('Error marking messages as read:', err);
        }
    }
}
