import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { nestHttpExceptionSchema } from '../common/swagger/nest-exception.schema';
import { AuthService, AuthTokens } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { Public } from './decorators/public.decorator';
import { PublicUser } from '../user/users.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Signup: create new user with viewer role' })
  @ApiCreatedResponse({ description: 'User created' })
  @ApiBadRequestResponse({
    description: 'Invalid signup dto',
    schema: nestHttpExceptionSchema(400, 'Bad Request'),
  })
  async signup(@Body() dto: SignupDto): Promise<PublicUser> {
    return this.authService.signup(dto);
  }

  @Post('login')
  @Public()
  @ApiOperation({ summary: 'Login: get access and refresh tokens' })
  @ApiOkResponse({
    description: 'Tokens issued',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
      },
      required: ['accessToken', 'refreshToken'],
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid login dto',
    schema: nestHttpExceptionSchema(400, 'Bad Request'),
  })
  @ApiForbiddenResponse({
    description: 'Authentication failed',
    schema: nestHttpExceptionSchema(403, 'Forbidden', 'Forbidden resource'),
  })
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<AuthTokens> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @Public()
  @ApiOperation({ summary: 'Refresh: get new access and refresh tokens' })
  @ApiOkResponse({
    description: 'New tokens issued',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
      },
      required: ['accessToken', 'refreshToken'],
    },
  })
  @ApiUnauthorizedResponse({
    description: 'No refreshToken in body',
    schema: nestHttpExceptionSchema(401, 'Unauthorized'),
  })
  @ApiForbiddenResponse({
    description: 'Refresh token is invalid or expired',
    schema: nestHttpExceptionSchema(403, 'Forbidden', 'Forbidden resource'),
  })
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto): Promise<AuthTokens> {
    return this.authService.refresh(dto);
  }
}
