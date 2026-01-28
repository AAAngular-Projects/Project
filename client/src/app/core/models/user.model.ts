export enum RoleType {
  USER = 'USER_ROLE',
  ADMIN = 'ADMIN_ROLE',
  ROOT = 'ROOT_ROLE',
}

export interface Currency {
  name: string;
  currentExchangeRate: number;
}

export interface UserAuth {
  pinCode: number;
  lastSuccessfulLoggedDate: string;
  lastFailedLoggedDate: string;
  lastLogoutDate: string;
}

export interface UserConfig {
  notificationCount: number;
  messageCount: number;
  currency: Currency;
}

export interface User {
  firstName: string;
  lastName: string;
  email: string;
  avatar: string;
  userAuth?: UserAuth;
  userConfig?: UserConfig;
}

export interface LoginPayload {
  user: User;
  token: {
    expiresIn: number;
    accessToken: string;
  };
}

export interface LoginRequest {
  pinCode: number;
  password: string;
}

export interface ForgotPasswordRequest {
  emailAddress: string;
  locale: string;
}
