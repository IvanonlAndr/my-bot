/* tslint:disable:no-console */
import "dotenv/config";
import { IgApiClient } from "instagram-private-api";
import { readdirSync, readFile } from "fs";
import { promisify } from "util";
import { CronJob } from "cron";
import path from "path";
import sharp from "sharp";

const ig = new IgApiClient();

async function login() {
  // basic login-procedure
  ig.state.generateDevice(process.env.IG_USERNAME);
  ig.state.proxyUrl = process.env.IG_PROXY;
  await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);
}

async function postFromFolder(folderPath) {
  await login();

  // const videoPath = './myVideo.mp4';
  // const coverPath = './myVideoCover.png';

  // const publishVideo = await ig.publish.video({
  //   // read the file into a Buffer
  //   video: await readFileAsync(videoPath),
  //   coverImage: await readFileAsync(coverPath),
  // });

  const { latitude, longitude, searchQuery } = {
    latitude: 0.0,
    longitude: 0.0,
    // not required
    searchQuery: "place",
  };

  /**
   * Get the place
   * If searchQuery is undefined, you'll get the nearest places to your location
   * this is the same as in the upload (-configure) dialog in the app
   */

  // console.log(publishVideo);

  // 1. Get all files in the folder
  const files = readdirSync(folderPath);

  // 2. Filter for supported image extensions
  const validExtensions = [".jpg", ".jpeg", ".png", ".webp"];
  const imageFiles = files
    .filter((file) =>
      validExtensions.includes(path.extname(file).toLowerCase()),
    )
    .sort(); // Sorts them as 1.png, 2.jpeg, 3.webp

  for (const fileName of imageFiles) {
    const fullPath = path.join(folderPath, fileName);
    console.log(`Processing: ${fileName}`);

    try {
      // 3. Convert to JPEG Buffer (Required by Instagram)
      const imageBuffer = await sharp(fullPath).jpeg().toBuffer();

      // 4. Publish

      const locations = await ig.search.location(
        latitude,
        longitude,
        searchQuery,
      );
      /**
       * Get the first venue
       * In the real world you would check the returned locations
       */
      const mediaLocation = locations[0];
      console.log(mediaLocation);

      const publishPhoto = await ig.publish.photo({
        // read the file into a Buffer
        file: imageBuffer,
        // optional, default ''
        caption: "my caption",
        // optional
        location: mediaLocation,
        // optional
        usertags: {
          in: [
            // tag the user 'instagram' @ (0.5 | 0.5)
            await generateUsertagFromName("instagram", 0.5, 0.5),
          ],
        },
      });

      console.log(`Successfully posted ${fileName}:`, publishPhoto.status);

    } catch (error) {
      console.error(`Failed to post ${fileName}:`, error.message);
    }
  }
}

// Usage
const cronInsta = new CronJob("11 * * * *", async () => {
  postFromFolder("./images");
});

cronInsta.start();


/**
 * Generate a usertag
 * @param name - the instagram-username
 * @param x - x coordinate (0..1)
 * @param y - y coordinate (0..1)
 */
async function generateUsertagFromName(name, x, y) {
  // constrain x and y to 0..1 (0 and 1 are not supported)
  x = clamp(x, 0.0001, 0.9999);
  y = clamp(y, 0.0001, 0.9999);
  // get the user_id (pk) for the name
  const { pk } = await ig.user.searchExact(name);
  return {
    user_id: pk,
    position: [x, y],
  };
}

/**
 * Constrain a value
 * @param value
 * @param min
 * @param max
 */
const clamp = (value, min, max) => Math.max(Math.min(value, max), min);

