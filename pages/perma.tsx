import React from "react";
import Markdown from "react-markdown";
import Style from "../components/Style";

const Perma = ({ text }: { text: string }) => {
  return (
    <html>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" type="image/x-icon" href="/static/favicon.ico" />
        <title>This is a thing</title>
        <Style />
      </head>
      <body>
        <div>
          <Markdown>{text}</Markdown>
        </div>
      </body>
    </html>
  );
};

export default Perma;
