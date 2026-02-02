import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeBillIndexes1738362100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add index for bills user_id (frequently queried)
    await queryRunner.query(`
      CREATE INDEX "IDX_bills_user_id" 
      ON bills ("user_id")
    `);
    
    // Add index for currency_id on bills table
    await queryRunner.query(`
      CREATE INDEX "IDX_bills_currency_id" 
      ON bills ("currency_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bills_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bills_currency_id"`);
  }
}