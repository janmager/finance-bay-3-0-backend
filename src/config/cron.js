import cron from "cron";
import https from "https";
import { checkAllUsersForRecurrings } from "../controllers/recurringsController.js";
import { API_URL } from "./db.js";

// for active state render server (going to sleep after 15min of disactive)
export const wakeupJob = new cron.CronJob("*/14 * * * *", function () {
  https
    .get(API_URL, (res) => {
      if (res.statusCode === 200) console.log("[CRON] wakeupJob successfully.");
      else console.log("GET request failed", res.statusCode);
    })
    .on("error", (e) => console.error("Error while sending request", e));
});

// At 0 minutes past the hour, every 6 hours
export const checkUsersRecurrings = new cron.CronJob("0 0 */6 * * *", function async () {
  console.log(API_URL+'/api/crons/check-all-recurrings-for-users')
  checkAllUsersForRecurrings();
  console.log("[CRON] checkUsersRecurrings successfully.");
});
