import { AbstractEntity } from 'common/entities';
import { SavingsGoalStatus } from 'common/constants';
import { UserEntity } from 'modules/user/entities';
import { CurrencyEntity } from 'modules/currency/entities';
import { SavingsGoalDto } from 'modules/savings-goal/dtos';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'savings_goals' })
export class SavingsGoalEntity extends AbstractEntity<SavingsGoalDto> {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column('decimal', { precision: 13, scale: 2, default: 0 })
  targetAmount: number;

  @Column('decimal', { precision: 13, scale: 2, default: 0 })
  currentAmount: number;

  @Column({ type: 'date', nullable: true })
  targetDate?: Date;

  @Column({
    type: 'enum',
    enum: SavingsGoalStatus,
    default: SavingsGoalStatus.ACTIVE,
  })
  status: SavingsGoalStatus;

  @CreateDateColumn({
    type: 'timestamp with time zone',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    nullable: true,
  })
  updatedAt: Date;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  user: UserEntity;

  @ManyToOne(() => CurrencyEntity, { nullable: false, onDelete: 'CASCADE' })
  currency: CurrencyEntity;

  dtoClass = SavingsGoalDto;
}
