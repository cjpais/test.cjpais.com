import React from "react";
import { ThingData } from "..";
import Markdown from "react-markdown";
import fs from "fs";

const Thing = ({ thing }: { thing: ThingData }) => {
  const f = thing.servableFile !== "" ? thing.servableFile : thing.filename;
  const src = `/f/${f}`;

  return (
    <div>
      {/* <a href={`/p/${f}`}> */}
      <a className="mono" href={`/p/${f}`}>
        {thing.type === "image" && <img src={src} loading="lazy" />}
        {thing.type === "audio" && <audio src={src} controls />}
        {thing.type === "video" && <video src={src} controls height={720} />}
      </a>
      {thing.type === "text" && <TextThing thing={thing} />}
      <h6 className="mono">
        {/* ----- <a href={`/p/${f}`}>perma</a> ----- */}
        ----------
      </h6>
    </div>
  );
};

const TextThing = ({ thing }: { thing: ThingData }) => {
  const content = fs
    .readFileSync(`${process.env.FILE_DIR}/${thing.filename}`)
    .toString("utf-8");

  return (
    <div>
      <Markdown>{content}</Markdown>
    </div>
  );
};

export default Thing;
