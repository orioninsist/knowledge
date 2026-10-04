import type { KnowledgeDAO } from "../kdao";
import type { ApplicationLifecycle } from "./lifecycle";
import type { createWebApp } from "./web";

export interface ApplicationContext {
  knowledge: KnowledgeDAO;
  lifecycle: ApplicationLifecycle;
  web: ReturnType<typeof createWebApp>;
}
