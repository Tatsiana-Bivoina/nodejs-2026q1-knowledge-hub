import prisma from '../lib/prisma';

type Role = 'viewer' | 'editor' | 'admin';

const promoteUserRole = async (userId: string, role: Role): Promise<void> => {
  const prismaRole =
    role === 'admin' ? 'ADMIN' : role === 'editor' ? 'EDITOR' : 'VIEWER';

  await prisma.user.update({
    where: { id: userId },
    data: { role: prismaRole },
  });
};

export default promoteUserRole;
