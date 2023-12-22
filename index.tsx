import { Database } from "bun:sqlite";
import { renderToReadableStream } from "react-dom/server";
import Index from "./pages";
import React from "react";
import ffmpeg from "fluent-ffmpeg";
import mime from "mime";
import { v4 as uuidv4 } from "uuid";
import { BunFile } from "bun";
import fs from "fs";
import Perma from "./pages/perma";

type RouteHandler = (request: Request) => Response | Promise<Response>;

interface Routes {
  [path: string]: RouteHandler;
}

export type ThingData = {
  id: number;
  filename: string;
  originalFilename: string;
  type: string;
  mime: string;
  hash: string;
  servableFile: string;
  created: string; // Assuming 'created' is stored in a string format like ISO8601
};

export const FILE_DIR = "/Volumes/ext/drop";
const DB_DIR = "/Volumes/ext/drop/db.sqlite";

// Initialize the database and table
function initDatabase() {
  const db = new Database(DB_DIR);

  // Create the 'things' table if it does not exist
  db.run(`CREATE TABLE IF NOT EXISTS things (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    originalFilename TEXT,
    type TEXT,
    mime TEXT,
    hash TEXT UNIQUE,
    servableFile TEXT,
    created DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  return db;
}

const db = initDatabase();

const getAllThings = async () => {
  const statement = db.prepare(`SELECT * FROM things ORDER BY created DESC`);
  const things: ThingData[] = statement.all() as ThingData[];
  statement.finalize();
  return things;
};

const insertThing = async (
  filename: string,
  originalFilename: string,
  type: string,
  mime: string,
  hash: string,
  servableFile: string
) => {
  try {
    const statement = db.prepare(
      `INSERT INTO things (filename, originalFilename, type, mime, hash, servableFile) VALUES (?, ?, ?, ?, ?, ?)`
    );
    statement.run(filename, originalFilename, type, mime, hash, servableFile);
    statement.finalize();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("UNIQUE constraint failed")
    ) {
      console.log(`A file with hash ${hash} already exists in the database.`);
    } else {
      throw error; // Handle or rethrow other types of errors
    }
  }
};

const hashFile = async (file: File | BunFile) => {
  const buffer = await file.arrayBuffer();
  const hasher = new Bun.CryptoHasher("sha256");

  hasher.update(buffer);

  return hasher.digest("hex");
};

const ffmpegPromise = (input: string, output: string, ext: ".mp3" | ".mp4") => {
  return new Promise<string>((resolve, reject) => {
    ffmpeg(input)
      .output(output)
      .on("end", async () => {
        console.log("conversion ended", new Date());
        // save file to disk with the filename (hash) and extension
        const fileHash = await hashFile(Bun.file(output));
        fs.renameSync(output, `${FILE_DIR}/${fileHash}${ext}`);
        console.log("done saving file", new Date());

        resolve(`${fileHash}${ext}`);
      })
      .on("error", (error) => {
        console.log("error", error);
        reject(error);
      })
      .run();
  });
};

const convert = async (filename: string, ext: ".mp3" | ".mp4") => {
  console.log("converting video", filename, new Date());
  // create uuid for new file
  const uuid = uuidv4();
  const tempFilename = `${FILE_DIR}/${uuid}${ext}`;

  const fileHash = await ffmpegPromise(filename, tempFilename, ext);

  return fileHash;
};

const hashExists = (hash: string) => {
  const statement = db.prepare(`SELECT 1 FROM things WHERE hash = ? LIMIT 1`);
  const result = statement.get(hash);
  console.log("result", result);
  statement.finalize();

  return result !== undefined && result !== null;
};
// const populateDB = async () => {};

const uploadHandler: RouteHandler = async (request) => {
  if (request.method !== "POST")
    return new Response("Method Not Allowed", { status: 405 });

  const formData = await request.formData();

  // get file directly
  const file = formData.get("file");
  if (file instanceof File) {
    console.log(`Request: ${file.name} (${file.size} bytes)`);

    // generate hash of the bytes received
    const fileHash = await hashFile(file);
    if (hashExists(fileHash)) {
      console.log("Status 409: File already exists");
      return new Response("File already exists", { status: 409 });
    }

    const fileExt = file.name.split(".").pop() || "";
    const mimeType = mime.getType(file.name);
    const hashedFilename = `${fileHash}.${fileExt}`;
    let newHashedFilename: string = "";

    if (!mimeType) {
      throw new Error("No mime type");
    }

    // write file to disk as hash
    if (file) {
      console.log("writing to disk", hashedFilename, new Date());
      await Bun.write(`${FILE_DIR}/${hashedFilename}`, file);
      console.log("done writing to disk", hashedFilename, new Date());
    }

    // if file is a video convert it to mp4 via ffmpeg
    if (mimeType.includes("video") && fileExt.toLowerCase() !== "mp4") {
      newHashedFilename = await convert(
        `${FILE_DIR}/${hashedFilename}`,
        ".mp4"
      );
    }

    // if audio file convert to a mp3 via ffmpeg
    if (mimeType.includes("audio") && fileExt.toLowerCase() !== "mp3") {
      console.log("converting audio", new Date());
      newHashedFilename = await convert(
        `${FILE_DIR}/${hashedFilename}`,
        ".mp3"
      );
    }

    // console.log(
    //   `Received file: ${file.name} (${file.size} bytes) mime: ${mimeType} and hash ${fileHash}`
    // );

    // insert into db
    await insertThing(
      hashedFilename,
      file.name,
      mimeType.split("/")[0],
      mimeType,
      fileHash,
      newHashedFilename
    );
  }

  // get metadata directly
  const metadata = formData.get("metadata");
  if (metadata) {
    console.log(`Received metadata: ${metadata}`);
    console.log("json", JSON.parse(metadata as string));
  }

  return new Response("Upload", { status: 200 });
};

const notFoundHandler: RouteHandler = async (request) => {
  return new Response("Not Found", { status: 404 });
};

const indexHandler: RouteHandler = async (request) => {
  const things = await getAllThings();
  const stream = await renderToReadableStream(<Index things={things} />);
  return new Response(stream, {
    status: 200,
    headers: {
      contentType: "text/html; charset=utf-8",
    },
  });
};

const fileHandler: RouteHandler = async (request) => {
  try {
    const url = new URL(request.url);
    const path = decodeURIComponent(url.pathname).split("/").pop();
    const file = await Bun.file(`${FILE_DIR}/${path}`);
    return new Response(file, { status: 200 });
  } catch (error) {
    console.log(error);
    return notFoundHandler(request);
  }
};

const staticHandler: RouteHandler = async (request) => {
  try {
    console.log("static handler");
    const url = new URL(request.url);
    const path = decodeURIComponent(url.pathname).split("/").pop();
    console.log("working dir", process.cwd());
    const file = await Bun.file(`static/${path}`);
    return new Response(file, { status: 200 });
  } catch (error) {
    console.log(error);
    return notFoundHandler(request);
  }
};

const permaHandler: RouteHandler = async (request) => {
  try {
    const url = new URL(request.url);
    const path = decodeURIComponent(url.pathname).split("/").pop();
    const file = await Bun.file(`${FILE_DIR}/${path}`);

    console.log(file.type);

    if (file.type.includes("text")) {
      const text = await file.text();
      const stream = await renderToReadableStream(<Perma text={text} />);
      return new Response(stream, {
        status: 200,
        headers: {
          contentType: "text/html; charset=utf-8",
        },
      });
    }

    // instead of plain response, can open a url with the
    // rendered content if it is text or other supported file type

    return new Response(file, { status: 200 });
  } catch (error) {
    console.log(error);
    return notFoundHandler(request);
  }
};

const routes: Routes = {
  "^/$": indexHandler,
  "^/static/([^/]+)$": staticHandler,
  "^/f/([^/]+)$": fileHandler,
  "^/p/([^/]+)$": permaHandler,
  "^/upload$": uploadHandler,
};

const main = async () => {
  const server = Bun.serve({
    port: 3000,
    fetch(request: Request): Response | Promise<Response> {
      const url = new URL(request.url);

      for (const pattern in routes) {
        const regex = new RegExp(pattern);
        if (regex.test(url.pathname)) return routes[pattern](request);
      }
      return notFoundHandler(request);
    },
  });
};

main();
