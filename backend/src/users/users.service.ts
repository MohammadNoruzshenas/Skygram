import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Message, MessageDocument } from '../chat/schemas/message.schema';

@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    ) { }

    async create(user: Partial<User>): Promise<UserDocument> {
        const newUser = new this.userModel(user);
        return newUser.save();
    }

    async findByEmail(email: string): Promise<UserDocument | null> {
        return this.userModel.findOne({ email }).exec();
    }

    async findById(id: string): Promise<UserDocument | null> {
        return this.userModel.findById(id).exec();
    }

    async findAll(currentUserId: string): Promise<any[]> {
        const users = await this.userModel.find({ _id: { $ne: currentUserId } }).select('-password').exec();

        const usersWithCounts = await Promise.all(users.map(async (u) => {
            const unreadCount = await this.messageModel.countDocuments({
                sender: u._id,
                receiver: currentUserId,
                isRead: false,
            });
            return {
                ...u.toObject(),
                unreadCount,
            };
        }));

        return usersWithCounts;
    }

    async updateOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
        await this.userModel.findByIdAndUpdate(userId, { isOnline }).exec();
    }
}

