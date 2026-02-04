import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';

@Injectable()
export class ChatService {
    constructor(@InjectModel(Message.name) private messageModel: Model<MessageDocument>) { }

    async create(senderId: string, receiverId: string, content: string): Promise<MessageDocument> {
        const newMessage = new this.messageModel({
            sender: new Types.ObjectId(senderId),
            receiver: new Types.ObjectId(receiverId),
            content,
        });
        return (await newMessage.save()).populate('sender receiver');
    }

    async getChatHistory(user1: string, user2: string): Promise<MessageDocument[]> {
        return this.messageModel
            .find({
                $or: [
                    { sender: new Types.ObjectId(user1), receiver: new Types.ObjectId(user2) },
                    { sender: new Types.ObjectId(user2), receiver: new Types.ObjectId(user1) },
                ],
            })
            .sort({ createdAt: 1 })
            .populate('sender receiver')
            .exec();
    }

    async markAllAsRead(senderId: string, receiverId: string): Promise<any> {
        return await this.messageModel.updateMany(
            {
                sender: new Types.ObjectId(senderId),
                receiver: new Types.ObjectId(receiverId),
                isRead: { $ne: true },
            },
            { $set: { isRead: true } },
        );
    }
}
