import { BudgetEntity } from 'modules/budget/entities';
import { Repository } from 'typeorm';
import { EntityRepository } from 'typeorm/decorator/EntityRepository';

@EntityRepository(BudgetEntity)
export class BudgetRepository extends Repository<BudgetEntity> {}
