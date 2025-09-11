// driver.service.ts
import Driver from "./driver.model";
import { IDriver } from "./driver.interface";

export const DriverService = {
  async findByUserId(userId: string): Promise<IDriver | null> {
    return Driver.findOne({ userId }).populate("userId", "-password");
  },

  async updateProfile(
    userId: string,
    updates: Partial<IDriver>
  ): Promise<IDriver | null> {
    return Driver.findOneAndUpdate({ userId }, updates, {
      new: true,
      runValidators: true,
    });
  },

  async updateAvailability(
    userId: string,
    isOnline: boolean
  ): Promise<IDriver | null> {
    return Driver.findOneAndUpdate({ userId }, { isOnline }, { new: true });
  },

  async updateLocation(
    userId: string,
    longitude: number,
    latitude: number
  ): Promise<IDriver | null> {
    const driver = await Driver.findOne({ userId });
    if (!driver) return null;
    return driver.updateLocation(longitude, latitude);
  },
};
