import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Exclude } from 'class-transformer';
import { Courier } from '../couriers/courier.entity';
import { Restaurant } from '../restaurants/restaurant.entity';

export enum UserRole {
  ADMIN = 'admin',
  RESTAURANT = 'restaurant',
  COURIER = 'courier',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @IsEmail()
  email: string;

  @Column()
  @Exclude({ toPlainOnly: true })
  password: string;

  @Column()
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @Column({ nullable: true })
  @IsString()
  @IsOptional()
  phone: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.COURIER })
  @IsEnum(UserRole)
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @OneToOne(() => Courier, (courier) => courier.user, { nullable: true })
  courier: Courier;

  @OneToMany(() => Restaurant, (restaurant) => restaurant.user, {
    nullable: true,
  })
  restaurants: Restaurant[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
