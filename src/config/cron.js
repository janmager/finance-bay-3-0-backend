import cron from "cron";
import https from "https";
import { checkAllUsersForRecurrings } from "../controllers/recurringsController.js";
import { checkAllUsersForIncomingPayments } from "../controllers/incomingPaymentsController.js";
import { API_URL } from "./db.js";
import { saveUserBalancesToLogs, saveUserTotalAcccountValueTologs } from "../controllers/usersController.js";

// for active state render server (going to sleep after 15min of disactive)
export const wakeupJob = new cron.CronJob("*/14 * * * *", function () {
  const now = new Date();
  const gmtPlus2 = new Date(now.getTime() + (2 * 60 * 60 * 1000)); // GMT+2
  const timeString = `[${gmtPlus2.getHours().toString().padStart(2, '0')}:${gmtPlus2.getMinutes().toString().padStart(2, '0')} ${gmtPlus2.getDate().toString().padStart(2, '0')}.${(gmtPlus2.getMonth() + 1).toString().padStart(2, '0')}.${gmtPlus2.getFullYear()}]`;
  
  https
    .get(API_URL+'/api/health', (res) => {
      if (res.statusCode === 200) console.log(`[CRON] ${timeString} wakeupJob successfully.`);
      else console.log("GET request failed", res.statusCode);
    })
    .on("error", (e) => console.error("Error while sending request", e));
});

// At 0 minutes past the hour, every 6 hours
// Wykonuje się co 6 godzin w czasie GMT+2
// Serwer GMT+0: 0:00, 6:00, 12:00, 18:00
// Klient GMT+2: 2:00, 8:00, 14:00, 20:00
export const checkUsersRecurrings = new cron.CronJob("0 0 */6 * * *", function async () {
  const now = new Date();
  const gmtPlus2 = new Date(now.getTime() + (2 * 60 * 60 * 1000)); // GMT+2
  const timeString = `[${gmtPlus2.getHours().toString().padStart(2, '0')}:${gmtPlus2.getMinutes().toString().padStart(2, '0')} ${gmtPlus2.getDate().toString().padStart(2, '0')}.${(gmtPlus2.getMonth() + 1).toString().padStart(2, '0')}.${gmtPlus2.getFullYear()}]`;
  
  checkAllUsersForRecurrings();
  console.log(`[CRON] ${timeString} checkUsersRecurrings successfully.`);
});

// Every 6 hours
// Wykonuje się co 6 godzin w czasie GMT+2
// Serwer GMT+0: 0:00, 6:00, 12:00, 18:00
// Klient GMT+2: 2:00, 8:00, 14:00, 20:00
export const saveUsersWalletsBalances = new cron.CronJob("0 0 */6 * * *", function async () {
  const now = new Date();
  const gmtPlus2 = new Date(now.getTime() + (2 * 60 * 60 * 1000)); // GMT+2
  const timeString = `[${gmtPlus2.getHours().toString().padStart(2, '0')}:${gmtPlus2.getMinutes().toString().padStart(2, '0')} ${gmtPlus2.getDate().toString().padStart(2, '0')}.${gmtPlus2.getMonth() + 1}.${gmtPlus2.getFullYear()}]`;
  
  saveUserBalancesToLogs();
  console.log(`[CRON] ${timeString} saveUsersWalletsBalances successfully.`);
});

// Every 00:00 GMT+2 (22:00 GMT+0)
// Wykonuje się o 00:00 w czasie GMT+2
// Serwer GMT+0: 22:00 (poprzedniego dnia)
// Klient GMT+2: 00:00 (aktualnego dnia)
export const saveUsersAccountsValueAll = new cron.CronJob("0 0 22 * * *", function async () {
  const now = new Date();
  const gmtPlus2 = new Date(now.getTime() + (2 * 60 * 60 * 1000)); // GMT+2
  const timeString = `[${gmtPlus2.getHours().toString().padStart(2, '0')}:${gmtPlus2.getMinutes().toString().padStart(2, '0')} ${gmtPlus2.getDate().toString().padStart(2, '0')}.${(gmtPlus2.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}]`;
  
  saveUserTotalAcccountValueTologs();
  console.log(`[CRON] ${timeString} saveUsersAccountsValueAll successfully.`);
});

// Every day at 00:00 GMT+2 (22:00 GMT+0)
// Wykonuje się o 00:00 w czasie GMT+2
// Serwer GMT+0: 22:00 (poprzedniego dnia)
// Klient GMT+2: 00:00 (aktualnego dnia)
export const checkUsersIncomingPayments = new cron.CronJob("0 0 22 * * *", function async () {
  const now = new Date();
  const gmtPlus2 = new Date(now.getTime() + (2 * 60 * 60 * 1000)); // GMT+2
  const timeString = `[${gmtPlus2.getHours().toString().padStart(2, '0')}:${gmtPlus2.getMinutes().toString().padStart(2, '0')} ${gmtPlus2.getDate().toString().padStart(2, '0')}.${(gmtPlus2.getMonth() + 1).toString().padStart(2, '0')}.${gmtPlus2.getFullYear()}]`;
  
  checkAllUsersForIncomingPayments();
  console.log(`[CRON] ${timeString} checkUsersIncomingPayments successfully.`);
});

