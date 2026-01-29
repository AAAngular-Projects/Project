export interface OauthProviderProfile {
  provider: 'google';
  providerId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

export interface PendingOauthUser {
  needsRegistration: true;
  profile: OauthProviderProfile;
}
