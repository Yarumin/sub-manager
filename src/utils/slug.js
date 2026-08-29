import { SLUG_MIN_LENGTH, SLUG_MAX_LENGTH, SLUG_PATTERN } from "../constants.js";

export function isValidSlugFormat(slug) {
  return (
    typeof slug === "string" &&
    slug.length >= SLUG_MIN_LENGTH &&
    slug.length <= SLUG_MAX_LENGTH &&
    SLUG_PATTERN.test(slug)
  );
}
