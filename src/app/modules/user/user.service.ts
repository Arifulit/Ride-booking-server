import User from "./user.model";
import { IUser } from "./user.interface";

const findById = async (id: string) => {
  return User.findById(id);
};

const findAll = async (projection = "-password") => {
  return User.find().select(projection);
};

const updateById = async (id: string, updates: Partial<IUser>) => {
  return User.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });
};

const create = async (payload: Partial<IUser>) => {
  return User.create(payload);
};

const UserService = {
  findById,
  findAll,
  updateById,
  create,
};

export default UserService;