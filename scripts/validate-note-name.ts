import {
  validateNoteName,
} from "./note-name";

const filename =
  process.argv[2] ?? "";

const error =
  validateNoteName(
    filename
  );

if (!error) {
  console.log("PASS");
  process.exit(0);
}

console.error("");
console.error(
  "ERROR: Invalid Markdown filename."
);
console.error("");
console.error(
  `Requested: ${filename || "(empty)"}`
);
console.error("");
console.error(
  `Reason: ${error}`
);
console.error("");
console.error(
  "Required format:"
);
console.error(
  "  lowercase English letters"
);
console.error(
  "  hyphen (-) as the only separator"
);
console.error(
  "  no numbers"
);
console.error(
  "  exactly one .md suffix"
);
console.error("");
console.error(
  "Example:"
);
console.error(
  "  building-second-brain.md"
);

process.exit(1);
