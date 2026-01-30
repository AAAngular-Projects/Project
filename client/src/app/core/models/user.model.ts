export enum RoleType {
  USER = 'USER_ROLE',
  ADMIN = 'ADMIN_ROLE',
  ROOT = 'ROOT_ROLE',
}

export interface EntityModel {
  uuid: string;
}

export interface Currency extends EntityModel {
  name: string;
  currentExchangeRate: number;
}

export interface UserAuth extends EntityModel {
  role?: RoleType;
  pinCode: number;
  lastSuccessfulLoggedDate: string;
  lastFailedLoggedDate: string;
  lastLogoutDate: string;
}

export interface UserConfig extends EntityModel {
  notificationCount: number;
  messageCount: number;
  currency: Currency;
}

export interface User extends EntityModel {
  firstName: string;
  lastName: string;
  email: string;
  avatar: string;
  role?: RoleType;
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
