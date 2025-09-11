import User from "./user.model";
import { IUser } from "./user.interface";

class UserService {
  static async findById(id: string) {
    return User.findById(id);
  }

  static async findAll(projection = "-password") {
    return User.find().select(projection);
  }

  static async updateById(id: string, updates: Partial<IUser>) {
    return User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });
  }

  static async create(payload: Partial<IUser>) {
    return User.create(payload);
  }
}

export default UserService;
