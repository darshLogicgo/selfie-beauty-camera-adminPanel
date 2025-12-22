import Agenda from "agenda";
import config from "./config.js";

export const agenda = new Agenda({
  db: { address: config.mongodb.url, collection: "agendaJobs" },
});

