import { authRoutes } from '../endpoints';
import { decode } from 'jsonwebtoken';

const getAdminTokenAndUserId = async (request) => {
  const login = 'admin';
  const password = 'password123';

  const {
    body: { accessToken, refreshToken },
  } = await request
    .post(authRoutes.login)
    .set('Accept', 'application/json')
    .send({ login, password });

  const payload = decode(accessToken, { json: true }) as
    | { userId?: string }
    | null;
  const userId = payload?.userId;

  if (userId === undefined || accessToken === undefined) {
    throw new Error('Authorization is not implemented');
  }

  const token = `Bearer ${accessToken}`;

  return {
    token,
    accessToken,
    refreshToken,
    mockUserId: userId,
    login,
  };
};

export default getAdminTokenAndUserId;

