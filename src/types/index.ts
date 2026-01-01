export interface WhitelistUser {
  id: string;
  email: string;
  name: string;
  userId: string;
  deviceId: string;
  isActive: boolean;
  createdAt: number;
  lastLogin: number;
  addedBy: string;
  addedAt: number;
  fcmToken?: string;
  fcmTokenUpdatedAt?: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  userId: string;
  role: 'admin' | 'super_admin';
  isActive: boolean;
  createdAt: number;
  createdBy: string;
  lastLogin: number;
  fcmToken?: string;
  fcmTokenUpdatedAt?: number;
}

export interface RegistrationConfig {
  id: string;
  registrationUrl: string;
  whatsappHelpUrl: string;
  isActive: boolean;
  description: string;
  createdAt: number;
  updatedAt: number;
  updatedBy: string;
}

export interface Stats {
  total: number;
  active: number;
  inactive: number;
  recent: number;
}
