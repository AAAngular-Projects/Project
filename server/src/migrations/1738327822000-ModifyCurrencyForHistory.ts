import { MigrationInterface, QueryRunner } from 'typeorm';

export class ModifyCurrencyForHistory1738327822000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add a recordedAt column to track when each exchange rate was recorded
    await queryRunner.query(`
      ALTER TABLE currency 
      ADD COLUMN "recordedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    `);

    // Remove the unique constraint on name to allow multiple historical records
    await queryRunner.query(`
      ALTER TABLE currency 
      DROP CONSTRAINT IF EXISTS "UQ_currency_name"
    `);
    
    await queryRunner.query(`
      ALTER TABLE currency 
      DROP CONSTRAINT IF EXISTS "currency_name_key"
    `);

    // Add a composite unique constraint on name + recordedAt to prevent duplicate records
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_currency_name_recorded_at" 
      ON currency ("name", "recordedAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the composite index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_currency_name_recorded_at"
    `);

    // Re-add the unique constraint on name
    await queryRunner.query(`
      ALTER TABLE currency 
      ADD CONSTRAINT "UQ_currency_name" UNIQUE ("name")
    `);

    // Remove the recordedAt column
    await queryRunner.query(`
      ALTER TABLE currency 
      DROP COLUMN "recordedAt"
    `);
  }
}
