import {MigrationInterface, QueryRunner} from "typeorm";

export class AddAvailableFundsAndSpentAmount1769979958486 implements MigrationInterface {
    name = 'AddAvailableFundsAndSpentAmount1769979958486'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_currency_name_recorded_at"`);
        await queryRunner.query(`CREATE TYPE "public"."budgets_category_enum" AS ENUM('FOOD', 'RENT', 'SHOPPING', 'UTILITIES', 'ENTERTAINMENT', 'TRANSPORTATION', 'HEALTHCARE', 'EDUCATION', 'TRAVEL', 'SAVINGS', 'INVESTMENT', 'OTHER')`);
        await queryRunner.query(`CREATE TABLE "budgets" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(), "category" "public"."budgets_category_enum" NOT NULL, "limit_amount" numeric(13,2) NOT NULL, "spent_amount" numeric(13,2) NOT NULL DEFAULT '0', "month" integer NOT NULL, "year" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "user_id" integer NOT NULL, CONSTRAINT "PK_9c8a51748f82387644b773da482" PRIMARY KEY ("id")); COMMENT ON COLUMN "budgets"."month" IS 'Month (1-12)'; COMMENT ON COLUMN "budgets"."year" IS 'Year (e.g., 2026)'`);
        await queryRunner.query(`CREATE TYPE "public"."savings_goals_status_enum" AS ENUM('ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "savings_goals" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" text, "target_amount" numeric(13,2) NOT NULL DEFAULT '0', "current_amount" numeric(13,2) NOT NULL DEFAULT '0', "target_date" date, "status" "public"."savings_goals_status_enum" NOT NULL DEFAULT 'ACTIVE', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "user_id" integer NOT NULL, "currency_id" integer NOT NULL, CONSTRAINT "PK_4f1e133521cfbf2b4252bd8f09d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_category_enum" AS ENUM('FOOD', 'RENT', 'SHOPPING', 'UTILITIES', 'ENTERTAINMENT', 'TRANSPORTATION', 'HEALTHCARE', 'EDUCATION', 'TRAVEL', 'SAVINGS', 'INVESTMENT', 'OTHER')`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD "category" "public"."transactions_category_enum" DEFAULT 'OTHER'`);
        await queryRunner.query(`ALTER TABLE "bills" ADD "available_funds" numeric(13,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "currency" ALTER COLUMN "recorded_at" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "currency" ALTER COLUMN "recorded_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "budgets" ADD CONSTRAINT "FK_5d25d8bbd6c209261dfe04558f1" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "savings_goals" ADD CONSTRAINT "FK_acf18d62676b7b640f44cc6eba5" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "savings_goals" ADD CONSTRAINT "FK_dcf5c4d403c72b7c3efe263fc3f" FOREIGN KEY ("currency_id") REFERENCES "currency"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "savings_goals" DROP CONSTRAINT "FK_dcf5c4d403c72b7c3efe263fc3f"`);
        await queryRunner.query(`ALTER TABLE "savings_goals" DROP CONSTRAINT "FK_acf18d62676b7b640f44cc6eba5"`);
        await queryRunner.query(`ALTER TABLE "budgets" DROP CONSTRAINT "FK_5d25d8bbd6c209261dfe04558f1"`);
        await queryRunner.query(`ALTER TABLE "currency" ALTER COLUMN "recorded_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "currency" ALTER COLUMN "recorded_at" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "bills" DROP COLUMN "available_funds"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "category"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_category_enum"`);
        await queryRunner.query(`DROP TABLE "savings_goals"`);
        await queryRunner.query(`DROP TYPE "public"."savings_goals_status_enum"`);
        await queryRunner.query(`DROP TABLE "budgets"`);
        await queryRunner.query(`DROP TYPE "public"."budgets_category_enum"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_currency_name_recorded_at" ON "currency" ("name", "recorded_at") `);
    }

}
