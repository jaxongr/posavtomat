import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { StockManager } from './stock.manager';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, StockManager],
  exports: [InventoryService, StockManager],
})
export class InventoryModule {}
