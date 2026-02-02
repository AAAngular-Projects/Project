import { MigrationInterface, QueryRunner } from 'typeorm';

export class ModifyCurrencyForHistory1738327822000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE currency
       DROP CONSTRAINT IF EXISTS "UQ_77f11186dd58a8d87ad5fff0246"
    `);

    await queryRunner.query(`
      ALTER TABLE currency 
      DROP CONSTRAINT IF EXISTS "UQ_currency_name"
    `);


    // Add a recordedAt column to track when each exchange rate was recorded
    await queryRunner.query(`
      ALTER TABLE currency 
      ADD COLUMN "recorded_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    `);

    await queryRunner.query(`
      ALTER TABLE currency 
      DROP CONSTRAINT IF EXISTS "currency_name_key"
    `);

    // Add a composite unique constraint on name + recordedAt to prevent duplicate records
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_currency_name_recorded_at" 
      ON currency ("name", "recorded_at")
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
      DROP COLUMN "recorded_at"
    `);
  }
}
