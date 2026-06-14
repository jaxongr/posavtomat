import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthUser } from '../../common/types/auth.types';
import { AuthService } from './auth.service';
import { LoginDto, PinLoginDto, RefreshDto } from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login va parol bilan kirish (panel)' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('pin')
  @ApiOperation({ summary: 'PIN-kod bilan kirish (kassir)' })
  pinLogin(@Body() dto: PinLoginDto) {
    return this.authService.pinLogin(dto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Access tokenni yangilash' })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Get('me')
  @ApiOperation({ summary: 'Joriy foydalanuvchi' })
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
