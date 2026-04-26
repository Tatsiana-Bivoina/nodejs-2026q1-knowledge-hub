import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { SignupDto } from '../../auth/dto/signup.dto';
import { CreateArticleDto } from '../../article/dto/create-article.dto';
import { CreateUserDto } from '../../user/dto/create-user.dto';
import { ArticleStatus } from '../enums/article-status.enum';
import { UserRole } from '../enums/user-role.enum';

describe('DTO validation', () => {
  it('fails when required signup fields are missing', async () => {
    const dto = new SignupDto();
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails for invalid enum in CreateArticleDto', async () => {
    const dto = new CreateArticleDto();
    dto.title = 'Title';
    dto.content = 'Body';
    dto.status = 'invalid' as unknown as ArticleStatus;

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'status')).toBe(true);
  });

  it('fails for invalid uuid in CreateArticleDto', async () => {
    const dto = new CreateArticleDto();
    dto.title = 'Title';
    dto.content = 'Body';
    dto.status = ArticleStatus.DRAFT;
    dto.authorId = 'bad-uuid';

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'authorId')).toBe(true);
  });

  it('passes for valid CreateUserDto payload', async () => {
    const dto = new CreateUserDto();
    dto.login = 'john';
    dto.password = 'secret';
    dto.role = UserRole.ADMIN;

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
