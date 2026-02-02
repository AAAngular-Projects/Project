import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeTransactionIndexes1738362000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add indexes for transaction performance optimization
    
    // Index for authorization status (most queries filter by this)
    await queryRunner.query(`
      CREATE INDEX "IDX_transaction_authorization_status" 
      ON transactions ("authorization_status")
    `);
    
    // Index for updated_at column (used for ordering)
    await queryRunner.query(`
      CREATE INDEX "IDX_transaction_updated_at" 
      ON transactions ("updated_at")
    `);
    
    // Index for created_at column (used for date filtering)
    await queryRunner.query(`
      CREATE INDEX "IDX_transaction_created_at" 
      ON transactions ("created_at")
    `);
    
    // Composite index for sender_bill_id + authorization_status
    await queryRunner.query(`
      CREATE INDEX "IDX_transaction_sender_bill_auth_status" 
      ON transactions ("sender_bill_id", "authorization_status")
    `);
    
    // Composite index for recipient_bill_id + authorization_status
    await queryRunner.query(`
      CREATE INDEX "IDX_transaction_recipient_bill_auth_status" 
      ON transactions ("recipient_bill_id", "authorization_status")
    `);
    
    // Composite index for updated_at + id (for consistent pagination)
    await queryRunner.query(`
      CREATE INDEX "IDX_transaction_updated_at_id" 
      ON transactions ("updated_at" DESC, "id" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove all the indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transaction_authorization_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transaction_updated_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transaction_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transaction_sender_bill_auth_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transaction_recipient_bill_auth_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transaction_updated_at_id"`);
  }
}