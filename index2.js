import "dotenv/config";
import { IgApiClient } from "instagram-private-api";
import { readFile } from "fs";
import { promisify } from "util";
import cron from 'node-cron';
const readFileAsync = promisify(readFile);

const ig = new IgApiClient();

async function login() {
  // basic login-procedure
  ig.state.generateDevice(process.env.IG_USERNAME);
  ig.state.proxyUrl = process.env.IG_PROXY;
  await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);
}

function scheduleNextVideo() {
  const now = new Date();

  // 1. Get the NEXT hour (e.g., if it's 1:05 PM, target 2:XX PM)
  const nextHour = (now.getHours() + 1) % 24;

  // 2. Pick a random minute
  const randomMin = Math.floor(Math.random() * 60);

  // 3. Create a strict cron string for ONE specific time:
  // Format: "minute hour day month dayOfWeek"
  const cronExpression = `${randomMin} ${nextHour} * * *`;

  console.log(`Current time: ${now.toLocaleTimeString()}`);
  console.log(
    `Next video scheduled for: ${nextHour}:${randomMin.toString().padStart(2, "0")}`,
  );

  const task = cron.schedule(cronExpression, () => {
    console.log(`>>> Posting video at ${new Date().toLocaleTimeString()}`);

    (async () => {
      await login();

      const videoPath = "./1.mp4";
      const coverPath = "images/2.jpeg";

      const publishResult = await ig.publish.video({
        // read the file into a Buffer
        video: await readFileAsync(videoPath),
        coverImage: await readFileAsync(coverPath),
        caption:
          " Т-34 — советский средний танк периода Великой Отечественной войны, выпускался серийно с 1940 года. В течение 1942—1948 годов — основной танк РККА и ВС СССР до первой половины 1944 года, до поступления в войска его модификации Т-34-85. Самый массовый танк Второй мировой войны и послевоенного времени. Был разработан конструкторским бюро танкового отдела Харьковского завода № 183 как танк А-32, главный конструктор танка — Михаил Ильич Кошкин. Успешность проекта была предопределена применением новейшего высокоэкономичного дизель-мотора В-2, благодаря которому среднебронированный Т-34 унаследовал от лёгкобронированных БТ высокую удельную мощность (отношение мощности двигателя к боевой массе). Очень важным оказался высокий модернизационный потенциал конструкции, это позволило эффективно повышать боевые качества танка одновременно с наращиванием его промышленного производства в течение всей войны. С 1942 по 1945 годы основное крупносерийное производство Т-34 было развёрнуто на машиностроительных заводах Урала и Сибири, и продолжалось в послевоенные годы. #fyp #foryoupage #viralvideo #viralvideos #trendingvideo #trendingvideos #spongebob #spongebobsquarepants #funny #funnyvideos #funnyvideo #memes #meme #dankmemes #dankmeme #edgymemes #edgymeme #comedy #humor #funnyshit #hilarious #epstein #efn #blackhumor",
        /*
      this does also support:
      caption (string),  ----+
      usertags,          ----+----> See upload-photo.example.ts
      location,          ----+
     */
      });

      console.log(publishResult);
    })();

    task.stop(); // Kill this specific one-time task
    scheduleNextVideo(); // Schedule the one for the FOLLOWING hour
  });
}

// Start the cycle
scheduleNextVideo();

