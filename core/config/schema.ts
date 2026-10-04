import { z } from "zod";

export const ConfigSchema = z.object({
  app: z.object({
    name: z.string(),
    version: z.number(),
  }),

  ui: z.object({
    font: z.object({
      family: z.string(),
      size: z.number(),
      line_height: z.number(),
    }),

    background: z.object({
      color: z.string(),
    }),
  }),

  cards: z.object({
    columns: z.number(),
    gap: z.number(),
    width: z.number(),
    height: z.number(),
  }),

  workspaces: z.array(
    z.object({
      name: z.string(),
      path: z.string(),
    }),
  ),

  search: z.object({
    index_path: z.string(),
    watch: z.boolean(),
    batch_size: z.number(),
  }),

    path: z.string(),
    auto_discover: z.boolean(),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;
