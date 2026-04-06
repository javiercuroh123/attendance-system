import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

interface JwtPayload {
  sub: string;
  email: string;
  status: string;
  roles: string[];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.password_hash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('El usuario está inactivo');
    }

    const roles = user.roles.map((role) => role.code);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      status: user.status,
      roles,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '8h',
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: '7d',
    });

    await this.usersService.updateLastLoginAndRefreshToken(
      user.id,
      refreshToken,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
        roles,
      },
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const payload = await this.jwtService.verifyAsync<JwtPayload>(
      dto.refreshToken,
    );
    const user = await this.usersService.findOneOrFail(payload.sub);

    if (!user.refresh_token_hash) {
      throw new UnauthorizedException('No hay sesión activa');
    }

    const tokenMatches = await bcrypt.compare(
      dto.refreshToken,
      user.refresh_token_hash,
    );
    if (!tokenMatches) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const roles = user.roles.map((role) => role.code);
    const newPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      status: user.status,
      roles,
    };

    const accessToken = await this.jwtService.signAsync(newPayload, {
      expiresIn: '8h',
    });
    const refreshToken = await this.jwtService.signAsync(newPayload, {
      expiresIn: '7d',
    });

    await this.usersService.updateRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
    };
  }

  async logout(currentUser: AuthenticatedUser) {
    await this.usersService.clearRefreshToken(currentUser.userId);
    return { success: true, message: 'Sesión cerrada correctamente' };
  }

  async me(currentUser: AuthenticatedUser) {
    const user = await this.usersService.findOneOrFail(currentUser.userId);
    return {
      id: user.id,
      email: user.email,
      status: user.status,
      roles: user.roles.map((role) => role.code),
      lastLoginAt: user.last_login_at,
    };
  }
}
