import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRestaurantApiKeys1719244800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE restaurants
      ADD COLUMN IF NOT EXISTS "yemeksepetiApiKey" VARCHAR,
      ADD COLUMN IF NOT EXISTS "getirApiKey" VARCHAR,
      ADD COLUMN IF NOT EXISTS "trendyolApiKey" VARCHAR,
      ADD COLUMN IF NOT EXISTS "yemeksepetiEnabled" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "getirEnabled" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "trendyolEnabled" BOOLEAN NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE restaurants
      DROP COLUMN IF EXISTS "yemeksepetiApiKey",
      DROP COLUMN IF EXISTS "getirApiKey",
      DROP COLUMN IF EXISTS "trendyolApiKey",
      DROP COLUMN IF EXISTS "yemeksepetiEnabled",
      DROP COLUMN IF EXISTS "getirEnabled",
      DROP COLUMN IF EXISTS "trendyolEnabled"
    `);
  }
}
