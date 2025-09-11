// driver.constant.ts
export const DRIVER_APPROVAL_STATUS = [
  "pending",
  "approved",
  "rejected",
  "suspended",
] as const;

export const DRIVER_UPDATE_FIELDS = [
  "vehicleInfo",
  "documentsUploaded",
] as const;

export const DRIVER_DEFAULT_LOCATION = {
  type: "Point",
  coordinates: [0, 0],
};
