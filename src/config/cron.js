import cron from "cron";
import https from "https";
import { checkAllUsersForRecurrings } from "../controllers/recurringsController.js";
import { API_URL } from "./db.js";
import { saveUserBalancesToLogs, saveUserTotalAcccountValueTologs } from "../controllers/usersController.js";

// for active state render server (going to sleep after 15min of disactive)
export const wakeupJob = new cron.CronJob("*/14 * * * *", function () {
  https
    .get(API_URL+'/api/health', (res) => {
      if (res.statusCode === 200) console.log("[CRON] wakeupJob successfully.");
      else console.log("GET request failed", res.statusCode);
    })
    .on("error", (e) => console.error("Error while sending request", e));
});

// At 0 minutes past the hour, every 6 hours
export const checkUsersRecurrings = new cron.CronJob("0 0 */6 * * *", function async () {
  checkAllUsersForRecurrings();
  console.log("[CRON] checkUsersRecurrings successfully.");
});

// Every 30 minutes
export const saveUsersWalletsBalances = new cron.CronJob("0 */30 * * * *", function async () {
  saveUserBalancesToLogs();
  console.log("[CRON] saveUserBalancesToLogs successfully.");
});

// Every hour
export const saveUsersAccountsValueAll = new cron.CronJob("*/5 * * * *", function async () {
  saveUserTotalAcccountValueTologs();
  console.log("[CRON] saveUserTotalAcccountValueTologs successfully.");
});
