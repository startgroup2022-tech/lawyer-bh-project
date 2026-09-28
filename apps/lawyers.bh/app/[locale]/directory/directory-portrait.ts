const DIRECTORY_CARD_PORTRAIT_WIDTH = 96;
const DIRECTORY_CARD_PORTRAIT_HEIGHT = 110;

export function getDirectoryDetailPortraitSize(width = 176) {
  return {
    width,
    height: Math.round((width * DIRECTORY_CARD_PORTRAIT_HEIGHT) / DIRECTORY_CARD_PORTRAIT_WIDTH),
  };
}
