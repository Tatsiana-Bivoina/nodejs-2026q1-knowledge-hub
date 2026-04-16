import { authRoutes } from '../endpoints';

const getTokenAndUserId = async (request) => {
  const createUserDto = {
    login: `TEST_AUTH_LOGIN_${Date.now()}`,
    password: 'Tu6!@#%&',
  };

  // create user
  const {
    body: { id: mockUserId },
  } = await request
    .post(authRoutes.signup)
    .set('Accept', 'application/json')
    .send(createUserDto);

  // get token
  const {
    body: { accessToken, refreshToken },
  } = await request
    .post(authRoutes.login)
    .set('Accept', 'application/json')
    .send(createUserDto);

  if (mockUserId === undefined || accessToken === undefined) {
    throw new Error('Authorization is not implemented');
  }

  const token = `Bearer ${accessToken}`;

  return {
    token,
    accessToken,
    refreshToken,
    mockUserId,
    login: createUserDto.login,
  };
};

export default getTokenAndUserId;
