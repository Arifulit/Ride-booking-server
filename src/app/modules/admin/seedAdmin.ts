// import bcryptjs from "bcryptjs";
// import { envVars } from "../../config/env";
// import { User } from "../user/user.model";
// import { Role, IAuthProvider } from "../user/user.interface";

// export const seedAdmin = async () => {
//     try {
//         const isAdminExist = await User.findOne({ 
//             email: envVars.ADMIN_EMAIL,
//             role: Role.ADMIN 
//         });

//         if (isAdminExist) {
//             console.log("Admin Already Exists!");
//             return;
//         }

//         console.log("Trying to create Admin...");

//         // Hash the password before saving
//         const hashedPassword = await bcryptjs.hash(
//             envVars.ADMIN_PASSWORD, 
//             Number(envVars.BCRYPT_SALT_ROUND) || 12
//         );

//         const authProvider: IAuthProvider = {
//             provider: "credentials",
//             providerId: envVars.ADMIN_EMAIL
//         };

//         const payload = {
//             firstName: "Admin",
//             lastName: "User",
//             email: envVars.ADMIN_EMAIL,
//             phone: "+8801700000000",
//             role: Role.ADMIN,
//             password: hashedPassword, // <-- hashed password here!
//             profilePicture: null,
//             isBlocked: false,
//             emailVerified: true,
//             auths: [authProvider],
//             lastLogin: new Date()
//         };

//         const admin = await User.create(payload);
        
//         console.log("Admin Created Successfully!");
//         console.log(admin);

//     } catch (error) {
//         console.log("Error creating Admin:", error);
//     }
// };