import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationMessage } from './entities/conversation-message.entity';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(ConversationMessage)
    private readonly repo: Repository<ConversationMessage>,
  ) {}

  async saveMessage(dto: {
    channelId: string;
    visitorId: string;
    cozeConversationId?: string;
    role: 'user' | 'assistant';
    content: string;
  }): Promise<ConversationMessage> {
    const entity = this.repo.create(dto);
    return this.repo.save(entity);
  }

  async findLastConversationId(channelId: string, visitorId: string): Promise<string | null> {
    const last = await this.repo.findOne({
      where: { channelId, visitorId },
      order: { id: 'DESC' },
    });
    return last?.cozeConversationId ?? null;
  }

  async getRecentMessages(
    channelId: string,
    visitorId: string,
    limit: number = 20,
  ): Promise<ConversationMessage[]> {
    return this.repo.find({
      where: { channelId, visitorId },
      order: { id: 'DESC' },
      take: limit,
    });
  }

  async listForAdmin(channelId?: string, limit: number = 100) {
    const qb = this.repo
      .createQueryBuilder('m')
      .orderBy('m.id', 'DESC')
      .take(limit);
    if (channelId) {
      qb.andWhere('m.channelId = :channelId', { channelId });
    }
    return qb.getMany();
  }
}
