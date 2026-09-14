export const validateNoteName = (
  filename: string,
): string | null => {
  if (!filename) {
    return "Filename is required.";
  }

  if (
    !filename.endsWith(".md")
  ) {
    return "Filename must end with .md.";
  }

  if (
    filename.endsWith(".md.md")
  ) {
    return "Filename contains a duplicate .md suffix.";
  }

  const stem =
    filename.slice(
      0,
      -3
    );

  if (
    !/^[a-z]+(?:-[a-z]+)*$/.test(
      stem
    )
  ) {
    return (
      "Only lowercase English letters a-z " +
      "and single hyphens are allowed."
    );
  }

  return null;
};
