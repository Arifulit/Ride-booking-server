import mongoose from "mongoose";
import User from "../app/modules/user/user.model";
// import User from "@user/user.model";

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/ride-booking";

async function fixUserNames() {
  await mongoose.connect(MONGO_URI);
  const users = await User.find({
    $or: [{ firstName: { $exists: false } }, { lastName: { $exists: false } }],
  });
  for (const user of users) {
    if (!user.firstName) user.firstName = "DefaultFirstName";
    if (!user.lastName) user.lastName = "DefaultLastName";
    await user.save();
    console.log(`Updated user: ${user.email}`);
  }
  await mongoose.disconnect();
  console.log("All users updated.");
}

fixUserNames().catch(console.error);
