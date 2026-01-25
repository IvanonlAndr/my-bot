import "dotenv/config";
import { IgApiClient } from "instagram-private-api";
import { readFile, writeFile, access } from "fs/promises";
import cron from "node-cron";
const ig = new IgApiClient();

const SESSION_FILE = "./session.json";

// --- SESSION MANAGEMENT ---
async function login() {
  ig.state.generateDevice(process.env.IG_USERNAME);
  ig.state.proxyUrl = process.env.IG_PROXY;

  // 1. Try to load an existing session
  try {
    await access(SESSION_FILE);
    const savedState = await readFile(SESSION_FILE, "utf-8");
    await ig.state.deserialize(JSON.parse(savedState));

    // Check if the session is still valid
    const info = await ig.account.currentUser();
    console.log(`Logged in as ${info.username} using saved session.`);
  } catch (e) {
    console.log("No valid session found. Performing fresh login...");

    // 2026 REQUIREMENT: Mimic app startup behavior
    await ig.simulate.preLoginFlow();
    await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);
    process.nextTick(async () => await ig.simulate.postLoginFlow());

    // Save the new session to disk
    const serialized = await ig.state.serialize();
    delete serialized.constants; // Remove unnecessary static data
    await writeFile(SESSION_FILE, JSON.stringify(serialized));
    console.log("New session saved to disk.");
  }
}

// --- POSTING LOGIC ---
async function postVideo() {
  try {
    // DO NOT call login() here every time.
    // The session is already loaded in the 'ig' object.

    const videoPath = "./1.mp4";
    const coverPath = "images/2.jpeg";

    console.log("Starting upload...");
    const publishResult = await ig.publish.video({
      video: await readFile(videoPath),
      coverImage: await readFile(coverPath),
      caption:
        " Т-34 — советский средний танк периода Великой Отечественной войны, выпускался серийно с 1940 года. В течение 1942—1948 годов — основной танк РККА и ВС СССР до первой половины 1944 года, до поступления в войска его модификации Т-34-85. Самый массовый танк Второй мировой войны и послевоенного времени. Был разработан конструкторским бюро танкового отдела Харьковского завода № 183 как танк А-32, главный конструктор танка — Михаил Ильич Кошкин. Успешность проекта была предопределена применением новейшего высокоэкономичного дизель-мотора В-2, благодаря которому среднебронированный Т-34 унаследовал от лёгкобронированных БТ высокую удельную мощность (отношение мощности двигателя к боевой массе). Очень важным оказался высокий модернизационный потенциал конструкции, это позволило эффективно повышать боевые качества танка одновременно с наращиванием его промышленного производства в течение всей войны. С 1942 по 1945 годы основное крупносерийное производство Т-34 было развёрнуто на машиностроительных заводах Урала и Сибири, и продолжалось в послевоенные годы. #fyp #foryoupage #viralvideo #viralvideos #trendingvideo #trendingvideos #spongebob #spongebobsquarepants #funny #funnyvideos #funnyvideo #memes #meme #dankmemes #dankmeme #edgymemes #edgymeme #comedy #humor #funnyshit #hilarious #epstein #efn #blackhumor",
    });

    console.log("Post successful!", publishResult.status);
  } catch (error) {
    console.error("Post failed:", error.message);
    // If the post fails because of a session error, delete the session file
    // so the next run triggers a fresh login.
  }
}

// --- SCHEDULING ---
function scheduleNextVideo() {
  const now = new Date();
  const nextHour = (now.getHours() + 1) % 24;
  const randomMin = Math.floor(Math.random() * 60);
  const cronExpression = `${randomMin} ${nextHour} * * *`;

  console.log(
    `Next video scheduled for: ${nextHour}:${randomMin.toString().padStart(2, "0")}`,
  );

  const task = cron.schedule(cronExpression, async () => {
    console.log(`>>> Triggering post at ${new Date().toLocaleTimeString()}`);
    await postVideo();
    task.stop();
    scheduleNextVideo();
    await leaveACommnet();
  });
}

async function leaveACommnet() {
  try {
    const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;
    const exploreFeed = ig.feed.topicalExplore();
    const response = await exploreFeed.request();

    // 1. Improved Flattening (Handles 2026 layout structures)
    const allItems = response.sectional_items.flatMap((section) => {
      const content = section.layout_content;
      if (!content) return [];
      
      return [
        ...(content.medias?.map((m) => m.media) || []),
        ...(content.fill_items?.map((m) => m.media) || []),
        // 2026 fix: Check for channel/igtv objects inside two_by_two_item
        ...(content.two_by_two_item?.channel?.media ? [content.two_by_two_item.channel.media] : []),
        ...(content.two_by_two_item?.igtv?.media ? [content.two_by_two_item.igtv.media] : [])
      ];
    }).filter(post => 
      post && (post.taken_at || post.device_timestamp / 1000) >= oneDayAgo
    );

    if (allItems.length > 0) {
      const randomPost = allItems[Math.floor(Math.random() * allItems.length)];
      const mediaId = randomPost.pk || randomPost.id;

      if (!mediaId) return;

      await ig.media.comment({
        mediaId: mediaId,
        text: "blackspong_hourly",
      });

      console.log(`Successfully commented on ID: ${mediaId}`);
    } else {
      console.log("No posts found in the last 24h.");
    }
  } catch (error) {
    console.error("Operation failed:", error.message);
  }
}

// 2. Global Scheduler (Run once per hour at a random minute)
// This keeps your memory usage stable in 2026 environments.
const randomMinute = Math.floor(Math.random() * 60);
cron.schedule(`${randomMinute} * * * *`, async () => {
  console.log(`>>> Triggering comment at ${new Date().toLocaleTimeString()}`);
  await leaveACommnet();
});


function scheduleNextComment() {
  const now = new Date();
  // Schedule for some time in the next hour
  const nextHour = (now.getHours() + 1) % 24;
  const randomMin = Math.floor(Math.random() * 60);
  const cronExpression = `${randomMin} ${nextHour} * * *`;

  console.log(
    `Next COMMENT scheduled for: ${nextHour}:${randomMin.toString().padStart(2, "0")}`,
  );

  const task = cron.schedule(cronExpression, async () => {
    console.log(
      `>>> Executing scheduled comment at ${new Date().toLocaleTimeString()}`,
    );

    await leaveACommnet(); // Run the action

    task.stop(); // Stop the current cron task
    scheduleNextComment(); // Schedule the NEW random time for the next window
  });
}

// --- STARTUP ---
async function start() {
  console.log("Initializing bot...");
  await login(); // Login ONCE at startup
  scheduleNextVideo();
  scheduleNextComment();
}

start();

