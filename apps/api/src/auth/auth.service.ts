import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
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
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalizedEmail);
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

    const roles = [user.role];
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
        role: user.role,
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

    const roles = [user.role];
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
      role: user.role,
      roles: [user.role],
      lastLoginAt: user.last_login_at,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(email);

    // Always respond with success to avoid user enumeration
    if (!user || user.status !== 'ACTIVE') {
      return { message: 'Si el correo existe, recibirás las instrucciones en breve.' };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await this.usersService.savePasswordResetToken(user.id, tokenHash, expiresAt);

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:4200');
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${rawToken}`;

    await this.mailService.sendPasswordReset(email, resetUrl);

    return { message: 'Si el correo existe, recibirás las instrucciones en breve.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');
    const user = await this.usersService.findByResetToken(tokenHash);

    if (!user || !user.password_reset_expires_at) {
      throw new BadRequestException('El enlace es inválido o ha expirado.');
    }

    if (new Date() > user.password_reset_expires_at) {
      await this.usersService.clearPasswordResetToken(user.id);
      throw new BadRequestException('El enlace ha expirado. Solicita uno nuevo.');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.updatePasswordAndClearResetToken(user.id, newHash);

    return { message: 'Contraseña actualizada correctamente.' };
  }
}
