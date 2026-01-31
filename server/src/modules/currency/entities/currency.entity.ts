import { AbstractEntity } from 'common/entities';
import { BillEntity } from 'modules/bill/entities';
import { CurrencyDto } from 'modules/currency/dtos';
import { UserConfigEntity } from 'modules/user/entities';
import { Column, Entity, OneToMany, UpdateDateColumn, CreateDateColumn } from 'typeorm';

@Entity({ name: 'currency' })
export class CurrencyEntity extends AbstractEntity<CurrencyDto> {
  @Column()
  name: string;

  @Column('float')
  currentExchangeRate: number;

  @Column({ default: false })
  base: boolean;

  @Column({
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'recorded_at',
  })
  recordedAt: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    nullable: true,
  })
  updatedAt: Date;

  @OneToMany(() => BillEntity, (bill: BillEntity) => bill.currency, {
    nullable: false,
  })
  bill: BillEntity[];

  @OneToMany(
    () => UserConfigEntity,
    (userConfig: UserConfigEntity) => userConfig.currency,
    { nullable: false },
  )
  userConfig: UserConfigEntity[];

  dtoClass = CurrencyDto;
}
