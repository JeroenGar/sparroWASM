export enum FileType {
  SVG = "svg",
  JSON = "json",
}

export enum Status {
  IDLE = "idle",
  START = "start",
  PROCESSING = "processing",
  FINISHED = "finished",
  ERROR = "error",
  CANCEL = "cancel",
  INIT_SHARED_MEMORY = "init_shared_memory",
  INTERMEDIATE = "intermediate",
}

export enum OptimizationAlgo {
  SPARROW = "sparrow",
}
