import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser = any>(
    err: any,
    user: TUser,
    info: any,
  ): TUser {
    if (info instanceof TokenExpiredError) {
      throw new UnauthorizedException('Oturumunuz süresi doldu, lütfen tekrar giriş yapın');
    }

    if (info instanceof JsonWebTokenError) {
      throw new UnauthorizedException('Geçersiz token');
    }

    if (err || !user) {
      throw new UnauthorizedException('Kimlik doğrulama gerekli');
    }

    return user;
  }
}
