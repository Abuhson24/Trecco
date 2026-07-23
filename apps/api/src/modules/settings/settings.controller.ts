import { Body, Controller, Get, Patch, Post, Delete, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { memberImageMulterOptions } from '../../common/config/multer.config';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('profile')
  async getProfile(@Req() req: any) {
    return this.settings.getProfile(req.user.memberId);
  }

  @Patch('profile')
  async updateProfile(@Req() req: any, @Body() body: { fullName?: string; address?: string }) {
    return this.settings.updateProfile(req.user.memberId, body);
  }

  @Post('profile/image')
  @UseInterceptors(FileInterceptor('image', memberImageMulterOptions))
  async uploadProfileImage(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file uploaded — field name must be "image"');
    }
    const imageUrl = `/uploads/members/${file.filename}`;
    return this.settings.updateProfileImage(req.user.memberId, imageUrl);
  }

  @Patch('language')
  async updateLanguage(@Req() req: any, @Body() body: { preferredLanguage: string }) {
    return this.settings.updateLanguage(req.user.memberId, body.preferredLanguage);
  }

  @Post('change-password')
  async changePassword(@Req() req: any, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.settings.changePassword(req.user.memberId, body.currentPassword, body.newPassword);
  }

  @Post('transaction-pin')
  async setTransactionPin(@Req() req: any, @Body() body: { password: string; newPin: string }) {
    return this.settings.setTransactionPin(req.user.memberId, body.password, body.newPin);
  }

  @Post('panic-password')
  async setPanicPassword(@Req() req: any, @Body() body: { password: string; newPanicPassword: string }) {
    return this.settings.setPanicPassword(req.user.memberId, body.password, body.newPanicPassword);
  }

  @Delete('panic-password')
  async removePanicPassword(@Req() req: any, @Body() body: { password: string }) {
    return this.settings.removePanicPassword(req.user.memberId, body.password);
  }

  @Delete('account')
  async deleteAccount(@Req() req: any, @Body() body: { password: string }) {
    return this.settings.deleteAccount(req.user.memberId, body.password);
  }
}
