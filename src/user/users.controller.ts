import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { nestHttpExceptionSchema } from '../common/swagger/nest-exception.schema';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';

@ApiTags('user')
@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users' })
  @ApiOkResponse({ description: 'Array of users (password is never included)' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by id' })
  @ApiOkResponse({ description: 'User without password' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid UUID (not v4)',
    content: {
      'application/json': {
        schema: nestHttpExceptionSchema(
          400,
          'Bad Request',
          'Validation failed (uuid)',
        ),
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User with this id does not exist',
    content: {
      'application/json': {
        schema: nestHttpExceptionSchema(404, 'Not Found', 'User not found'),
      },
    },
  })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create user' })
  @ApiCreatedResponse({ description: 'Created user without password' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed (missing/invalid fields)',
    content: {
      'application/json': {
        schema: nestHttpExceptionSchema(400, 'Bad Request'),
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Login already exists',
    content: {
      'application/json': {
        schema: nestHttpExceptionSchema(
          409,
          'Conflict',
          'Login already exists',
        ),
      },
    },
  })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update password' })
  @ApiOkResponse({ description: 'Updated user without password' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid UUID or validation failed (missing old/new password)',
    content: {
      'application/json': {
        schema: nestHttpExceptionSchema(
          400,
          'Bad Request',
          'Validation failed',
        ),
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
    content: {
      'application/json': {
        schema: nestHttpExceptionSchema(404, 'Not Found', 'User not found'),
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'oldPassword does not match',
    content: {
      'application/json': {
        schema: nestHttpExceptionSchema(403, 'Forbidden', 'Forbidden resource'),
      },
    },
  })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdatePasswordDto,
  ) {
    return this.usersService.updatePassword(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user' })
  @ApiNoContentResponse({ description: 'User deleted' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid UUID',
    content: {
      'application/json': {
        schema: nestHttpExceptionSchema(
          400,
          'Bad Request',
          'Validation failed (uuid)',
        ),
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
    content: {
      'application/json': {
        schema: nestHttpExceptionSchema(404, 'Not Found', 'User not found'),
      },
    },
  })
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    this.usersService.remove(id);
  }
}
