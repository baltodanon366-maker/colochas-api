import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { UpdateAuthUserDto } from './dto/update-user.dto';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signUp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'SignUp', description: 'Register a new user' })
  @ApiResponse({
    status: 200,
    description: 'User registered successfully',
    schema: {
      example: {
        succeeded: true,
        title: 'Operation successful',
        message: 'The operation was executed successfully.',
        data: {
          userId: '1',
          name: 'John Doe',
          telefono: '12345678',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'User registration error',
    schema: {
      example: {
        succeeded: false,
        title: 'Operation failed',
        message: 'Detailed error message explaining the failure.',
      },
    },
  })
  async signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  // Endpoint eliminado: POST /api/v1/auth/confirm
  // No se utiliza en el sistema actual

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login', description: 'Login con número de teléfono (8 dígitos)' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        succeeded: true,
        title: 'Operation successful',
        message: 'The operation was executed successfully.',
        data: {
          access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          user: {
            id: '1',
            name: 'John Doe',
            telefono: '12345678',
            roles: ['admin'],
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Login error',
    schema: {
      example: {
        succeeded: false,
        title: 'Operation failed',
        message: 'Detailed error message explaining the failure.',
      },
    },
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh token', description: 'Obtener nuevo access_token con refresh_token' })
  @ApiResponse({
    status: 200,
    description: 'Token renovado',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: { id: '1', name: 'John Doe', telefono: '12345678', roles: ['admin'] },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Refresh token inválido o expirado' })
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refresh_token);
  }

  // Endpoints eliminados por redundancia:
  // - GET /api/v1/auth/users/:id/role → Usar GET /users/:id/roles
  // - POST /api/v1/auth/admin/add → Usar POST /users/:id/roles/:roleId
  // - POST /api/v1/auth/admin/remove → Usar DELETE /users/:id/roles/:roleId
  // - GET /api/v1/auth/admin/test → Endpoint de prueba, eliminado

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update User',
    description: 'Update a user',
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    schema: {
      example: {
        succeeded: true,
        title: 'Operation successful',
        message: 'The operation was executed successfully.',
        data: {
          name: 'John Doe',
          telefono: '12345678',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'User update error',
    schema: {
      example: {
        succeeded: false,
        title: 'Operation failed',
        message: 'Detailed error message explaining the failure.',
      },
    },
  })
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateAuthUserDto,
  ) {
    return this.authService.updateUser(id, updateUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all users',
    description: 'Get all users',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved users',
    schema: {
      example: {
        succeeded: true,
        title: 'Operation successful',
        message: 'The operation was executed successfully.',
        data: [{}],
        meta: {
          page: 1,
          take: 10,
          itemCount: 100,
          pageCount: 10,
          hasPreviousPage: false,
          hasNextPage: true,
        },
      },
    },
  })
  async getAllUsers(@Query() query: GetUsersQueryDto) {
    return this.authService.getAllUsers(query);
  }
}
