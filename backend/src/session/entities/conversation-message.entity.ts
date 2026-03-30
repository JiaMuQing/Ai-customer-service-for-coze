import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('conversation_message')
export class ConversationMessage {
  @PrimaryGeneratedColumn()
  id!: number;

  /** Channel key (web chat uses `web`). DB column name is legacy. */
  @Column({ length: 128, name: 'wecomChatId' })
  channelId!: string;

  /** Visitor id (UUID v4 for web). DB column name is legacy. */
  @Column({ length: 128, name: 'wecomUserId' })
  visitorId!: string;

  /** Coze conversation_id for context */
  @Column({ length: 128, nullable: true })
  cozeConversationId?: string;

  /** role: user | assistant */
  @Column({ length: 32 })
  role!: string;

  @Column({ type: 'text' })
  content!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
