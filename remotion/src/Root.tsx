import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { TutorialVideo } from "./TutorialVideo";

// Tutorial: 120 + 170*3 + 210 + 120 = 960; transitions overlap (5 * ~22 = 110) -> 850
// Use 870 for safety so tail isn't clipped
const TUTORIAL_DURATION = 870;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="main"
      component={MainVideo}
      durationInFrames={780}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="tutorial"
      component={TutorialVideo}
      durationInFrames={TUTORIAL_DURATION}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);
