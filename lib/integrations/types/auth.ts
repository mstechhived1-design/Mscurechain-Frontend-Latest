export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  mobile: string;
  email: string;
  password: string;
  otp: string;
  consentGiven: boolean;
}

export interface OtpRequest {
  mobile: string;
  email: string;
}

export interface VerifyOtpRequest {
  mobile: string;
  otp: string;
}

export interface AuthResponse {
  accessToken: string;
  csrfToken: string;
  sessionId: string;
  user: {
    id: string;
    name: string;
    role: string;
    image?: string;
    shopName?: string;
    gstin?: string;
    licenseNo?: string;
    address?: string;
    hospital?: string;
  };
}

export interface MeResponse {
  id: string;
  name: string;
  role: string;
  email?: string;
  mobile?: string;
  image?: string;
  shopName?: string;
  gstin?: string;
  licenseNo?: string;
  address?: string;
  hospital?: string;
  // Optional bootstrap fields
  user?: any;
  accessToken?: string;
  csrfToken?: string;
  sessionId?: string;
}
