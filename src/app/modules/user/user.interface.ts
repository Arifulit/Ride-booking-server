import { Document } from "mongoose";

export enum Role {
    ADMIN = "admin",
    RIDER = "rider", 
    DRIVER = "driver",
    USER = "user",
   
}

export enum IsActive {
    ACTIVE = "active",
    INACTIVE = "inactive",
    BLOCKED = "blocked"
}

export interface IAuthProvider {
    provider: "credentials" | "google" | "facebook";
    providerId: string;
}

export interface IUser extends Document {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
    role: Role;
    profilePicture?: string | null;
    isBlocked: boolean;
    lastLogin?: Date | null;
    emailVerified: boolean;
    auths: IAuthProvider[];
    createdAt?: Date;
    updatedAt?: Date;
    isVerified?: boolean; 
  // isActive?: boolean;  
    isDeleted?: boolean

    // Use the IsActive enum string values in the schema and model
    isActive?: IsActive;
    // Virtual field
    fullName: string;
    
    // Methods
    checkPassword(candidatePassword: string): Promise<boolean>;
    getPublicProfile(): Omit<IUser, "password">;
}