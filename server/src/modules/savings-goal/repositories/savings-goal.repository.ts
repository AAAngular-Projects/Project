import { SavingsGoalEntity } from 'modules/savings-goal/entities';
import { Repository } from 'typeorm';
import { EntityRepository } from 'typeorm/decorator/EntityRepository';

@EntityRepository(SavingsGoalEntity)
export class SavingsGoalRepository extends Repository<SavingsGoalEntity> {}
