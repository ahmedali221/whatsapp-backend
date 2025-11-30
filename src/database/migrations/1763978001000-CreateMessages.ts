import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateMessages1763978001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'messages',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'contact_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'recipient_phone',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'recipient_name',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'message',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['PENDING', 'SENT', 'FAILED'],
            default: "'PENDING'",
          },
          {
            name: 'error',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Foreign key to users
    await queryRunner.createForeignKey(
      'messages',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Foreign key to contacts
    await queryRunner.createForeignKey(
      'messages',
      new TableForeignKey({
        columnNames: ['contact_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'contacts',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('messages');
    if (table) {
      const foreignKeys = table.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('messages', foreignKey);
      }
    }
    await queryRunner.dropTable('messages');
  }
}

