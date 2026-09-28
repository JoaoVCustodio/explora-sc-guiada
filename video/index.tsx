/* eslint-disable react-refresh/only-export-components -- Offline Remotion entry point. */
import { Composition, registerRoot } from "remotion";
import { ProductDemo } from "./ProductDemo";
const Root = () => (
  <Composition
    id="ExploraHero"
    component={ProductDemo}
    durationInFrames={420}
    fps={30}
    width={1280}
    height={800}
  />
);
registerRoot(Root);
