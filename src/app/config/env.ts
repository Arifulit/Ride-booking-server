import dotenv from "dotenv";

dotenv.config();

interface EnvConfig {
    PORT: string,
    MONGODB_URI: string,
    NODE_ENV: "development" | "production"
    BCRYPT_SALT_ROUND: string
    JWT_ACCESS_SECRET: string
    JWT_ACCESS_EXPIRES: string
    JWT_REFRESH_SECRET: string
    JWT_REFRESH_EXPIRES: string
   
    GOOGLE_CLIENT_SECRET: string
    GOOGLE_CLIENT_ID: string
    GOOGLE_CALLBACK_URL: string
    
    FRONTEND_URL: string
    SSL: {
        STORE_ID: string,
        STORE_PASS: string,
        SSL_PAYMENT_API: string,
        SSL_VALIDATION_API: string,
        SSL_SUCCESS_FRONTEND_URL: string,
        SSL_FAIL_FRONTEND_URL: string,
        SSL_CANCEL_FRONTEND_URL: string,
        SSL_SUCCESS_BACKEND_URL: string,
        SSL_FAIL_BACKEND_URL: string,
        SSL_CANCEL_BACKEND_URL: string,
     
    };
    CLOUDINARY: {
        CLOUDINARY_CLOUD_NAME: string;
        CLOUDINARY_API_KEY: string;
        CLOUDINARY_API_SECRET: string;
    };
    EMAIL_SENDER: {
        SMTP_USER: string;
        SMTP_PASS: string;
        SMTP_PORT: string;
        SMTP_HOST: string;
        SMTP_FROM: string;
    };
    REDIS_HOST: string;
    REDIS_PORT: string;
    REDIS_USERNAME: string;
    REDIS_PASSWORD: string;


}

const loadEnvVariables = (): EnvConfig => {
    const requiredEnvVariables: string[] = ["PORT", "MONGODB_URI", "NODE_ENV", "BCRYPT_SALT_ROUND", "JWT_ACCESS_EXPIRES", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "JWT_REFRESH_EXPIRES", "GOOGLE_CLIENT_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CALLBACK_URL", "FRONTEND_URL",

        "SMTP_PORT",
        "SMTP_HOST",
        "SMTP_USER",
        "SMTP_FROM", "REDIS_HOST",
        "REDIS_PORT",
        "REDIS_USERNAME",
        "REDIS_PASSWORD",];

    requiredEnvVariables.forEach(key => {
        if (!process.env[key]) {
            throw new Error(`Missing required environment variable ${key}`);
        }
    });

    return {
    PORT: process.env.PORT as string,
    MONGODB_URI: process.env.MONGODB_URI as string,
    NODE_ENV: process.env.NODE_ENV as "development" | "production",
    BCRYPT_SALT_ROUND: process.env.BCRYPT_SALT_ROUND as string,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET as string,
    JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES as string,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET as string,
    JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES as string,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET as string,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID as string,
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL as string,
    FRONTEND_URL: process.env.FRONTEND_URL as string,
    SSL: {
        STORE_ID: process.env.STORE_ID as string,
        STORE_PASS: process.env.STORE_PASS as string,
        SSL_PAYMENT_API: process.env.SSL_PAYMENT_API as string,
        SSL_VALIDATION_API: process.env.SSL_VALIDATION_API as string,
        SSL_SUCCESS_FRONTEND_URL: process.env.SSL_SUCCESS_FRONTEND_URL as string,
        SSL_FAIL_FRONTEND_URL: process.env.SSL_FAIL_FRONTEND_URL as string,
        SSL_CANCEL_FRONTEND_URL: process.env.SSL_CANCEL_FRONTEND_URL as string,
        SSL_SUCCESS_BACKEND_URL: process.env.SSL_SUCCESS_BACKEND_URL as string,
        SSL_FAIL_BACKEND_URL: process.env.SSL_FAIL_BACKEND_URL as string,
        SSL_CANCEL_BACKEND_URL: process.env.SSL_CANCEL_BACKEND_URL as string
    },
    CLOUDINARY: {
        CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME as string,
        CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY as string,
        CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET as string
    },
    EMAIL_SENDER: {
        SMTP_USER: process.env.SMTP_USER as string,
        SMTP_PASS: process.env.SMTP_PASS as string,
        SMTP_PORT: process.env.SMTP_PORT as string,
        SMTP_HOST: process.env.SMTP_HOST as string,
        SMTP_FROM: process.env.SMTP_FROM as string,
    },
    REDIS_HOST: process.env.REDIS_HOST as string,
    REDIS_PORT: process.env.REDIS_PORT as string,
    REDIS_USERNAME: process.env.REDIS_USERNAME as string,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD as string
};
};

export const envVars = loadEnvVariables();