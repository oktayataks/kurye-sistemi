import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { IsEnum, IsOptional } from 'class-validator';
import { User } from '../users/user.entity';
import { Order } from '../orders/order.entity';

export enum VehicleType {
  BIKE = 'bike',
  MOTORBIKE = 'motorbike',
  CAR = 'car',
}

@Entity('couriers')
export class Courier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: VehicleType, default: VehicleType.MOTORBIKE })
  @IsEnum(VehicleType)
  vehicleType: VehicleType;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  @IsOptional()
  latitude: number;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  @IsOptional()
  longitude: number;

  @Column({ default: false })
  isOnline: boolean;

  @Column({ type: 'int', default: 0 })
  currentOrders: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @OneToOne(() => User, (user) => user.courier)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => Order, (order) => order.courier)
  orders: Order[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
