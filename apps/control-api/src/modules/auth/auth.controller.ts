import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';
import { AuthService } from './auth.service';

class SignInDto {
  @IsEmail()
  email!: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in (placeholder — dev only)' })
  async signIn(@Body() dto: SignInDto) {
    return this.authService.signIn(dto.email);
  }
}
