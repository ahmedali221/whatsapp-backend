import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPhoneNumberToUsers1763977000000 implements MigrationInterface {
  name = 'AddPhoneNumberToUsers1763977000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'phone_number',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'phone_number');
  }
}

