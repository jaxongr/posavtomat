import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { ShiftsModule } from '../shifts/shifts.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [InventoryModule, ShiftsModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
