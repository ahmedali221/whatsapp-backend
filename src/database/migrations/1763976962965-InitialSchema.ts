import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1763976962965 implements MigrationInterface {
    name = 'InitialSchema1763976962965'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admins" ALTER COLUMN "role" SET DEFAULT 'admin'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admins" ALTER COLUMN "role" DROP DEFAULT`);
    }

}
