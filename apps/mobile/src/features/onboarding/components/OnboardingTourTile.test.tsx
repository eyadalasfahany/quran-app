import { screen } from "@testing-library/react-native";

import { locales, renderUi } from "../../../../jest/render-ui";
import { featureComponentLiterals } from "../../../../jest/ui-source";

import { OnboardingTourTile } from "./OnboardingTourTile";

describe("OnboardingTourTile", () => {
  it("renders the name and the line with the icon", async () => {
    await renderUi(
      <OnboardingTourTile
        icon={{ ios: "map", android: "map" }}
        line="خريطة وخط زمني"
        name="السيرة النبوية"
        testID="tile"
      />,
    );

    expect(screen.getByText("السيرة النبوية")).toBeOnTheScreen();
    expect(screen.getByText("خريطة وخط زمني")).toBeOnTheScreen();
  });

  it("is one text element whose label is the name followed by the line", async () => {
    await renderUi(
      <OnboardingTourTile
        icon={{ ios: "map", android: "map" }}
        line="Prayer times"
        name="Prayer"
        testID="tile"
      />,
      { locale: "en" },
    );

    const tile = screen.getByRole("text", { name: "Prayer, Prayer times" });
    expect(tile).toBeOnTheScreen();
    expect(tile.props.accessible).toBe(true);
  });

  it.each(locales)("renders in %s without losing the text", async (locale) => {
    await renderUi(
      <OnboardingTourTile
        icon={{ ios: "map", android: "map" }}
        line="Line"
        name="Name"
        testID="tile"
      />,
      { locale },
    );

    expect(screen.getByTestId("tile")).toBeOnTheScreen();
    expect(screen.getByText("Name")).toBeOnTheScreen();
    expect(screen.getByText("Line")).toBeOnTheScreen();
  });

  it("uses theme tokens only", () => {
    expect(
      featureComponentLiterals(
        "features/onboarding/components/OnboardingTourTile.tsx",
      ),
    ).toEqual([]);
  });
});
