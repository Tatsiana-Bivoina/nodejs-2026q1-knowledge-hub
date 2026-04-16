import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ArticlesService } from '../../article/articles.service';
import { CommentsService } from '../../comment/comments.service';
import { UserRole } from '../../common/enums/user-role.enum';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticatedRequest } from '../types/auth-user.type';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly articlesService: ArticlesService,
    private readonly commentsService: CommentsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (this.isPublicPath(request.path)) {
      return true;
    }

    const user = request.user;
    if (!user) {
      return false;
    }

    if (request.method === 'GET') {
      return true;
    }

    if (user.role === UserRole.ADMIN) {
      return true;
    }

    if (user.role === UserRole.VIEWER) {
      throw new ForbiddenException();
    }

    return this.checkEditorAccess(request, user.sub);
  }

  private isPublicPath(path: string): boolean {
    return path === '/' || path === '/doc' || path.startsWith('/doc/');
  }

  private async checkEditorAccess(
    request: AuthenticatedRequest,
    userId: string,
  ): Promise<boolean> {
    switch (request.baseUrl) {
      case '/article':
        return this.checkEditorArticleAccess(request, userId);
      case '/comment':
        return this.checkEditorCommentAccess(request, userId);
      case '/category':
      case '/user':
        throw new ForbiddenException();
      default:
        throw new ForbiddenException();
    }
  }

  private async checkEditorArticleAccess(
    request: AuthenticatedRequest,
    userId: string,
  ): Promise<boolean> {
    if (request.method === 'POST') {
      const authorId = request.body?.authorId;
      if (authorId !== undefined && authorId !== null && authorId !== userId) {
        throw new ForbiddenException();
      }
      return true;
    }

    if (request.method === 'PUT') {
      const articleId = request.params.id;
      const currentAuthorId =
        await this.articlesService.findAuthorId(articleId);
      if (currentAuthorId !== userId) {
        throw new ForbiddenException();
      }

      const nextAuthorId = request.body?.authorId;
      if (
        nextAuthorId !== undefined &&
        nextAuthorId !== null &&
        nextAuthorId !== userId
      ) {
        throw new ForbiddenException();
      }
      if (nextAuthorId === null) {
        throw new ForbiddenException();
      }
      return true;
    }

    throw new ForbiddenException();
  }

  private async checkEditorCommentAccess(
    request: AuthenticatedRequest,
    userId: string,
  ): Promise<boolean> {
    if (request.method === 'POST') {
      const authorId = request.body?.authorId;
      if (authorId !== undefined && authorId !== null && authorId !== userId) {
        throw new ForbiddenException();
      }
      return true;
    }

    if (request.method === 'PUT') {
      throw new ForbiddenException();
    }

    if (request.method === 'DELETE') {
      const commentId = request.params.id;
      const currentAuthorId =
        await this.commentsService.findAuthorId(commentId);
      if (currentAuthorId !== userId) {
        throw new ForbiddenException();
      }
      throw new ForbiddenException();
    }

    throw new ForbiddenException();
  }
}
