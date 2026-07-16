import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { inventoryImageMulterOptions } from '../../common/config/multer.config';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  // Member adds their own produce/stock.
  @UseGuards(JwtAuthGuard)
  @Post()
  async createItem(@Req() req: any, @Body() body: any) {
    return this.inventory.createItem(req.user.memberId, body);
  }

  // Member lists their own items.
  @UseGuards(JwtAuthGuard)
  @Get('mine')
  async listMine(@Req() req: any) {
    return this.inventory.listMine(req.user.memberId);
  }

  // Member edits their own item (ownership checked in the service).
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateItem(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.inventory.updateItem(req.user.memberId, id, body);
  }

  // Member deletes their own item (ownership + linked-offer check in the service).
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteItem(@Req() req: any, @Param('id') id: string) {
    return this.inventory.deleteItem(req.user.memberId, id);
  }

  // Member uploads/replaces the photo for their own item. multer validates
  // MIME type + extension + size before this handler even runs (see
  // multer.config.ts) — file is already safely on disk with a random
  // filename by the time we get here.
  @UseGuards(JwtAuthGuard)
  @Post(':id/image')
  @UseInterceptors(FileInterceptor('image', inventoryImageMulterOptions))
  async uploadImage(@Req() req: any, @Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file uploaded — field name must be "image"');
    }
    const imageUrl = `/uploads/inventory/${file.filename}`;
    return this.inventory.attachImage(req.user.memberId, id, imageUrl);
  }

  // Admin-only: feed of everything members have added, across the coop.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COOP_ADMIN', 'TREMMA_SUPER_ADMIN')
  @Get('admin/alerts')
  async listAlertsForAdmin(@Req() req: any) {
    return this.inventory.listAlertsForAdmin(req.user.cooperativeId);
  }

  // Member offers an item's excess against an existing open demand.
  @UseGuards(JwtAuthGuard)
  @Post(':id/list-to-marketplace/:demandId')
  async listToMarketplace(
    @Req() req: any,
    @Param('id') id: string,
    @Param('demandId') demandId: string,
    @Body() body: any,
  ) {
    return this.inventory.listToMarketplace(req.user.memberId, id, demandId, body.quantityOffered);
  }
}
