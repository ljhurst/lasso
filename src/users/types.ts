export interface User {
  sub: string;
  email: string;
  emailVerified: boolean;
  givenName: string;
  familyName: string;
  passwordHash: string;
  passwordSalt: string;
  mustChangePassword: boolean;
  roles: string[];
  createdAt: string;
}
