import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { IsNotEmpty, IsOptional, IsString, IsPhoneNumber } from 'class-validator';
import { User } from '../users/user.entity';
import { Order } from '../orders/order.entity';

@Entity('restaurants')
export class Restaurant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsString()
  @IsNotEmpty()
  name: string;

  @Column()
  @IsString()
  @IsNotEmpty()
  address: string;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  @IsOptional()
  latitude: number;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  @IsOptional()
  longitude: number;

  @Column({ nullable: true })
  @IsString()
  @IsOptional()
  phone: string;

  @Column()
  userId: string;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => User, (user) => user.restaurants, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => Order, (order) => order.restaurant)
  orders: Order[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
