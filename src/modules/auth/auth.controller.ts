import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from '../users/user.entity';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req) {
    return this.authService.profile(req.user.userId)
  }
  @Post('register')
  async register(@Body() body: User) {
    return this.authService.register(body);
  }

  @Post('login')
  async login(@Body() body: Partial<User>) {
    return this.authService.login(body.email, body.password);
  }
}
