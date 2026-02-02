import { AbstractEntity } from 'common/entities';
import { TransactionCategory } from 'common/constants';
import { UserEntity } from 'modules/user/entities';
import { BudgetDto } from 'modules/budget/dtos';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'budgets' })
export class BudgetEntity extends AbstractEntity<BudgetDto> {
  @Column({
    type: 'enum',
    enum: TransactionCategory,
  })
  category: TransactionCategory;


  @Column('decimal', { precision: 13, scale: 2 })
  limitAmount: number;

  @Column('decimal', { precision: 13, scale: 2, default: 0 })
  spentAmount: number;

  @Column({ type: 'int', comment: 'Month (1-12)' })
  month: number;

  @Column({ type: 'int', comment: 'Year (e.g., 2026)' })
  year: number;

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

  dtoClass = BudgetDto;
}
