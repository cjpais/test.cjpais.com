import { ThingData } from "..";
import Style from "../components/Style";
import Thing from "../components/Thing";

const Index = ({ things }: { things: ThingData[] }) => {
  return (
    <html>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" type="image/x-icon" href="/static/favicon.ico" />
        <title>My Things</title>
        <Style />
      </head>
      <body>
        <img src="/static/cj.svg" height="50px" />
        {things.map((thing) => (
          <Thing thing={thing} key={thing.hash} />
        ))}
      </body>
    </html>
  );
};

export default Index;
