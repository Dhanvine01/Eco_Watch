import type { Device, Role } from '@prisma/client';

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
};

declare global {
  namespace Express {
    interface Request {
      device?: Device;
      user?: AuthUser;
    }
  }
}
