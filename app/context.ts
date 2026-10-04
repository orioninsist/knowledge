import type { KnowledgeDAO } from "../kdao";
import type { ApplicationLifecycle } from "./lifecycle";

export interface ApplicationContext {
  knowledge: KnowledgeDAO;
  lifecycle: ApplicationLifecycle;
}
