import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Generated,
} from 'typeorm';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Restaurant } from '../restaurants/restaurant.entity';
import { Courier } from '../couriers/courier.entity';

export enum OrderStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  PICKED_UP = 'picked_up',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Generated('increment')
  orderNumber: number;

  @Column()
  restaurantId: string;

  @Column({ type: 'uuid', nullable: true })
  courierId: string | null;

  @Column()
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @Column()
  @IsString()
  @IsNotEmpty()
  customerPhone: string;

  @Column()
  @IsString()
  @IsNotEmpty()
  deliveryAddress: string;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  @IsOptional()
  deliveryLatitude: number;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  @IsOptional()
  deliveryLongitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  orderTotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deliveryFee: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  notes: string;

  @Column({ nullable: true, type: 'uuid' })
  offeredCourierId: string | null;

  @Column({ nullable: true, type: 'timestamp' })
  offeredAt: Date | null;

  @Column('text', { array: true, nullable: true })
  rejectedCourierIds: string[];

  @Column({ nullable: true, type: 'timestamp' })
  assignedAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  pickedUpAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  deliveredAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  cancelledAt: Date;

  @ManyToOne(() => Restaurant, (restaurant) => restaurant.orders, {
    nullable: false,
  })
  @JoinColumn({ name: 'restaurantId' })
  restaurant: Restaurant;

  @ManyToOne(() => Courier, { nullable: true })
  @JoinColumn({ name: 'courierId' })
  courier: Courier | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
